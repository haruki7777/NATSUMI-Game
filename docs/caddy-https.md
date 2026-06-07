# Caddy 자동 TLS HTTPS 설정

대시보드와 게임센터는 Caddy가 HTTPS를 맡고, 앱은 기존 HTTP 포트로만 실행한다. 인증서 파일을 직접 만들거나 서버에 수동 설치하지 않는다. Caddy가 Let's Encrypt 인증서를 자동 발급하고 갱신한다.

## 연결 구조

- `https://natsumidashboard.kro.kr` -> `127.0.0.1:25901`
- `https://api.natsumidashboard.kro.kr` -> `127.0.0.1:25901`
- `https://natsumi-game.kro.kr` -> `127.0.0.1:25772`
- `https://api.natsumi-game.kro.kr` -> `127.0.0.1:25772`

## 서버 작업 순서

1. DNS A 레코드를 Caddy가 설치될 서버 IP로 맞춘다.
   - `natsumidashboard.kro.kr`
   - `api.natsumidashboard.kro.kr`
   - `natsumi-game.kro.kr`
   - `api.natsumi-game.kro.kr`
2. 서버 방화벽과 호스팅 패널에서 `80`, `443` 포트를 연다.
3. 기존 nginx나 Vortexa 기본 페이지가 `80`, `443`을 잡고 있으면 먼저 비활성화한다.

```bash
sudo systemctl stop nginx || true
sudo systemctl disable nginx || true
```

4. Caddy를 설치한다.
5. `deploy/Caddyfile` 내용을 서버의 `/etc/caddy/Caddyfile`에 적용한다.
6. 문법을 확인한다.

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
```

7. Caddy를 다시 불러온다.

```bash
sudo systemctl reload caddy
```

8. HTTPS 응답을 확인한다.

```bash
curl -I https://natsumidashboard.kro.kr
curl -I https://natsumi-game.kro.kr
```

응답 본문이 `Vortexa Cloud`이면 아직 nginx/default site가 도메인을 가로채는 상태다. Caddy가 `80`, `443`을 직접 받아야 한다.

## Discord Developer Portal 리디렉션

아래 URI 4개를 정확히 등록한다.

- `https://natsumidashboard.kro.kr/auth/discord/callback`
- `https://natsumidashboard.kro.kr/auth/discord/dashboard/callback`
- `https://natsumi-game.kro.kr/auth/discord/callback`
- `https://natsumi-game.kro.kr/auth/discord/game/callback`

## 환경변수 기준

```env
DASHBOARD_URL=https://natsumidashboard.kro.kr/
GAME_URL=https://natsumi-game.kro.kr/
SITE_URL=https://natsumi-site.kro.kr/
PUBLIC_BASE_URL=https://natsumi-game.kro.kr
ALLOWED_ORIGINS=https://natsumidashboard.kro.kr,https://natsumi-game.kro.kr,https://natsumi-site.kro.kr
DISCORD_REDIRECT_URI=https://natsumi-game.kro.kr/auth/discord/callback
```

## 주의

- 앱 내부 `FORCE_HTTPS=true`는 Caddy HTTPS 접속이 실제로 성공한 뒤에만 켠다.
- Caddy가 HTTP -> HTTPS 리디렉션을 담당해야 OAuth 리디렉션과 세션이 덜 꼬인다.
- 80/443 포트를 받을 수 없는 서버라면 Caddy 자동 TLS 대신 Cloudflare Tunnel로 전환한다.
