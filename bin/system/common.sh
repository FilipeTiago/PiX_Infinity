#!/usr/bin/env bash
# shellcheck disable=SC2034
set -euo pipefail
IFS=$'\n\t'

# -------- dirs & logging --------
KIOSK_USER="${KIOSK_USER:-$USER}"
KIOSK_UID="${KIOSK_UID:-$(id -u)}"
KIOSK_GID="${KIOSK_GID:-$(id -g)}"

export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$KIOSK_UID}"
KIOSK_STATE_DIR="${KIOSK_STATE_DIR:-$XDG_RUNTIME_DIR/kiosk}"
KIOSK_LOCK_DIR="$KIOSK_STATE_DIR/locks"
KIOSK_LOG_DIR="${KIOSK_LOG_DIR:-/tmp/kiosk}"

init_dirs() {
  mkdir -p "$KIOSK_STATE_DIR" "$KIOSK_LOCK_DIR" "$KIOSK_LOG_DIR"
}

_logfile() {
  local base="${1:-${0##*/}}"
  echo "$KIOSK_LOG_DIR/${base%.sh}.log"
}

_ts() { date +'%H:%M:%S'; }

log() {
  init_dirs
  local f; f="$(_logfile "${LOG_NAME:-${0##*/}}")"
  echo "[$(_ts)] $*" | tee -a "$f" >/dev/null
}

die() { log "ERROR: $*"; exit 1; }

# -------- locking (VT- or app-scoped) --------
# Usage: lock_or_exit "chromium"   -> /run/user/$UID/kiosk/locks/chromium.lock
lock_or_exit() {
  init_dirs
  local name="$1" path="$KIOSK_LOCK_DIR/${name}.lock"
  exec {KIOSK_LOCK_FD}>"$path" || die "open lock $path"
  if ! flock -n "$KIOSK_LOCK_FD"; then
    log "lock busy: $path (already running?)"
    exit 0
  fi
  cleanup_push "flock -u $KIOSK_LOCK_FD; rm -f '$path' || true"
}

# simple LIFO trap stack, so callers can push multiple cleanups
__CLEANUP_CMDS=()
cleanup_push() { __CLEANUP_CMDS+=("$*"); trap __cleanup EXIT INT TERM; }
__cleanup() {
  local cmd
  for (( idx=${#__CLEANUP_CMDS[@]}-1 ; idx>=0 ; idx-- )); do
    cmd="${__CLEANUP_CMDS[$idx]}"
    bash -c "$cmd" || true
  done
  trap - EXIT INT TERM
}

# -------- misc helpers --------
require_cmd() { command -v "$1" >/dev/null 2>&1 || die "missing: $1"; }

x_running() {
  if [[ -n "${DISPLAY:-}" ]]; then xdpyinfo >/dev/null 2>&1 && return 0; fi
  pgrep -x Xorg >/dev/null 2>&1
}

pick_size() {
  # Sets W H (globals)
  local dims
  W=1920; H=1080
  if command -v xrandr >/dev/null 2>&1 && xrandr | grep -q ' connected'; then
    dims="$(xrandr | awk '/ connected primary/{for(i=1;i<=NF;i++) if($i ~ /^[0-9]+x[0-9]+(\+|$)/){print $i; exit}}')"
    dims="${dims%%+*}"
    if [[ "$dims" =~ ^([0-9]+)x([0-9]+)$ ]]; then W="${BASH_REMATCH[1]}"; H="${BASH_REMATCH[2]}"; return 0; fi
  fi
  if [[ -r /sys/class/graphics/fb0/virtual_size ]]; then
    IFS=, read -r W H < /sys/class/graphics/fb0/virtual_size || true
  fi
}

audio_prepare() {
  export PULSE_SERVER="unix:$XDG_RUNTIME_DIR/pulse/native"
  command -v pactl >/dev/null 2>&1 || return 0
  pactl set-sink-mute @DEFAULT_SINK@ 0 || true
  pactl set-sink-volume @DEFAULT_SINK@ 75% || true
}

# pattern match utilities (useful for status/stop)
pgrep_pat() { pgrep -f -- "$1" >/dev/null 2>&1; }
pkill_pat() { pkill -f -- "$1" >/dev/null 2>&1 || true; }

# small sleep with dots (for logs)
wait_for() { local sec="${1:-1}"; while (( sec-- > 0 )); do printf '.'; sleep 1; done; echo; }
