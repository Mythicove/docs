---
title: 多实例与缓存
description: Redis 缓存、限流与队列的分级
---

从单实例到多副本，缓存 / 限流 / 队列按需从进程内升级到 Redis，不改业务代码。

## 缓存

| 层级 | 实现 | 配置 |
|---|---|---|
| A（进程内） | `memcache` | 默认 |
| B+（Redis） | `rediscache` | `MIRROR_REDIS_ADDR=...` |

Mirror 用缓存热路径 `profile`（`hasJoined` 进服热路径）；配置 Redis 后多副本共享同一缓存。

## 限流

- 单实例：进程内令牌桶（`MIRROR_RATE_LIMIT_RPS` / `MIRROR_RATE_LIMIT_BURST`）。
- 多实例：在反向代理（Caddy/Nginx）层做统一限流。

## 队列（Hoard）

| 层级 | 实现 | 配置 |
|---|---|---|
| A（内联同步） | `inline` | 默认 |
| B+（异步） | `asynq`（Redis） | `HOARD_QUEUE_DRIVER=asynq` + `HOARD_REDIS_ADDR` |

队列用于搜索索引等异步任务；内联时同步执行，切换 asynq 后投递到 Redis。

## 搜索（Hoard）

| 层级 | 实现 | 配置 |
|---|---|---|
| A（Postgres） | `pg_trgm`（ILIKE + GIN 索引） | 默认 |
| B+（Meilisearch） | `meili` | `HOARD_SEARCH_DRIVER=meili` + `HOARD_MEILI_URL/API_KEY` |
