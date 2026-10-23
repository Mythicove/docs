---
title: ADR-0005 共享 Go 代码组织
---

- 状态：已接受
- 日期：2026-10-22

## 背景

多个产品（mirror/hoard，后续 isles/atlas/compass）需要共享能力接口（auth/storage/search/cache/ratelimit/queue/mailer）与领域类型（离线 UUID、纹理等）。需决定共享代码放哪，以及多仓库如何协作。

## 决策

- **独立共享模块仓库 `Mythicove/shared`**（module `github.com/Mythicove/shared`），只放**接口与纯领域类型，不放具体实现**。
- 各产品仓库以 Go module 依赖 `shared`；**联调期用 Go workspace（`go.work`）关联本地 checkout**，免打 tag。
- 具体实现（内建 auth、MinIO/S3、Redis、Meilisearch、asynq 等）后续放各产品仓库或 `shared` 的 `impl/` 子包，按需演进。

## 理由

- 产品矩阵是确定的多仓库（已建 mirror/hoard/api/docs），monorepo 与现有布局冲突。
- 接口集中一处，避免各产品各自为政、重复造轮子；`go.work` 解决跨仓库开发摩擦。

## 后果

- 正：共享接口单一来源；产品仓库保持精简。
- 负：`shared` 改动会影响所有下游，需版本纪律 + 契约测试。
- 待定：具体实现（尤其 auth 的 Zitadel 适配）落位在 `shared/impl` 还是独立仓库，M1 时定。
