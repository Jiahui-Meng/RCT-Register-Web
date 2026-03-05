#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/rct-register-web"

sudo apt update
sudo apt install -y nginx git curl

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi

sudo npm install -g pm2

if [ ! -d "$APP_DIR" ]; then
  sudo mkdir -p "$APP_DIR"
  sudo chown -R $USER:$USER "$APP_DIR"
fi

echo "Server base setup completed."
echo "Next: clone project into $APP_DIR, add .env.local, then run build + pm2 startup."
