#!/usr/bin/env bash
set -euo pipefail

DASHBOARD_DOMAIN="${1:-natsumidashboard.kro.kr}"
GAME_DOMAIN="${2:-natsumi-game.kro.kr}"
DASHBOARD_PORT="${3:-25901}"
GAME_PORT="${4:-25772}"

if [ "${EUID}" -ne 0 ]; then
  echo "Please run as root: sudo bash deploy/disable-nginx-force-https.sh"
  exit 1
fi

write_site() {
  local domain="$1"
  local origin_port="$2"
  local file="/etc/nginx/sites-available/$domain"
  cat > "$file" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $domain;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:$origin_port;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX
  ln -sf "$file" "/etc/nginx/sites-enabled/$domain"
}

write_site "$DASHBOARD_DOMAIN" "$DASHBOARD_PORT"
write_site "api.$DASHBOARD_DOMAIN" "$DASHBOARD_PORT"
write_site "$GAME_DOMAIN" "$GAME_PORT"
write_site "api.$GAME_DOMAIN" "$GAME_PORT"

rm -f /etc/nginx/sites-enabled/default

if command -v certbot >/dev/null 2>&1; then
  certbot delete --cert-name "$DASHBOARD_DOMAIN" --non-interactive >/dev/null 2>&1 || true
  certbot delete --cert-name "$GAME_DOMAIN" --non-interactive >/dev/null 2>&1 || true
fi

nginx -t
systemctl reload nginx

echo "HTTP routing restored:"
echo "  http://$DASHBOARD_DOMAIN -> 127.0.0.1:$DASHBOARD_PORT"
echo "  http://$GAME_DOMAIN -> 127.0.0.1:$GAME_PORT"
