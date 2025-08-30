#!/bin/bash
set -Eeuo pipefail

# -------- helpers --------
wait_systemd_ready() {
  # Accept "running" or "degraded" to avoid hanging forever if a non-critical unit failed.
  local t=0
  while :; do
    state="$(systemctl is-system-running 2>/dev/null || true)"
    case "$state" in
      running|degraded) return 0 ;;
      *)                 sleep 1; t=$((t+1)); [[ $t -ge 60 ]] && return 0 ;;
    esac
  done
}

wait_network_online() {
  # Honor network-online.target if present. Time out after 30s.
  local t=0
  while ! systemctl is-active --quiet network-online.target 2>/dev/null; do
    sleep 1
    t=$((t+1))
    [[ $t -ge 30 ]] && break
  done
}

wait_mounts_if_listed() {
  # OPTIONAL: if you want to be extra careful, list mount roots here.
  # Comment the array out if you don't want mount polling.
  local mounts=(
    /mnt/Nas
    /mnt/rooms
  )
  local t mp
  for mp in "${mounts[@]}"; do
    t=0
    while ! findmnt -T "$mp" >/dev/null 2>&1; do
      # If the path doesn’t exist yet, don’t spin forever.
      [[ -e "$mp" ]] || break
      sleep 1
      t=$((t+1))
      [[ $t -ge 20 ]] && break
    done
  done
}

# -------- sequence --------
wait_systemd_ready
wait_network_online
#wait_mounts_if_listed

# Rebuild ES systems (per-system paths) — this doesn’t require mounts to be “up”,
# but we run it here anyway to align with the boot’s steady state.
if command -v /usr/local/bin/pix_modules_build >/dev/null 2>&1; then
  /usr/local/bin/pix_modules_build || true
fi

# Launch EmulationStation
/opt/retropie/supplementary/emulationstation/emulationstation.sh



#pix_modules_build
#emulationstation #auto
