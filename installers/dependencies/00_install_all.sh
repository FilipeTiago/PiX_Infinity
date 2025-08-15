#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
source ./pix.env

say "Installing PiX Infinity to ${PIX_PREFIX}"

sudo mkdir -p "${PIX_PREFIX}" "${PIX_ETC}" "${ES_CFG}" "${ES_THEMES_DIR}"
sudo rsync -a --delete "${REPO_ROOT}/bin/" "${PIX_PREFIX}/bin/"
sudo rsync -a --delete "${REPO_ROOT}/config/" "${PIX_ETC}/"
sudo rsync -a --delete "${REPO_ROOT}/services/" "${PIX_PREFIX}/services/"
sudo rsync -a --delete "${REPO_ROOT}/emulationstation/" "${PIX_PREFIX}/emulationstation/"

# Theme install (copy to ES themes)
if [[ -d "${REPO_ROOT}/${PIX_THEME_SRC}" ]]; then
  sudo rsync -a --delete "${REPO_ROOT}/${PIX_THEME_SRC}/" "${ES_THEMES_DIR}/${PIX_THEME_NAME}/"
  say "Theme '${PIX_THEME_NAME}' installed under ${ES_THEMES_DIR}"
else
  warn "Theme source ${REPO_ROOT}/${PIX_THEME_SRC} not found; skipping."
fi

# Link executables into PATH (prefix them for clarity)
sudo find "${PIX_PREFIX}/bin" -maxdepth 1 -type f -executable -print0 \
 | xargs -0 -I{} sudo ln -sf "{}" "${PIX_BIN}/pix-$(basename "{}")"

# Systemd units
for unit in "${PIX_PREFIX}/services/"*.service; do
  [[ -e "$unit" ]] || continue
  name="$(basename "$unit")"
  # Rewrite any absolute paths inside units to canonical paths
  sudo awk -v pfx="${PIX_PREFIX}" '
    BEGIN{changed=0}
    { gsub(/ExecStart=\/.*\/bin\//,"ExecStart=" pfx "/bin/"); print }
  ' "$unit" | sudo tee "${PIX_SYSTEMD}/${name}" >/dev/null
  sudo systemctl daemon-reload
  sudo systemctl enable --now "${name}"
  say "Enabled ${name}"
done

say "Running dependency install (APT)…"
sudo apt-get update

sudo ./01_pix_install_dependencies.sh
sudo ./02_pix_install_services.sh

say "Finishing…"
say "PiX Infinity installed. rebooting..."
sudo reboot
