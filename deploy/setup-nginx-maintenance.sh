#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
static_dir="/var/www/predictor26-maintenance"
snippet_path="/etc/nginx/snippets/predictor26-maintenance.conf"
helper_path="/usr/local/bin/predictor26-maintenance"

sudo mkdir -p "$static_dir" /etc/nginx/snippets
sudo cp "$repo_root/deploy/maintenance.html" "$static_dir/predictor26-maintenance.html"
sudo cp "$repo_root/deploy/nginx-maintenance.conf" "$snippet_path"
sudo cp "$repo_root/deploy/predictor26-maintenance" "$helper_path"
sudo chmod 755 "$helper_path"
sudo rm -f "$static_dir/enabled"

cat <<EOF
Installed:
  $static_dir/predictor26-maintenance.html
  $snippet_path
  $helper_path

Next step: add this line inside the Predictor26 nginx server block:

  include $snippet_path;

Then run:

  sudo nginx -t
  sudo systemctl reload nginx

Test manually:

  sudo predictor26-maintenance on
  curl -I http://YOUR_DOMAIN/
  sudo predictor26-maintenance off
EOF
