---
title: Deploy
description: Tiered deployment from a single VPS to a cluster
---

Mythicove deploys from a single 2C2G VPS to a 10k-player platform by swapping implementations, not rewriting code.

## Tiers

| Tier | Scale | Components |
|---|---|---|
| A | 10–100 | Go binary + Postgres + local disk |
| B | 100–1k | + Redis + MinIO/R2 + Meilisearch (Hoard) |
| C | 1k–5k | + S3 + CDN + asynq |
| D | 5k–10k+ | K8s + HA + multi-region |

## Unified gateway

The compose `caddy` service is a single-port gateway for the whole stack — frontend, Mirror and Hoard behind one origin. Path routing ships with the product (`Caddyfile`); your edge/TLS proxy just forwards the domain to it:

```
:8080 {
    reverse_proxy /v2/* hoard:8081
    reverse_proxy /api/mods* hoard:8081
    reverse_proxy /auth/* hoard:8081
    reverse_proxy /api/auth/* web:3000   # Next.js BFF (httpOnly cookie session)
    # ...mirror API paths, then everything else falls through to web:3000
}
```

**Split deployment** (frontend on a Pages-style host, backends on your server): run `docker compose up -d db mirror hoard caddy` (skip `web`), point the frontend build at the API domain (`NEXT_PUBLIC_API_URL`) and set `API_URL_INTERNAL` for SSR/BFF. The host must run Next.js server routes (BFF), and the browser should reach the API same-origin via the host's path rewrites — cross-site cookie sessions (SameSite=Lax) won't work otherwise.

See the full [deployment guide](../../deploy/index.md) (Chinese) or [storage tiers](../../deploy/storage.md).
