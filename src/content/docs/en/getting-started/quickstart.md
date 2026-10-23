---
title: Quickstart
description: Run the whole Mythicove stack locally with Docker Compose
---

One `docker compose up` brings up the skin station, mod hosting, and the web frontend.

## Prerequisites

- Docker and Docker Compose v2
- An optional domain (`localhost` works for local dev)

## 1. Clone and start

From the repo root (containing `docker-compose.yml` and `Caddyfile`):

```bash
cp .env.example .env
docker compose up -d --build
```

Default ports:

| Service | URL |
|---|---|
| Single API domain (Caddy routed) | `http://localhost:8080` |
| Frontend (Next.js) | `http://localhost:3101` |
| Postgres | `localhost:5432` |

## 2. Verify

```bash
curl http://localhost:8080/healthz          # ok
curl http://localhost:8080/api/login-methods # login methods
curl http://localhost:8080/api/mods          # mod list
curl http://localhost:8080/.well-known/openid-configuration # OIDC
```

## 3. Configuration

Key environment variables (see `.env.example`):

| Variable | Purpose |
|---|---|
| `API_URL` | The single API domain the browser talks to |
| `API_PORT` / `WEB_PORT` | Host ports |
| `HOARD_ADMIN_TOKEN` | Mod upload auth (empty = open upload) |
| `MIRROR_ADMIN_TOKEN` | Skin station admin auth |

The skin station and mod hosting share one Postgres (separate goose version tables) and are routed by Caddy: `/v2/*`, `/api/mods*` → Hoard, everything else → Mirror.

> See [Deploy](/en/deploy/) for tiered production deployment (Redis / S3 / Meilisearch).
