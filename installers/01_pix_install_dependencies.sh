#!/usr/bin/env bash
set -euo pipefail

# PiX Infinity — bootstrap installer
# Reads package lists from ./dependencies and installs them on a fresh Pi.
# Files:
#   dependencies/apt-manual.txt
#   dependencies/apt-holds.txt
#   dependencies/pip3-requirements.txt

DEPS_DIR="dependencies"
APT_MANUAL="${DEPS_DIR}/apt-manual.txt"
APT_HOLDS="${DEPS_DIR}/apt-holds.txt"
PIP_REQS="${DEPS_DIR}/pip3-requirements.txt"

# Use sudo if not root
if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  SUDO="sudo"
else
  SUDO=""
fi

echo "==> PiX Infinity installer starting..."
echo "==> Using deps dir: ${DEPS_DIR}"

# Sanity checks
if ! command -v apt-get >/dev/null 2>&1; then
  echo "ERROR: This script requires a Debian/Ubuntu/Raspberry Pi OS system with apt-get." >&2
  exit 1
fi

# Make APT non-interactive
export DEBIAN_FRONTEND=noninteractive
$SUDO apt-get update -y

install_apt_manual() {
  if [[ -f "$APT_MANUAL" ]]; then
    echo "==> Installing APT packages from $APT_MANUAL ..."
    # Filter: remove comments and blank lines
    mapfile -t PKGS < <(grep -vE '^\s*#' "$APT_MANUAL" | sed '/^\s*$/d')
    if (( ${#PKGS[@]} > 0 )); then
      # Use xargs safely for long lists
      printf '%s\n' "${PKGS[@]}" | xargs -r $SUDO apt-get install -y
    else
      echo "==> No packages listed in $APT_MANUAL"
    fi
  else
    echo "==> Skipping APT manual packages (file not found: $APT_MANUAL)"
  fi
}

apply_apt_holds() {
  if [[ -f "$APT_HOLDS" ]]; then
    echo "==> Applying APT holds from $APT_HOLDS ..."
    while IFS= read -r pkg; do
      [[ -z "$pkg" ]] && continue
      [[ "$pkg" =~ ^\s*# ]] && continue
      $SUDO apt-mark hold "$pkg" || true
    done < "$APT_HOLDS"
  else
    echo "==> Skipping APT holds (file not found: $APT_HOLDS)"
  fi
}

install_pip3_requirements() {
  if [[ -f "$PIP_REQS" ]]; then
    echo "==> Installing pip3 requirements from $PIP_REQS ..."
    if ! command -v pip3 >/dev/null 2>&1; then
      echo "==> pip3 not found; installing python3-pip ..."
      $SUDO apt-get install -y python3-pip
    fi
    # Upgrade pip (optional but helps with wheels)
    $SUDO -H python3 -m pip install --upgrade pip
    # Install requirements
    $SUDO -H python3 -m pip install -r "$PIP_REQS"
  else
    echo "==> Skipping pip3 requirements (file not found: $PIP_REQS)"
  fi
}

install_apt_manual
apply_apt_holds
install_pip3_requirements