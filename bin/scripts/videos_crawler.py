#!/usr/bin/env python3
import os, subprocess, xml.etree.ElementTree as ET, math, time

# CONFIG
ROM_ROOT   = "/mnt/Infinity/Videos"
VIDEOS_DIR = ROM_ROOT
GAMELIST   = "/home/infinity/.emulationstation/gamelists/videos/gamelist.xml"
VALID_EXT  = {".mp4",".mkv",".mov",".avi",".webm",".m4v",".ts",".flv"}

os.makedirs(os.path.dirname(GAMELIST), exist_ok=True)

def rel_to_rom(p): return os.path.relpath(p, ROM_ROOT)

def ffprobe(cmd):
    try:
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode("utf-8","ignore").strip()
        return out
    except Exception:
        return ""

def video_meta(path):
    # width x height
    wh = ffprobe(["ffprobe","-v","error","-select_streams","v:0",
                  "-show_entries","stream=width,height","-of","csv=p=0:s=x", path])
    # seconds float
    dur = ffprobe(["ffprobe","-v","error","-show_entries","format=duration",
                   "-of","default=nokey=1:noprint_wrappers=1", path])
    width,height = (wh.split("x")+[None,None])[:2]
    try:
        s = float(dur); s = 0 if s<0 else s
        h = int(s//3600); m = int((s%3600)//60); sec = int(round(s%60))
        if sec==60: sec=0; m+=1
        if m==60: m=0; h+=1
        dur_str = f"{h:d}:{m:02d}:{sec:02d}" if h else f"{m:d}:{sec:02d}"
    except Exception:
        dur_str = ""
    return width, height, dur_str

def load_gamelist():
    if os.path.exists(GAMELIST):
        try: return ET.parse(GAMELIST)
        except ET.ParseError: pass
    root = ET.Element("gameList"); return ET.ElementTree(root)

def set_text(elem, tag, text):
    node = elem.find(tag)
    if node is None: node = ET.SubElement(elem, tag)
    node.text = text; return node

def ensure_entry(root, tagname, path_rel, name, desc):
    for g in root.findall(tagname):
        if g.findtext("path")==path_rel:
            set_text(g,"name",name); set_text(g,"desc",desc or "")
            return g
    g = ET.SubElement(root, tagname)
    set_text(g,"path",path_rel); set_text(g,"name",name); set_text(g,"desc",desc or "")
    return g

def main():
    tree = load_gamelist(); root = tree.getroot()
    seen_games=set(); seen_folders=set()

    # files
    for dirpath,_,files in os.walk(VIDEOS_DIR):
        for fn in sorted(files):
            ext = os.path.splitext(fn)[1].lower()
            if ext not in VALID_EXT: continue
            full = os.path.join(dirpath, fn)
            rel  = rel_to_rom(full)
            w,h,dur = video_meta(full)
            parts=[]
            if dur: parts.append(f"Duration: {dur}")
            if w and h: parts.append(f"Resolution: {w}×{h}")
            desc = " • ".join(parts)
            name = os.path.splitext(fn)[0]
            ensure_entry(root,"game",rel,name,desc)
            seen_games.add(rel)

    # folders
    for dirpath,_,files in os.walk(VIDEOS_DIR):
        vids=[f for f in files if os.path.splitext(f)[1].lower() in VALID_EXT]
        if not vids: continue
        count=len(vids)
        mtimes=[os.path.getmtime(os.path.join(dirpath,f)) for f in vids]
        mtimes.sort()
        span=f"{time.strftime('%Y-%m-%d',time.localtime(mtimes[0]))} → {time.strftime('%Y-%m-%d',time.localtime(mtimes[-1]))}"
        desc=f"{count} videos • {span}"
        rel_dir = rel_to_rom(dirpath)
        name = os.path.basename(dirpath.rstrip(os.sep)) or "videos"
        ensure_entry(root,"folder",rel_dir,name,desc)
        seen_folders.add(rel_dir)

    # cleanup
    for g in list(root.findall("game")):
        p=g.findtext("path") or ""
        if not p or not os.path.exists(os.path.join(ROM_ROOT,p)): root.remove(g)
    for f in list(root.findall("folder")):
        p=f.findtext("path") or ""
        abs_p=os.path.join(ROM_ROOT,p)
        if not p or not os.path.isdir(abs_p): root.remove(f)

    ET.indent(tree,space="  ",level=0)
    tree.write(GAMELIST,encoding="utf-8",xml_declaration=True)
    print("Videos gamelist updated.")
if __name__=="__main__":
    main()
