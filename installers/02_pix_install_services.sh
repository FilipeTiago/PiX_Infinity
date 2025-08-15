#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Install scripts
sudo install -Dm755 "$ROOT/bin/"* -t /usr/local/bin/

# If you have any root-only helpers, place them in sbin in the repo (or keep as-is)
# sudo install -Dm755 "$ROOT/sbin/"* -t /usr/local/sbin/  || true

# sudoers
sudo install -Dm440 "$ROOT/config/sudoers/pix-kiosk" /etc/sudoers.d/pix-kiosk

# systemd units
sudo install -Dm644 "$ROOT/services/system/kiosk-screensaver@.service" \
  /etc/systemd/system/kiosk-screensaver@.service
systemctl daemon-reload

# user unit
mkdir -p ~/.config/systemd/user
install -m644 "$ROOT/services/user/screensaverd.service" ~/.config/systemd/user/

# Enable linger for your user so user services run without login
sudo loginctl enable-linger "$USER" || true

# Enable (but do not start) the system screensaver unit template
sudo systemctl enable kiosk-screensaver@7.service || true

# Enable the user screensaver watcher
systemctl --user enable screensaverd.service || true

echo "Done. Reboot recommended."
