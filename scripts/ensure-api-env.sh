#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${PREDICTOR26_ROOT:-/opt/predictor26}"
CURRENT_DIR="${PREDICTOR26_CURRENT:-$APP_ROOT/current}"
SHARED_DIR="${PREDICTOR26_SHARED:-$APP_ROOT/shared}"
SHARED_ENV="$SHARED_DIR/api.env"
API_ENV="$CURRENT_DIR/apps/api/.env"

mkdir -p "$SHARED_DIR"
touch "$SHARED_ENV"
chmod 600 "$SHARED_ENV"

get_env_value() {
  local key="$1"

  grep -E "^${key}=" "$SHARED_ENV" | tail -n 1 | cut -d '=' -f 2-
}

set_env_value() {
  local key="$1"
  local value="$2"

  if grep -q -E "^${key}=" "$SHARED_ENV"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$SHARED_ENV"
  else
    printf '%s=%s\n' "$key" "$value" >> "$SHARED_ENV"
  fi
}

if [[ -z "$(get_env_value VAPID_SUBJECT)" ]]; then
  set_env_value "VAPID_SUBJECT" "mailto:admin@predictor26.local"
fi

set_env_value "NOTIFICATION_REMINDER_INTERVAL_MS" "300000"

if [[ -z "$(get_env_value AUTH_TOKEN_SECRET)" ]]; then
  auth_token_secret="$(
    node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
  )"

  set_env_value "AUTH_TOKEN_SECRET" "$auth_token_secret"
fi

if [[ -z "$(get_env_value SUPER_ADMIN_PASSWORD)" ]]; then
  super_admin_password="$(
    node -e "console.log(require('node:crypto').randomBytes(18).toString('base64url'))"
  )"

  if [[ -z "$(get_env_value SUPER_ADMIN_USERNAME)" ]]; then
    set_env_value "SUPER_ADMIN_USERNAME" "super_admin"
  fi

  if [[ -z "$(get_env_value SUPER_ADMIN_FIRST_NAME)" ]]; then
    set_env_value "SUPER_ADMIN_FIRST_NAME" "admin"
  fi

  if [[ -z "$(get_env_value SUPER_ADMIN_LAST_NAME)" ]]; then
    set_env_value "SUPER_ADMIN_LAST_NAME" "admin"
  fi

  set_env_value "SUPER_ADMIN_PASSWORD" "$super_admin_password"
fi

if [[ -z "$(get_env_value VAPID_PUBLIC_KEY)" || -z "$(get_env_value VAPID_PRIVATE_KEY)" ]]; then
  keys="$(
    cd "$CURRENT_DIR"
    node -e "const webpush = require('web-push'); const keys = webpush.generateVAPIDKeys(); console.log(keys.publicKey); console.log(keys.privateKey);"
  )"

  public_key="$(printf '%s\n' "$keys" | sed -n '1p')"
  private_key="$(printf '%s\n' "$keys" | sed -n '2p')"

  set_env_value "VAPID_PUBLIC_KEY" "$public_key"
  set_env_value "VAPID_PRIVATE_KEY" "$private_key"
fi

ln -sfn "$SHARED_ENV" "$API_ENV"

printf 'API environment is ready: %s -> %s\n' "$API_ENV" "$SHARED_ENV"
