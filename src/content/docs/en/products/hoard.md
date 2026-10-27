---
title: Mythic Hoard
description: Mod hosting — Modrinth-compatible mod / modpack distribution
---

Mythic Hoard hosts mods and modpacks with a Modrinth-compatible API.

- **Project → Version → File** model on Postgres (sqlc).
- **Modrinth-compatible read** subset (`/v2/search`, `/v2/project`, `/v2/version`) + `.mrpack` export.
- **Storage** local / S3, content-addressed (sha512 dedup).
- **Search** pg_trgm (default) or Meilisearch; **queue** inline or asynq.
- **Review** status (`listed` / `under_review` / `rejected` / `archived`).

See the [product reference](../../products/hoard.md) and the [plan](../../plans/hoard.md) (both Chinese), or the [quickstart](../getting-started/quickstart.md).
