#!/usr/bin/env python3
import os, re, json, urllib.request, xml.etree.ElementTree as ET
from html import unescape

DEST_ROOT   = "/mnt/Infinity/IPTV"
GAMELIST    = "/home/infinity/.emulationstation/gamelists/iptv/gamelist.xml"
PLAYLIST_URL= "https://iptv-org.github.io/iptv/index.m3u"

# Filters
ALLOW_COUNTRIES = {"PT","GB","US","JP"}   # ISO 3166-1 alpha-2
ALLOW_EMPTY_COUNTRY = False               # now default to skipping unknowns
ALLOW_GROUPS = {"movies","series","music","documentary","news","anime"}
ALLOW_LANGS  = set()                      # e.g. {"Portuguese","English"}
MAX_CHANNELS = 1000

# Logos
LOGO_DIR = "/home/infinity/.emulationstation/downloaded_media/iptv/logos"
UA = "Mozilla/5.0 (X11; Linux) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari"
MAX_LOGO_BYTES = 2_000_000
ALLOWED_EXTS = {".png",".jpg",".jpeg",".webp"}  # skip svg

def ensure_dir(p): os.makedirs(p, exist_ok=True)
def clean(s): return re.sub(r"\s+"," ", re.sub(r'[\\/*?:"<>|]+'," ", (s or "").strip()))
ATTR_RE = re.compile(r'(\w[\w-]*)="([^"]*)"')

def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8","ignore"))

def parse_m3u(text):
    lines = [l.rstrip("\r\n") for l in text.splitlines()]
    i = 0
    while i < len(lines):
        if lines[i].startswith("#EXTINF"):
            meta = lines[i]
            j = i+1
            while j < len(lines) and (not lines[j].strip() or lines[j].startswith("#")):
                j += 1
            if j < len(lines):
                yield meta, lines[j].strip()
                i = j+1
                continue
        i += 1

def extinf_info(meta_line):
    attrs = dict(ATTR_RE.findall(meta_line))
    name_part = meta_line.split(",",1)[1].strip() if "," in meta_line else ""
    return {
        "tvg-id": attrs.get("tvg-id",""),
        "tvg-name": attrs.get("tvg-name",""),
        "tvg-logo": attrs.get("tvg-logo",""),
        "tvg-country": attrs.get("tvg-country",""),
        "tvg-language": attrs.get("tvg-language",""),
        "group-title": attrs.get("group-title",""),
        "name": unescape(name_part)
    }

def split_multi(s):
    return [x.strip() for x in re.split(r"[;,/]\s*|\s{2,}", s or "") if x.strip()]

def load_gamelist(path):
    if os.path.exists(path):
        try: return ET.parse(path)
        except ET.ParseError: pass
    return ET.ElementTree(ET.Element("gameList"))

def set_text(elem, tag, txt):
    node = elem.find(tag) or ET.SubElement(elem, tag)
    node.text = txt
    return node

def ensure_game(root, rom_rel, name, desc, image_abs=None):
    for g in root.findall("game"):
        if g.findtext("path")==rom_rel:
            set_text(g,"name",name); set_text(g,"desc",desc or "")
            if image_abs: set_text(g,"image",image_abs)
            return g
    g = ET.SubElement(root,"game")
    set_text(g,"path",rom_rel); set_text(g,"name",name); set_text(g,"desc",desc or "")
    if image_abs: set_text(g,"image",image_abs)
    return g

def write_channel_file(base_dir, country, group, name, meta, url):
    d = os.path.join(base_dir, (country or "_"), (group or "Other"))
    os.makedirs(d, exist_ok=True)
    fn = clean(name or "Channel") + ".m3u"
    path = os.path.join(d, fn)
    with open(path, "w", encoding="utf-8") as f:
        f.write("#EXTM3U\n"); f.write(meta + "\n"); f.write(url + "\n")
    return path

def ext_from_url_or_ct(url, content_type):
    m = re.search(r'\.([a-zA-Z0-9]{2,5})(?:\?|$)', url or "")
    if m:
        ext = "." + m.group(1).lower()
        if ext in ALLOWED_EXTS: return ext
        if ext == ".svg": return None
    if content_type:
        ct = content_type.lower()
        if   "png"  in ct: return ".png"
        elif "jpeg" in ct or "jpg" in ct: return ".jpg"
        elif "webp" in ct: return ".webp"
        elif "svg"  in ct: return None
    return ".png"

def logo_key(info):
    key = info.get("tvg-id") or info.get("tvg-name") or info.get("name") or "channel"
    key = re.sub(r"\s+","-", clean(key).lower())
    return key or "channel"

def download_logo(logo_url, key):
    if not logo_url or not logo_url.startswith(("http://","https://")):
        return None
    try:
        req = urllib.request.Request(logo_url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=15) as r:
            ct = r.headers.get("Content-Type","").lower()
            ext = ext_from_url_or_ct(logo_url, ct)
            if not ext or ext not in ALLOWED_EXTS: return None
            out = os.path.join(LOGO_DIR, key + ext)
            if os.path.exists(out) and os.path.getsize(out) > 0:
                return out
            data = r.read(MAX_LOGO_BYTES + 1)
            if not data or len(data) > MAX_LOGO_BYTES: return None
            with open(out, "wb") as f: f.write(data)
            return out
    except Exception:
        return None

