#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
static_dir="/var/www/predictor26-maintenance"
snippet_path="/etc/nginx/snippets/predictor26-maintenance.conf"
helper_path="/usr/local/bin/predictor26-maintenance"
include_line="include $snippet_path;"
server_name="${PREDICTOR26_NGINX_SERVER_NAME:-predictor26.ivanjkv.cc}"

sudo mkdir -p "$static_dir" /etc/nginx/snippets
sudo cp "$repo_root/deploy/maintenance.html" "$static_dir/predictor26-maintenance.html"
sudo cp "$repo_root/deploy/nginx-maintenance.conf" "$snippet_path"
sudo cp "$repo_root/deploy/predictor26-maintenance" "$helper_path"
sudo chmod 755 "$helper_path"

nginx_config="${PREDICTOR26_NGINX_CONFIG:-}"
explicit_nginx_config=0

if [[ -n "$nginx_config" ]]; then
  explicit_nginx_config=1
fi

if [[ -z "$nginx_config" ]]; then
  mapfile -t nginx_candidates < <(
    sudo grep -RIlE 'predictor26|/opt/predictor26|/var/www/predictor26|proxy_pass[[:space:]]+http://127\.0\.0\.1:3000|proxy_pass[[:space:]]+http://localhost:3000' \
      /etc/nginx/sites-enabled /etc/nginx/sites-available 2>/dev/null \
      | sort -u
  )

  if [[ "${#nginx_candidates[@]}" -eq 1 ]]; then
    nginx_config="${nginx_candidates[0]}"
  fi
fi

if [[ -n "$nginx_config" ]]; then
  nginx_config="$(readlink -f "$nginx_config")"

  if sudo awk -v server_name="$server_name" -v include_line="$include_line" '
    /^[[:space:]]*server[[:space:]]*\{/ {
      in_server = 1;
      found_name = 0;
      found_include = 0;
    }
    in_server && $0 ~ "server_name" && $0 ~ server_name {
      found_name = 1;
    }
    in_server && index($0, include_line) > 0 {
      found_include = 1;
    }
    in_server && /^[[:space:]]*\}/ {
      if (found_name && found_include) {
        found = 1;
      }
      in_server = 0;
    }
    END {
      exit found ? 0 : 1;
    }
  ' "$nginx_config"; then
    echo "Predictor26 maintenance nginx include already exists in $nginx_config."
  else
    matching_server_block_count="$(sudo awk -v server_name="$server_name" '
      /^[[:space:]]*server[[:space:]]*\{/ {
        in_server = 1;
        found_name = 0;
      }
      in_server && $0 ~ "server_name" && $0 ~ server_name {
        found_name = 1;
      }
      in_server && /^[[:space:]]*\}/ {
        if (found_name) {
          count += 1;
        }
        in_server = 0;
      }
      END {
        print count + 0;
      }
    ' "$nginx_config")"

    if [[ "$matching_server_block_count" -ne 1 ]]; then
      echo "Predictor26 maintenance assets installed, but $nginx_config has $matching_server_block_count server blocks for $server_name."
      echo "Set PREDICTOR26_NGINX_SERVER_NAME to the exact Predictor26 server_name and rerun this script."
      echo "Predictor26 maintenance setup complete."
      exit 0
    fi

    sudo cp "$nginx_config" "$nginx_config.predictor26-maintenance.bak"
    sudo awk -v server_name="$server_name" -v include_line="  $include_line" '
      /^[[:space:]]*server[[:space:]]*\{/ {
        in_server = 1;
        found_name = 0;
      }
      in_server && $0 ~ "server_name" && $0 ~ server_name {
        found_name = 1;
      }
      in_server && found_name && !inserted && /^[[:space:]]*root[[:space:]]/ {
        print include_line;
        print;
        inserted = 1;
        next;
      }
      in_server && /^[[:space:]]*\}/ {
        in_server = 0;
      }
      { print }
    ' "$nginx_config" | sudo tee "$nginx_config.tmp" >/dev/null
    sudo mv "$nginx_config.tmp" "$nginx_config"

    if sudo nginx -t; then
      sudo systemctl reload nginx
      echo "Predictor26 maintenance nginx include installed in $nginx_config."
    else
      sudo mv "$nginx_config.predictor26-maintenance.bak" "$nginx_config"
      sudo nginx -t
      echo "nginx test failed after maintenance include insertion; restored $nginx_config." >&2
      exit 1
    fi
  fi
else
  echo "Predictor26 maintenance assets installed, but nginx config was not auto-detected."
  echo "Set PREDICTOR26_NGINX_CONFIG=/etc/nginx/sites-available/YOUR_SITE and rerun this script to wire nginx automatically."
fi

echo "Predictor26 maintenance setup complete."
