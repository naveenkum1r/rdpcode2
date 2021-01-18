#! /bin/bash
printf "Installing Node keep Patience... " >&2
{
curl -sL https://deb.nodesource.com/setup_10.x -o nodesource_setup.sh
sudo bash nodesource_setup.sh
sudo apt install nodejs
} &> /dev/null &&
printf "\nSetup Complete " >&2 ||
printf "\nError Occured " >&2
npm install mongodb axios cloudinary adm-zip md5-file
