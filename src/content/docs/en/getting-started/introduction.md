---
title: Introduction
description: Why Mythicove exists and what it replaces
---

Mythicove is an open-source Minecraft ecosystem for offline / private / modded servers: a skin station, a mod host, and a launcher that share one metaphor, one tech stack, and one set of infrastructure.

## What it replaces

| Problem | Mythicove answer |
|---|---|
| Blessing Skin stuck on PHP 8.1 EOL, dated UI | **Mythic Mirror** — Go, Yggdrasil-compatible |
| CurseForge closed source | **Mythic Hoard** — open, Modrinth-compatible |
| Modrinth changed to source-available | **Mythic Hoard** — Elastic License 2.0 (ELv2) |

## Tech stack

- **Backend**: Go (chi + pgx + sqlc), single binary, self-host friendly.
- **Frontend**: Next.js + React + Tailwind, contract-first via OpenAPI.
- **Storage / search / queue**: capability interfaces with swappable implementations (local → S3, pg_trgm → Meilisearch, inline → asynq).

## Scale tiers

| Tier | Scale | Components |
|---|---|---|
| A | 10–100 | Go binary + Postgres + local disk |
| B | 100–1k | + Redis + MinIO/R2 + Meilisearch |
| C | 1k–5k | + S3 + CDN + asynq |
| D | 5k–10k+ | K8s + HA + multi-region |

See the Chinese [overview](/getting-started/introduction/) for the full plan.
