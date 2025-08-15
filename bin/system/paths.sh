# bin/system/paths
# shellcheck shell=bash
# Must be sourced by other scripts:  source system/paths
set -euo pipefail

# --- resolve *this file's* real path (follows symlinks) ---
__pix_src="${BASH_SOURCE[0]}"
while [ -h "$__pix_src" ]; do
  __pix_dir="$(cd -P "$(dirname "$__pix_src")" && pwd)"
  __pix_src="$(readlink "$__pix_src")"
  [[ "$__pix_src" != /* ]] && __pix_src="$__pix_dir/$__pix_src"
done
__pix_dir="$(cd -P "$(dirname "$__pix_src")" && pwd)"

# PIX_ROOT is two levels up from bin/system/paths
export PIX_ROOT="$(cd "${__pix_dir}/../.." && pwd)"

# Canonical locations
export PIX_BIN="${PIX_ROOT}/bin"
export PIX_ETC="/etc/pix-infinity"
export PIX_SYSTEMD="/etc/systemd/system"

# EmulationStation defaults (tweak if your setup differs)
export ES_CFG="/opt/retropie/configs/all/emulationstation"
export ES_THEMES_DIR="${ES_CFG}/themes"
export PIX_THEME_NAME="epicnoir"

# Helpers
say()  { printf "\033[1;32m[PiX]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[PiX]\033[0m %s\n" "$*"; }
die()  { printf "\033[1;31m[PiX]\033[0m %s\n" "$*" >&2; exit 1; }

# Sanity checks (optional but useful)
[[ -d "$PIX_ROOT" ]] || die "PIX_ROOT not found (computed: $PIX_ROOT)"
