# Cloudflare Tunnel free HTTPS setup

This deployment uses Cloudflare Tunnel instead of binding ports `80` and `443`.
It is suitable for Pterodactyl/Vortexa containers where `nginx`, `systemctl`, or
host-level Caddy cannot be controlled.

## Game center tunnel

Create a separate tunnel for the game center container. Do not reuse the
dashboard tunnel token unless both services run in the same container.

1. Cloudflare dashboard -> Zero Trust -> Networks -> Tunnels.
2. Create a tunnel named `natsumi-game`.
3. Choose `cloudflared` connector.
4. Copy only the long tunnel token from the connector command.
5. Add this environment variable to the game center server:

```env
GAME_CLOUDFLARED_TUNNEL_TOKEN=your_game_tunnel_token
```

6. Add public hostnames to the same tunnel:

| Public hostname | Service |
| --- | --- |
| `natsumi-game.kro.kr` | `http://localhost:25772` |
| `api.natsumi-game.kro.kr` | `http://localhost:25772` |

7. Restart the game center server.

The app downloads `cloudflared` automatically in the container and starts the
tunnel when `GAME_CLOUDFLARED_TUNNEL_TOKEN` is present. The token is never
printed by the app logs.

## Discord redirects

Use HTTPS URLs only:

```text
http://natsumi-game.kro.kr/auth/discord/callback
http://natsumi-game.kro.kr/auth/discord/game/callback
```

## Health check

```bash
curl -I http://natsumi-game.kro.kr
curl -L http://natsumi-game.kro.kr/api/status
```

API responses must return JSON, not SPA fallback HTML.
