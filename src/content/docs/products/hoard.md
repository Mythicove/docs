---
title: Mythic Hoard（Mod 托管）完整计划
---

> 仓库：`Mythicove/mythic-hoard`　品牌名：Mythic Hoard（秘藏）　定位：开源 Minecraft Mod 托管/分发平台，Modrinth 兼容。

## 1. 定位与目标

提供模组（Mod）、资源包（Resourcepack）、数据包（Datapack）、着色器（Shader）、插件（Plugin）与整合包（Modpack）的托管、搜索、版本管理与分发。核心差异化：**API 与 `.mrpack` 格式对齐 Modrinth**，让 Prism Launcher / ferium / packwiz / Pakku / ATLauncher 等现成客户端零成本接入。按 10 → 10k 用户分级部署，搜索/队列/账号中心均可选配。

## 2. 调研结论（为何自研）

| 结论 | 依据 |
|---|---|
| Modrinth 是唯一生产级开源 Mod 托管，但 2024 改许可证为 source-available | `modrinth/code` 2466★，Rust+TS/Vue，许可证 `Other`（非 OSI 开源）；旧 `labrinth`/`knossos` 已 archive |
| CurseForge 闭源，API 需 key 且受限 | 社区靠 furse/cfproxy/curserinth 等 wrapper 反向对接 |
| 无现代可 fork 的开源替代 | TechnicSolder（PHP/MIT，老）、SKCraft/Launcher（Java，私服向）、AutoModpack/HOPPER（仅同步） |
| 工具链可复用 | packwiz（Go/MIT，1026★）是整合包打包事实标准 |
| 后端语言选 Go 的理由 | 与 packwiz/mrpack-install/mcman 等 MC 分发工具链同构；低内存适合多实例自托管 |

## 3. 核心功能（P0 / P1 / P2）

### P0 — 最小可用
- **Project → Version → File 三级模型** + 下载。
- **Modrinth 兼容 API 子集**（`/v2/*`，见 §7）。
- **`.mrpack` 整合包**：生成 + 解析（`modrinth.index.json`）。
- **存储**：S3 + CDN 直出，文件哈希（SHA-1/SHA-512）与去重。

### P1 — 完整平台
- **搜索**（Meilisearch：全文、分类、loader、版本 facets；A 档用 `pg_trgm`）。
- **上行镜像/代理**：从 Modrinth / CurseForge API 拉取并代理分发（冷启动内容）。
- **账号/组织/团队**：成员、权限、API Token。
- **上传与审核**：版本发布、校验、审核队列、撤回。
- **依赖关系**：mod 间 required/optional/incompatible 依赖。
- **下载统计**、浏览统计、排行榜。

### P2 — 生态增强
- 依赖注入式整合包构建器（对接 packwiz 工作流）。
- 与服务端（Mythic Isles）联动的一键部署。
- 评论/评分/举报、标签体系、RSS/更新通知 Webhook。

## 4. 技术栈

| 层 | 选型 |
|---|---|
| 后端 | Go（chi + pgx + sqlc + oapi-codegen） |
| 契约 | OpenAPI 3.1（`openapi-typescript` 生成前端 client） |
| 数据库 | PostgreSQL + goose 迁移 |
| 搜索 | Meilisearch（`Search` 接口，A 档 `pg_trgm`） |
| 存储 | `Storage` 接口：local / MinIO / S3 + CDN |
| 认证 | 内建 JWT/session（必选）+ Zitadel OIDC（可选） |
| 任务队列 | asynq（`Queue` 接口，A 档内联） |
| 前端 | Next.js 或 Vite + React |
| 限流 | Redis（`RateLimiter` 接口） |
| 部署 | Docker + Caddy（分级见 §9） |

## 5. 架构设计

```
 启动器/工具 (Prism/ferium/packwiz/Pakku) ──▶ Modrinth 兼容 API (/v2/*)
                                                   │
 浏览器 ──▶ 前端 (Next.js) ──▶ REST (Go/chi) ─────┤
                                                   ├─▶ PostgreSQL（项目/版本/用户）
                                                   ├─▶ Search 接口（pg_trgm / Meilisearch）
                                                   ├─▶ Storage 接口（local/MinIO/S3）+ CDN
                                                   ├─▶ Redis（限流/缓存，可省）
                                                   └─▶ 上游：Modrinth / CurseForge API（镜像代理）
 任务队列 (Queue 接口：内联 / asynq) ──▶ 索引/镜像/统计聚合
```

