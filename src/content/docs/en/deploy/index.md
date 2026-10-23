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

## Single API domain

Caddy routes everything through one domain:

```
:8080 {
    reverse_proxy /v2/* hoard:8081
    reverse_proxy /api/mods* hoard:8081
    reverse_proxy mirror:8080
}
```

See the full [deployment guide](/deploy/) (Chinese) or [storage tiers](/deploy/storage/).
