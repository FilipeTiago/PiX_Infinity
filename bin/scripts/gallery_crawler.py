#!/usr/bin/env python3
import os, sys, hashlib, xml.etree.ElementTree as ET
from PIL import Image, ImageOps
import piexif
from datetime import datetime

# ===== CONFIG =====
ROM_ROOT   = "/mnt/Infinity/Photos"
IMAGES_DIR = ROM_ROOT

# Where ES reads the gamelist for the "gallery" system:
GAMELIST = "/home/infinity/.emulationstation/gamelists/gallery/gamelist.xml"

# Generated artwork (safe, writable locations):
MEDIA_THUMBS_DIR  = "/home/infinity/.emulationstation/downloaded_media/gallery/thumbs"
MEDIA_FOLDERS_DIR = "/home/infinity/.emulationstation/downloaded_media/gallery/folders"

VALID_EXT = {".jpg", ".jpeg", ".png", ".webp"}
VERBOSE = True
def log(*a): 
    if VERBOSE: print("[gallery]", *a)

os.makedirs(os.path.dirname(GAMELIST), exist_ok=True)
os.makedirs(MEDIA_THUMBS_DIR, exist_ok=True)
os.makedirs(MEDIA_FOLDERS_DIR, exist_ok=True)

# ===== helpers =====
def rel_to_rom(path):
    return os.path.relpath(path, ROM_ROOT)

def list_image_files(dirpath):
    try:
        files = []
        for fn in os.listdir(dirpath):
            ext = os.path.splitext(fn)[1].lower()
            if ext in VALID_EXT:
                files.append(os.path.join(dirpath, fn))
        return files
    except FileNotFoundError:
        return []

def find_exif_datetime(img_path):
    try:
        exif_dict = piexif.load(img_path)
        for tag in ("DateTimeOriginal","DateTimeDigitized","DateTime"):
            if tag in exif_dict.get("Exif", {}):
                raw = exif_dict["Exif"][piexif.ExifIFD.__dict__[tag]]
                if isinstance(raw, bytes):
                    raw = raw.decode("utf-8", errors="ignore")
                return raw  # "YYYY:MM:DD HH:MM:SS"
    except Exception:
        pass
    return None

def parse_exif_date(s):
    try:
        return datetime.strptime(s, "%Y:%m:%d %H:%M:%S")
    except Exception:
        return None

def image_size(img_path):
    try:
        with Image.open(img_path) as im:
            return f"{im.width}×{im.height}"
    except Exception:
        return None

def make_thumbnail(src, dst, max_side=400):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    try:
        with Image.open(src) as im:
            im.thumbnail((max_side, max_side))
            rgb = im.convert("RGB")
            rgb.save(dst, "JPEG", quality=85, optimize=True)
            log("Thumb ->", dst)
            return True
    except Exception as e:
        print(f"[thumb error] {src}: {e}", file=sys.stderr)
        return False

def collage_2x2(sources, out_path, tile=220, margin=4, bg=(24,24,24)):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    # Width/Height for 2 tiles per axis: 2*tile + 3*margin  (not 4*tile + 3*margin)
    W = H = 2*tile + 3*margin
    canvas = Image.new("RGB", (W, H), bg)
    positions = [
        (margin, margin),
        (margin + tile + margin, margin),
        (margin, margin + tile + margin),
        (margin + tile + margin, margin + tile + margin),
    ]
    try:
        for i, src in enumerate(sources[:4]):
            with Image.open(src) as im:
                im = im.convert("RGB")
                thumb = ImageOps.fit(im, (tile, tile), method=Image.BICUBIC, bleed=0.0, centering=(0.5,0.5))
                canvas.paste(thumb, positions[i])
        canvas.save(out_path, "JPEG", quality=85, optimize=True)
        log("Folder art ->", out_path)
        return True
    except Exception as e:
        print(f"[collage error] {out_path}: {e}", file=sys.stderr)
        return False

def load_gamelist():
    if os.path.exists(GAMELIST):
        try:
            return ET.parse(GAMELIST)
        except ET.ParseError:
            pass
    root = ET.Element("gameList")
    return ET.ElementTree(root)

def set_text(elem, tag, text):
    node = elem.find(tag)
    if node is None:
        node = ET.SubElement(elem, tag)
    node.text = text
    return node

def ensure_entry(root, tagname, path_rel, name, image_abs, desc):
    # Find or create <game> / <folder> by <path>
    for g in root.findall(tagname):
        p = g.findtext("path")
        if p == path_rel:
            set_text(g, "name", name)
            if image_abs:
                set_text(g, "image", image_abs)
            if desc is not None:
                set_text(g, "desc", desc)
            return g
    g = ET.SubElement(root, tagname)
    set_text(g, "path", path_rel)
    set_text(g, "name", name)
    if image_abs:
        set_text(g, "image", image_abs)
    if desc is not None:
        set_text(g, "desc", desc)
    return g

