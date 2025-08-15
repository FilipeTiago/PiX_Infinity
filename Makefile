.PHONY: deps install enable disable uninstall doctor fmt lint

deps:
\tbash installers/01_pix_install_dependencies.sh

install:
\tbash installers/20_pix_install_services.sh

enable:
\tsystemctl --user enable screensaverd.service || true
\tsudo systemctl enable kiosk-screensaver@7.service || true

disable:
\tsystemctl --user disable screensaverd.service || true
\tsudo systemctl disable kiosk-screensaver@7.service || true

uninstall:
\tsudo rm -f /etc/systemd/system/kiosk-screensaver@.service
\tsudo rm -f /etc/sudoers.d/pix-kiosk
\tsudo rm -f /usr/local/bin/kiosk*
\tsudo rm -f /usr/local/bin/*ctl
\tsystemctl --user disable screensaverd.service || true
\tsudo systemctl disable kiosk-screensaver@7.service || true
\tsystemctl --user daemon-reload || true
\tsudo systemctl daemon-reload || true

fmt:
\tshfmt -w bin || true

lint:
\tshellcheck bin/* || true

doctor:
\t@echo "User: $(USER)"; \
\tid; \
\tls -l /etc/sudoers.d/pix-kiosk || true; \
\techo "--- user units ---"; systemctl --user list-unit-files | grep screensaverd || true; \
\techo "--- system units ---"; systemctl list-unit-files | grep kiosk-screensaver@ || true