def main():
    os.makedirs(DEST_ROOT, exist_ok=True)
    os.makedirs(os.path.dirname(GAMELIST), exist_ok=True)
    os.makedirs(LOGO_DIR, exist_ok=True)

    # Load API maps (country & categories per channel)
    chans = fetch_json("https://iptv-org.github.io/api/channels.json")  # country, categories, ids
    cats  = fetch_json("https://iptv-org.github.io/api/categories.json")
    # Map channel id -> dict
    chmap = {c.get("id",""): c for c in chans}
    # Normalize allowed categories
    synonyms = {"animation":"anime","cartoons":"anime","kids":"anime"}
    cat_id_to_name = {c["id"]: c["name"] for c in cats}
    allowed_cat_ids = set()
    for cid,name in cat_id_to_name.items():
        key = synonyms.get(cid, cid).lower()
        if key in ALLOW_GROUPS:
            allowed_cat_ids.add(cid)

    # Fetch master playlist
    data = urllib.request.urlopen(PLAYLIST_URL, timeout=45).read().decode("utf-8","ignore")

    tree = load_gamelist(GAMELIST); root = tree.getroot()
    seen=set(); added=0; total=0; dedup=set()

    allow_countries_norm = {c.upper() for c in ALLOW_COUNTRIES}

    for meta,url in parse_m3u(data):
        total += 1
        info = extinf_info(meta)
        name = info["name"] or info["tvg-name"] or info["tvg-id"] or "Channel"
        tvgid = info["tvg-id"]

        # Country: prefer EXTINF; else API
        cc_list = [c.upper() for c in split_multi(info["tvg-country"])]
        if not cc_list and tvgid in chmap and chmap[tvgid].get("country"):
            cc_list = [chmap[tvgid]["country"].upper()]

        # Category/group: prefer API categories; else EXTINF group-title
        grp_norm = ""
        cat_list = []
        if tvgid in chmap:
            cat_list = [c.lower() for c in (chmap[tvgid].get("categories") or [])]
        # find first allowed category id (taking synonyms into account)
        picked_cat = ""
        for cid in cat_list:
            if cid in allowed_cat_ids:
                picked_cat = cid; break
            # synonym path (animation/cartons->anime)
            if synonyms.get(cid,"").lower() in ALLOW_GROUPS:
                picked_cat = cid; break
        if picked_cat:
            # nice display name
            nm = cat_id_to_name.get(picked_cat, picked_cat).title()
            grp_norm = "Anime" if picked_cat in ("animation","cartoons","kids") else nm
        else:
            g = (info["group-title"] or "").strip().lower()
            g = synonyms.get(g, g)
            grp_norm = g.title() if g else ""

        # Apply filters
        country_ok = True
        if allow_countries_norm:
            if not cc_list:
                country_ok = bool(ALLOW_EMPTY_COUNTRY)
            else:
                country_ok = any(c in allow_countries_norm for c in cc_list)
        if not country_ok:
            continue

        grp_ok = True
        if ALLOW_GROUPS:
            grp_ok = grp_norm.lower() in ALLOW_GROUPS
        if not grp_ok:
            continue

        lang_ok = True
        if ALLOW_LANGS:
            lang_ok = any(l in ALLOW_LANGS for l in split_multi(info["tvg-language"]))
        if not lang_ok:
            continue

        # De-dup
        key = tvgid or f"{clean(name).lower()}::{(cc_list[0] if cc_list else '')}"
        if key in dedup: 
            continue
        dedup.add(key)

        # Write ROM file
        folder_cc = (cc_list[0] if cc_list else "")
        rom  = write_channel_file(DEST_ROOT, folder_cc, grp_norm or "Other", name, meta, url)
        rom_rel = os.path.relpath(rom, DEST_ROOT)
        desc = " • ".join([p for p in [folder_cc or "", grp_norm or "", info["tvg-language"] or ""] if p])

        # Logo
        logo_path = None
        if info.get("tvg-logo"):
            logo_path = download_logo(info["tvg-logo"], logo_key(info))

        ensure_game(root, os.path.join(".", rom_rel), name, desc, image_abs=logo_path)
        seen.add(os.path.join(".", rom_rel))
        added += 1
        if added >= MAX_CHANNELS:
            break

    # cleanup stale entries
    for g in list(root.findall("game")):
        p = (g.findtext("path") or "").strip()
        abs_p = os.path.join(DEST_ROOT, p.strip("./"))
        if not p or not os.path.exists(abs_p):
            root.remove(g)

    ET.indent(tree, space="  ", level=0)
    tree.write(GAMELIST, encoding="utf-8", xml_declaration=True)
    print(f"Filtered {total} entries → added {added} channels. (cap={MAX_CHANNELS})")

if __name__ == "__main__":
    ensure_dir(DEST_ROOT); ensure_dir(LOGO_DIR); ensure_dir(os.path.dirname(GAMELIST))
    main()
