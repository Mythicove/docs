---
title: Mythic Hoard 计划
---

> 仓库：`Mythicove/mythic-hoard`。产品现状与 API 面见[产品参考](../products/hoard.md)，调研结论见[为何自研](../research/why-self-built.md)。

## 核心功能（P0 / P1 / P2）

### P0：最小可用

- Project、Version、File 三级模型加下载。
- Modrinth 兼容 API 子集（`/v2/*`，见产品参考的 API 清单）。
- `.mrpack` 整合包：生成加解析（`modrinth.index.json`）。
- 存储：S3 加 CDN 直出，文件哈希（SHA-1、SHA-512）与去重。

### P1：完整平台

- 搜索（Meilisearch：全文、分类、loader、版本 facets；A 档用 `pg_trgm`）。
- 上行镜像和代理：从 Modrinth 和 CurseForge API 拉取并代理分发（冷启动内容）。
- 账号、组织、团队：成员、权限、API Token。
- 上传与审核：版本发布、校验、审核队列、撤回。
- 依赖关系：mod 间 required、optional、incompatible 依赖。
- 下载统计、浏览统计、排行榜。

### P2：生态增强

- 依赖注入式整合包构建器（对接 packwiz 工作流）。
- 与服务端（Mythic Isles）联动的一键部署。
- 评论、评分、举报、标签体系、RSS 和更新通知 Webhook。

## 数据模型（草案）

- `projects`：id, slug, title, description, body, project_type(mod|modpack|resourcepack|...), client_side, server_side, status, downloads, followers, published_at
- `versions`：id, project_id, version_number, changelog, dependencies(required/optional/incompatible), game_versions, loaders, date_published, featured
- `files`：id, version_id, filename, size, sha1, sha512, url, primary
- `loaders`、`game_versions`、`categories`、`tags`
- `teams`、`team_members`、`organizations`
- `users`（共享账号体系）、`api_tokens`
- `reviews`、`reports`、`download_events`

## 里程碑

- M0 骨架：OpenAPI 契约 + Go 骨架（chi/pgx/sqlc）+ Postgres + Docker + CI。
- M1 项目/版本/文件加下载：三级模型 + S3 直出 + 哈希去重。
- M2 Modrinth 只读兼容：`/v2/search` 加项目/版本详情加下载，用 packwiz 和 ferium 联调通过。
- M3 搜索：`Search` 接口双实现（`pg_trgm` 起步加 Meilisearch），facets 加分类加 loader。
- M4 账号、组织、Token 加上传和审核。
- M5 `.mrpack` 加上游镜像代理（asynq 队列）。
- M6 统计、排行、社区加与 Isles 联动。

## 部署分级（Hoard 视角）

全局分级见[部署](../deploy/index.md)。

| 层级 | 规模 | 资源 | 组件（必选到可选） |
|---|---|---|---|
| A | 10～100 | 1× 2C2G | Go 单二进制 + Postgres + 本地盘存储（`pg_trgm` 搜索、内联队列、内建账号） |
| B | 100～1k | 2× 2C4G | Go 多副本 + Postgres + Redis + MinIO/R2 加 Meilisearch（Zitadel 可选、asynq 可选、CDN 可选） |
| C | 1k～5k | App 3+ 副本 | Go 无状态多副本 + PG 主读副本 + Redis + Meili + S3+CDN + asynq（Zitadel 建议） |
| D | 5k～10k+ | K8s+HPA | K8s + PG 高可用 + Redis Cluster + Meili 集群 + 多区域 S3+CDN + Zitadel HA |

与 Mirror 的分级差异：搜索（Meili）是 Hoard 独有，B 起必选；其余组件与 Mirror 共享同一套接口与部署语义。

## 风险与待决

- Modrinth API 漂移：跟随其开放文档持续对齐；锁定一个目标版本作为兼容基线。
- 版权和合规：镜像代理与用户上传需处理 DMCA 和举报下架，P1 必须设计审核队列。
- 带宽成本：CDN 与存储成本控制，考虑按需回源加缓存。
- 许可证：Elastic License 2.0（ELv2），禁止将本产品作为托管服务向第三方牟利（见 ADR-0004）。
- 冷启动内容：上游镜像是否合规、是否默认开启，需尽早决策。
- 搜索降级一致性：`pg_trgm` 到 Meilisearch 切换时索引重建与查询行为差异，需在 `Search` 接口用契约测试锁定。
