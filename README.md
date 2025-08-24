# Preparation steps:
1) With Raspberry PI imager software
    - Pick Raspberry PI 5 (recommended)
    - Operating System: Raspberry Pi OS LITE (64-bit)
    - Storage: the rpi storage card
    - Next
    - Edit Settings:
        * General
            -Set hostname: pix
            -Set a username and password
            -Configure wireless LAN (recommended, unless you connect the pi with a network cable)
        * Services
            - Enable SSH and use password authentication
    - Save
    - Yes and wait
2) Boot the Raspberry PI and wait for TTY console to appear
3) Do a ssh connection, you can check the rpi ip address with a ifconfig command
4) Update the system
    - sudo apt update
    - sudo apt upgrade
5) Install retropie
    - sudo apt install -y git lsb-release
    - cd ~
    - git clone --depth=1 https://github.com/RetroPie/RetroPie-Setup.git
    - cd RetroPie-Setup
    - sudo ./retropie_setup.sh
        - Pick "Basic Install" and wait for the installation to complete (Grab a coffee, it will take a while)
6) Automatic boot into ES:
    - Go to Configuration / tools 
        -> Boot to text console (auto login as [YOUR USER NAME])
        -> autostart -> Start EmulationStation at boot.
7) Clone epic-noir theme
    - Go to Configuration / tools -> esthemes -> pick c64-dev/EpicNoir
Reboot -> sudo reboot
    - configure your joypad
    - press start → UI Settings → Theme Set → epicnoir 

# Install Pix-Infinity mod on top (For now will require manual steps, but in the future I might add an automation script)
- Copy bin files to /usr/local/bin/
- Create folder ~/.emulationstation/modudes 
- Copy modules content to ~/.emulationstation/modudes 
- Copy config file (rom-location.txt) in folder configs to ~/.emulationstation
- Edit file and add rom locations ordered from your most priority location to the least (Current file content is just an example)
- Create the folders for local roms:
    mkdir -p ~/RetroPie/roms/services
    mkdir -p ~/RetroPie/roms/gallery
    mkdir -p ~/RetroPie/roms/iptv
    mkdir -p ~/RetroPie/roms/music
    mkdir -p ~/RetroPie/roms/radio
    mkdir -p ~/RetroPie/roms/videos
    mkdir -p ~/RetroPie/roms/youtube
        In ~/RetroPie/roms/youtube copy the file channels.txt from configs to this folder (edit content, current is just an example)
- Copy folders inside themes folder to /etc/emulationstation/themes/epicnoir/
- Copy images inside themes folder/_art/posters to /etc/emulationstation/themes/epicnoir/_art/posters

All this to work require some dependencies, the ones I remember:
xserver-xorg 
xinit x11-xserver-utils 
xinput
chromium
feh
mpv
imagemagick 
yt-dlp
curl
jq
git
python3 
python3-evdev 
python3-xlib 
python3-pip
matchbox-window-manager
openbox 
unclutter-xfixes
pipewire 
wireplumber 
pipewire-pulse 
alsa-utils 
pulseaudio-utils
fonts-noto 
fonts-freefont-ttf
antimicrox

You can try install all those and make it all running on your own while I don't create an installer!