模块划分（每模块对应接口，便于替换实现）：
- `project`：项目/版本/文件、loader/分类/标签、依赖。
- `search`：`Search` 接口（Postgres `pg_trgm` / Meilisearch）与 facets。
- `ingest`：上游镜像代理（Modrinth/CF）。
- `pack`：`.mrpack` 生成与解析。
- `org`：组织、团队、成员、权限。
- `review`：审核队列、举报、合规。
- `stats`：下载/浏览统计。
- 横切：`auth`、`storage`、`queue`、`ratelimit`、`i18n`、`mailer`。

## 6. 数据模型（草案）

- `projects`：id, slug, title, description, body, project_type(mod|modpack|resourcepack|...), client_side, server_side, status, downloads, followers, published_at
- `versions`：id, project_id, version_number, changelog, dependencies(required/optional/incompatible), game_versions, loaders, date_published, featured
- `files`：id, version_id, filename, size, sha1, sha512, url, primary
- `loaders`、`game_versions`、`categories`、`tags`
- `teams`、`team_members`、`organizations`
- `users`（共享账号体系）、`api_tokens`
- `reviews`、`reports`、`download_events`

## 7. Modrinth 兼容 API 清单（子集，逐步对齐）

- `GET /v2/search` — 全文 + facets（categories、versions、license、project_type、loaders）
- `GET /v2/project/{id|slug}` / `GET /v2/projects?ids=[]`
- `GET /v2/project/{id}/version` / `GET /v2/version/{id}` / `GET /v2/versions?ids=[]`
- `GET /v2/version_files` / `GET /v2/version_file/{hash}`
- `GET /v2/tag/*`、`GET /v2/category`、`GET /v2/loader`、`GET /v2/project/{id}/dependencies`
- `GET /v2/user`、`GET /v2/users?ids=[]`、`GET /v2/team/*`、`POST /v2/organization`
- 下载：`/cdn/data/{project}/{version}/{file}`（S3 直出）
- `.mrpack` 导出：`GET /v2/project/{id}/version/{vid}/mrpack`（含 `modrinth.index.json`）

**关键实现点**：
1. 先做"只读 + 下载"子集即可被启动器消费，写操作（上传/组织）后续迭代。
2. 保持 JSON 字段名与 Modrinth 完全一致，避免客户端解析失败。
3. `.mrpack` 内 `files[].downloads[]` 指向本平台下载 URL，支持多源回退。
4. 下载/浏览统计走 `Queue`（内联 → asynq），异步聚合，不阻塞主请求。

## 8. 里程碑

- **M0 骨架**：OpenAPI 契约 + Go 骨架（chi/pgx/sqlc）+ Postgres + Docker + CI。
- **M1 项目/版本/文件 + 下载**：三级模型 + S3 直出 + 哈希去重。
- **M2 Modrinth 只读兼容**：`/v2/search` + 项目/版本详情 + 下载，用 packwiz/ferium 联调通过。
- **M3 搜索**：`Search` 接口双实现（`pg_trgm` 起步 + Meilisearch），facets + 分类 + loader。
- **M4 账号/组织/Token + 上传/审核**。
- **M5 `.mrpack` + 上游镜像代理**（asynq 队列）。
- **M6 统计/排行/社区 + 与 Isles 联动**。

## 9. 部署分级（Hoard 视角，详见 PLAN.md §6）

| 层级 | 规模 | 资源 | 组件（必选 → 可选） |
|---|---|---|---|
| A | 10–100 | 1× 2C2G | Go 单二进制 + Postgres + 本地盘存储（`pg_trgm` 搜索、内联队列、内建账号） |
| B | 100–1k | 2× 2C4G | Go 多副本 + Postgres + Redis + MinIO/R2 + **Meilisearch**（Zitadel 可选、asynq 可选、CDN 可选） |
| C | 1k–5k | App 3+ 副本 | Go 无状态多副本 + PG 主读副本 + Redis + Meili + **S3+CDN** + asynq（Zitadel 建议） |
| D | 5k–10k+ | K8s+HPA | K8s + PG 高可用 + Redis Cluster + Meili 集群 + 多区域 S3+CDN + Zitadel HA |

> 与 Mirror 的分级差异：**搜索（Meili）是 Hoard 独有**，B 起必选；其余组件与 Mirror 共享同一套接口与部署语义。

## 10. 风险与待决

- **Modrinth API 漂移**：跟随其开放文档持续对齐；锁定一个目标版本作为兼容基线。
- **版权/合规**：镜像代理与用户上传需处理 DMCA/举报下架，P1 必须设计审核队列。
- **带宽成本**：CDN 与存储成本控制，考虑按需回源 + 缓存。
- **许可证**：定为 **AGPL-3.0**（防闭源竞品）。
- **冷启动内容**：上游镜像是否合规、是否默认开启，需尽早决策。
- **搜索降级一致性**：`pg_trgm` → Meilisearch 切换时索引重建与查询行为差异，需在 `Search` 接口用契约测试锁定。
