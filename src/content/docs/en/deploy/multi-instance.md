---
title: Multi-instance and caching
description: How cache, rate limiting, queues and search scale from in-process to Redis
---

How cache, rate limiting, queues and search scale from in-process implementations to Redis lives in the [Chinese page](../../deploy/multi-instance.md).

Operator summary: set `MIRROR_REDIS_ADDR` or `HOARD_REDIS_ADDR` to share cache and rate-limit counters across replicas; switch Hoard queues with `HOARD_QUEUE_DRIVER=asynq` and search with `HOARD_SEARCH_DRIVER=meili`.
