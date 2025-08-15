# PiX_Infinity
Retro console + entertainment system

# BEFORE INSTALLING
This project was created using raspbery pi 5 with Raspberry PI OS Lite(64-bit).
Install retropie:
    01 - Prepare
        - sudo apt update && sudo apt full-upgrade -y
        - sudo apt install -y git dialog unzip xmlstarlet
    02 - Install retropie
        - git clone --depth=1 https://github.com/RetroPie/RetroPie-Setup.git
        - cd RetroPie-Setup
        - sudo ./retropie_setup.sh
                - Choose Basic Install
                - Grab a big coffee

# INSTALL PiX-Infinity
    01 - clone this repo and
        - cd PiX_Infinity
        - sudo chmod +x *.sh
        - sudo ./01_pix_install_dependencies.sh
        - sudo ./02_pix_install_scripts.sh
        - sudo ./03_pix_install_services.sh
        - sudo ./04_pix_install_sudoers.sh
