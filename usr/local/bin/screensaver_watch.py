#!/usr/bin/env python3
import os, time, subprocess, threading
from evdev import InputDevice, ecodes, list_devices
import fcntl

IDLE_SEC = int(os.environ.get("SCREENSAVER_IDLE", "300"))
REQ_AUDIO_IDLE = os.environ.get("SCREENSAVER_REQUIRE_AUDIO_IDLE", "1") == "1"
VT = os.environ.get("SCREENSAVER_VT", "7")
DEBUG = os.environ.get("SCREENSAVER_DEBUG", "0") == "1"
LOGFILE = os.environ.get("SCREENSAVER_LOG", "/tmp/screensaverd.log")

LOCKS = [
    "/tmp/kiosk-chromium.lock",
    "/tmp/kiosk-gallery.lock",
    "/tmp/kiosk-video.lock",
    "/tmp/kiosk-iptv.lock",
]

last_input = time.time()
running = False
watched = set()
log_lock = threading.Lock()

def locks_held(paths):
    """Return (active, held_list) where active=True if any path is *locked*."""
    held = []
    for p in paths:
        try:
            fd = os.open(p, os.O_RDWR | os.O_CREAT, 0o644)
        except OSError:
            continue
        try:
            # If this raises BlockingIOError, someone else holds the lock
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            fcntl.flock(fd, fcntl.LOCK_UN)  # we acquired it: means *not* held by others
        except BlockingIOError:
            held.append(p)
        finally:
            os.close(fd)
    return (len(held) > 0, held)

def log(*a):
    if not DEBUG: return
    msg = "[screensaverd %s] %s\n" % (time.strftime("%H:%M:%S"), " ".join(map(str,a)))
    with log_lock:
        with open(LOGFILE, "a", buffering=1) as f:
            f.write(msg)

def kiosk_active():
    LOCKS = [
        "/tmp/kiosk-chromium.lock",
        "/tmp/kiosk-gallery.lock",
        "/tmp/kiosk-video.lock",
        "/tmp/kiosk-iptv.lock",
        "/tmp/kiosk-radio.lock",
        "/tmp/kiosk-music.lock"
    ]

    kiosk_active, held = locks_held(LOCKS)
    if DEBUG:
        log(f"kiosk_active={kiosk_active}; held: {', '.join(held) if held else '-'}")

    if kiosk_active:
        return True
    return False

def audio_active():
    if not REQ_AUDIO_IDLE:
        return False
    try:
        out = subprocess.check_output(["pactl","list","sink-inputs"], text=True, timeout=1)
        if "State: RUNNING" in out:
            log("audio_active=True (holding off)")
            return True
    except Exception as e:
        log("audio check failed:", e)
    return False

def spawn_reader(devpath):
    if devpath in watched:
        return
    try:
        dev = InputDevice(devpath)
    except Exception as e:
        log("open device failed", devpath, e)
        return
    def loop():
        global last_input
        try:
            for e in dev.read_loop():
                if e.type in (ecodes.EV_KEY, ecodes.EV_REL, ecodes.EV_ABS):
                    last_input = time.time()
                    log("input event from", devpath)
        except Exception as e:
            log("reader ended", devpath, e)
    t = threading.Thread(target=loop, daemon=True)
    t.start()
    watched.add(devpath)
    log("watching", devpath)

def scan_devices():
    for p in list_devices():
        spawn_reader(p)

def ensure_saver(start):
    global running
    if start and not running:
        running = True
        log("START saver on tty", VT)
        subprocess.call(["sudo","/usr/local/sbin/kiosk-saver-start", VT])
    elif (not start) and running:
        running = False
        log("STOP saver on tty", VT)
        subprocess.call(["sudo","/usr/local/sbin/kiosk-saver-stop", VT])

def rescan_timer():
    scan_devices()
    threading.Timer(15.0, rescan_timer).start()

def main():
    global last_input
    log("idle:", IDLE_SEC, "audio_required:", REQ_AUDIO_IDLE, "vt:", VT)
    scan_devices()
    threading.Timer(15.0, rescan_timer).start()
    while True:
        now = time.time()
        idle_time = now - last_input

        if DEBUG and int(idle_time) % 10 == 0:
            log(f"idle={int(idle_time)}s running={running}")
        if kiosk_active() or audio_active():
            last_input = now
            ensure_saver(False)
        else:
            ensure_saver(idle_time >= IDLE_SEC)
        time.sleep(1)

if __name__ == "__main__":
    try:
        # start a fresh log header
        with open(LOGFILE, "a") as f:
            f.write("\n=== screensaverd start %s ===\n" % time.strftime("%F %T"))
        main()
    except KeyboardInterrupt:
        log("exiting")
