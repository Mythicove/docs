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
| **Unified gateway** (frontend + skin station + mod hosting, path-routed by Caddy) | `http://localhost:8080` |
| Frontend direct (debugging) | `http://localhost:3101` |
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
| `API_URL` | The site address the browser talks to (unified entry = public domain) |
| `API_PORT` / `WEB_PORT` | Host ports for the gateway / direct frontend |
| `HOARD_ADMIN_TOKEN` | Mod upload auth (empty = open upload) |
| `MIRROR_ADMIN_TOKEN` | Skin station admin auth |

The skin station and mod hosting share one Postgres (separate goose version tables). The bundled Caddy gateway routes by path: `/v2/*`, `/api/mods*`, `/auth/*`, `/api/team*`, `/api/user*` → Hoard; `/api/auth/*` (BFF) and the page fallback → Web; remaining API and texture paths → Mirror. Your edge proxy only needs to forward the whole domain to the gateway (see [Deploy](/en/deploy/)).

> See [Deploy](/en/deploy/) for tiered production deployment (Redis / S3 / Meilisearch).