# ===== main =====
def main():
    tree = load_gamelist()
    root = tree.getroot()

    seen_games = set()
    seen_folders = set()

    # ----- Files (images) -----
    log("Scanning images under:", IMAGES_DIR)
    any_images = False
    for dirpath, _, filenames in os.walk(IMAGES_DIR):
        for fn in sorted(filenames):
            ext = os.path.splitext(fn)[1].lower()
            if ext not in VALID_EXT:
                continue
            any_images = True
            full = os.path.join(dirpath, fn)
            log("Image:", full)
            rel_from_rom = rel_to_rom(full)

            # Thumbnail path mirrors folder structure (but saved under MEDIA_THUMBS_DIR)
            rel_from_images = os.path.relpath(full, IMAGES_DIR)  # e.g. "Travel/Japan/img.jpg"
            thumb_abs = os.path.join(
                MEDIA_THUMBS_DIR,
                os.path.splitext(rel_from_images)[0] + ".jpg"
            )

            # Make/update thumbnail
            if not os.path.exists(thumb_abs) or os.path.getmtime(thumb_abs) < os.path.getmtime(full):
                make_thumbnail(full, thumb_abs)

            # Desc
            exif_date = find_exif_datetime(full)
            dims = image_size(full)
            parts = []
            if exif_date:
                parts.append(f"EXIF: {exif_date.replace(':', '-', 2)}")
            if dims:
                parts.append(f"Size: {dims}")
            desc = " • ".join(parts) if parts else ""

            name = os.path.splitext(fn)[0]
            ensure_entry(root, "game", rel_from_rom, name, thumb_abs, desc)  # use ABSOLUTE image path
            seen_games.add(rel_from_rom)

    if not any_images:
        log("No images found. Check IMAGES_DIR.")

    # ----- Folders (collages) -----
    for dirpath, _, filenames in os.walk(IMAGES_DIR):
        imgs = [os.path.join(dirpath, f) for f in filenames if os.path.splitext(f)[1].lower() in VALID_EXT]
        if not imgs:
            continue

        # Choose up to 4 most recent
        imgs.sort(key=lambda p: os.path.getmtime(p), reverse=True)
        rel_dir_from_images = os.path.relpath(dirpath, IMAGES_DIR)
        base = os.path.basename(dirpath.rstrip(os.sep)) or "images"
        display_name = base

        # Artwork path under MEDIA_FOLDERS_DIR
        folder_art_abs = os.path.join(MEDIA_FOLDERS_DIR, rel_dir_from_images, "folder.jpg")

        # (Re)build collage if needed
        needs_build = not os.path.exists(folder_art_abs)
        if not needs_build:
            art_mtime = os.path.getmtime(folder_art_abs)
            if any(os.path.getmtime(p) > art_mtime for p in imgs[:4]):
                needs_build = True
        if needs_build:
            log("Build collage:", folder_art_abs)
            collage_2x2(imgs, folder_art_abs)

        # Folder description
        count = len(imgs)
        dates = []
        for p in imgs:
            d = parse_exif_date(find_exif_datetime(p) or "")
            if d:
                dates.append(d)
        dates.sort()
        if dates:
            desc = f"{count} photos • {dates[0].date()} → {dates[-1].date()}"
        else:
            desc = f"{count} photos"

        # Path for ES (relative to ROM root)
        folder_rel_path = rel_to_rom(dirpath)
        ensure_entry(root, "folder", folder_rel_path, display_name, folder_art_abs, desc)
        seen_folders.add(folder_rel_path)

    # ----- Cleanup stale entries -----
    for g in list(root.findall("game")):
        p = g.findtext("path")
        if not p:
            continue
        abs_p = os.path.join(ROM_ROOT, p)
        if p not in seen_games or not os.path.exists(abs_p):
            root.remove(g)

    for f in list(root.findall("folder")):
        p = f.findtext("path")
        if not p:
            continue
        abs_p = os.path.join(ROM_ROOT, p)
        if (p not in seen_folders) or (not os.path.isdir(abs_p)) or (len(list_image_files(abs_p)) == 0):
            root.remove(f)

    ET.indent(tree, space="  ", level=0)
    tree.write(GAMELIST, encoding="utf-8", xml_declaration=True)
    print("Gallery gamelist (files + folders) updated.")

if __name__ == "__main__":
    main()

