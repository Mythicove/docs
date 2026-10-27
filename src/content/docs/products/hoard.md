---
title: Mythic Hoard（Mod 托管）
---

> 仓库：`Mythicove/mythic-hoard`　品牌名：Mythic Hoard（秘藏）　定位：源码可得的 Minecraft Mod 托管/分发平台，Modrinth 兼容。

## 定位与目标

提供模组（Mod）、资源包（Resourcepack）、数据包（Datapack）、着色器（Shader）、插件（Plugin）与整合包（Modpack）的托管、搜索、版本管理与分发。核心差异化是 API 与 `.mrpack` 格式对齐 Modrinth，让 Prism Launcher、ferium、packwiz、Pakku、ATLauncher 等现成客户端零成本接入。按 10 到 10k 用户分级部署，搜索、队列、账号中心均可选配。

## 技术栈

| 层 | 选型 |
|---|---|
| 后端 | Go（chi + pgx + sqlc） |
| 契约 | OpenAPI 3.1（`openapi-typescript` 生成 TS client；Go 侧手写，漂移测试保证 spec 与路由一致） |
| 数据库 | PostgreSQL + goose 迁移 |
| 搜索 | Meilisearch（`Search` 接口，A 档 `pg_trgm`） |
| 存储 | `Storage` 接口：local / MinIO / S3 + CDN |
| 认证 | OIDC RP（Mirror 为 IdP）+ 会话 cookie `hoard_session` + `mhp_` PAT |
| 任务队列 | asynq（`Queue` 接口，A 档内联） |
| 前端 | Next.js 或 Vite + React |
| 限流 | Redis（`RateLimiter` 接口） |
| 部署 | Docker + Caddy（分级见[计划](/plans/hoard/)） |

## 架构设计

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
- `ingest`：上游镜像代理（Modrinth/CF，规划中，未开放）。
- `pack`：`.mrpack` 生成与解析。
- `org`：组织、团队、成员、权限。
- `review`：审核队列、举报、合规。
- `stats`：下载/浏览统计。
- 横切：`auth`、`storage`、`queue`、`ratelimit`、`i18n`、`mailer`。

## Modrinth 兼容 API 清单（子集，逐步对齐）

已开放：

- `GET /v2/search`：全文加 facets（categories、versions、license、project_type、loaders）
- `GET /v2/project/{id}`、`GET /v2/project/{id}/version`、`GET /v2/project/{id}/dependencies`、`GET /v2/version/{id}`
- `GET /v2/project/{id}/version/{vid}/mrpack`：`.mrpack` 导出（含 `modrinth.index.json`）
- `GET /v2/tag/{loader,game_version,category}`：元数据列表
- 下载走本站路由：`/api/mods/{id}/download`、`/api/mods/{id}/version/{vid}/file/{fid}`（S3 直出）
- 身份与团队走本站路由：`GET /auth/me`、`POST /api/team`、`GET /api/user/teams` 等，完整清单见仓库 README

规划中（未开放，按需对齐）：批量查询 `/v2/projects?ids=[]`、`/v2/versions?ids=[]`、`/v2/version_files`、`/v2/version_file/{hash}`、`/v2/user`、`/v2/team/*`、`POST /v2/organization`，以及 `/cdn/data` 下载路径。

关键实现点：

1. 先做"只读加下载"子集即可被启动器消费，写操作（上传、组织）后续迭代。
2. 保持 JSON 字段名与 Modrinth 完全一致，避免客户端解析失败。
3. `.mrpack` 内 `files[].downloads[]` 指向本平台下载 URL，支持多源回退。
4. 下载和浏览统计走 `Queue`（内联到 asynq），异步聚合，不阻塞主请求。

## 相关文档

- 计划：[Mythic Hoard 计划](/plans/hoard/)（功能分级、数据模型草案、里程碑、部署分级、风险）
- 调研：[为何自研](/research/why-self-built/)
- 部署：[部署](/deploy/)
