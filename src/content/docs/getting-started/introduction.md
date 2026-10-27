---
title: Mythicove 生态总规划
---

> 品牌：**Mythicove** = Mythic（神话）+ Cove（港湾）。
> 面向离线服 / 私服 / 模组服玩家的 Minecraft 生态套件（产品源码可得），所有产品共享同一隐喻（航海/港湾）、同一技术栈与同一套基础设施。

## 1. 愿景

从零构建一套现代化、UI 美观、长期可维护的 Minecraft 玩家生态，替代老化（Blessing Skin 卡在 PHP 8.1 EOL）、闭源（CurseForge）、停更或改许可证（Modrinth 转为 source-available）的现有方案。

核心原则：
- **许可证先行**：一开始就定清楚（见下），产品源码可得（ELv2，非 OSI 开源），契约与文档宽松许可。
- **协议对齐**：复用 Minecraft 圈事实标准（Yggdrasil API、Modrinth API、`.mrpack`、crafatar），不做孤岛。
- **现代化技术栈**：Go 后端 + TypeScript 前端，摆脱 PHP EOL 风险，单二进制自托管友好。
- **按规模部署**：从 10 人私服到 10k 公共平台给分级资源方案，组件可增可选（见 §6）。
- **UI 是一等公民**：直接解决"Blessing Skin 丑"这个核心痛点。

## 2. 产品矩阵与命名

统一「航海/港湾」隐喻 + `Mythic + 名词` 家族命名，仓库一律 kebab-case、不带 `Open` 前缀。

| 产品 | 品牌名 | 中文名 | 仓库 | 状态 |
|---|---|---|---|---|
| 皮肤站 | **Mythic Mirror** | 幻镜 | `mythic-mirror` | 已建仓，计划完成 |
| Mod 托管 | **Mythic Hoard** | 秘藏 | `mythic-hoard` | 已建仓，计划完成 |
| 服务器/开服 | **Mythic Isles** | 群岛 | `mythic-isles` | 未建仓 |
| 整合包 | **Mythic Atlas** | 舆图 | `mythic-atlas` | 未建仓 |
| 启动器 | **Mythic Compass** | 罗盘 | `mythic-compass` | 未建仓 |

一句话故事：**从罗盘（Compass）启航，经群岛（Isles）靠岸，用幻镜（Mirror）装扮身份，从秘藏（Hoard）取模组，翻舆图（Atlas）找整合包。**

## 3. 共享技术决策

| 维度 | 决策 | 理由 |
|---|---|---|
| 后端语言 | **Go**（1.24+） | 单二进制、低内存、高并发，自托管友好；MC 后端生态（chrly/go-mc/packwiz/mrpack-install）同为 Go |
| 后端框架 | **chi** 路由 + **pgx** 连接池 + **sqlc**（编译期类型 SQL） | 克制、无 ORM 魔法、boring but proven |
| 迁移 | **goose**（或 atlas） | 版本化 schema，跟随代码 |
| API 契约 | **OpenAPI 3.1 优先**：`oapi-codegen` 生成 Go server，`openapi-typescript` 生成 TS client | 前后端类型一致锁死，把"两语言"成本压到零 |
| 校验 | go-playground/validator | 请求体校验 |
| 数据库 | **PostgreSQL** | 关系模型 + 长期稳定 + 读副本预留 |
| 缓存/限流 | **Redis**（go-redis），低档可降级进程内 | 热缓存 + 认证/下载限流 |
| 搜索（Hoard） | **Meilisearch**，低档降级 `pg_trgm` | Modrinth 同款，中文分词友好 |
| 队列（Hoard） | **asynq**（Redis），低档降级内联 | 镜像/索引/统计异步 |
| 存储 | **S3 兼容**（接口抽象：local / MinIO / R2 / OSS）+ CDN | 文件直出，可自托管无锁定 |
| 认证 | **内建 JWT/session（必选）** + **Ory Fosite / Zitadel OIDC（可选）** | 账号按规模渐进，SSO 可后挂，不强制引入 |
| 前端 | **Next.js / Vite + React**，`skinview3d` | 渲染/UI 仍归 TS |
| 图片（Mirror） | Go `image/draw` + `golang.org/x/image` | PNG 校验/2D 头像合成，替代 sharp |
| 验证码 | Cloudflare Turnstile | 免维护 |
| 部署 | Docker Compose（小）→ K8s（大） | 见 §6 |

**许可证策略**（Modrinth 前车之鉴）：
- `mythic-hoard`（Mod 托管）：**Elastic License 2.0（ELv2）**，禁止他人托管牟利。
- `mythic-mirror`（皮肤站）：**Elastic License 2.0（ELv2）**，与 hoard 一致。

理念、边界与预期用法 FAQ 见[许可政策](/community/licensing/)，选型论证见 [ADR-0004](/architecture/adr-0004-license/)。

## 4. 目录结构

```
Mythicove/                          # 本地 workspace 根
├── docs/                           # 文档仓库（Mythicove/docs）
│   ├── README.md                   # 文档索引与约定
│   ├── plans/
│   │   ├── overview.md             # 本文件：生态总览
│   │   ├── mythic-mirror.md        # 皮肤站完整计划
│   │   └── mythic-hoard.md         # Mod 托管完整计划
│   └── architecture/               # ADR（后续按需扩展）
├── api/                            # OpenAPI 契约仓库（Mythicove/api）
├── mythic-mirror/                  # 皮肤站仓库
└── mythic-hoard/                   # Mod 托管仓库
```

> 文档统一进 `docs/` 仓库；API 契约进 `api/` 仓库；产品仓库只放与代码强绑定的 `README`/`CONTRIBUTING`/`CHANGELOG`。

## 5. 能力分层（组件可替换——部署分级的前提）

每一个外部组件都藏在 Go 接口后面，部署者按规模选择实现，**不改业务代码**：

| 能力 | 接口 | 低档实现 | 高档实现 |
|---|---|---|---|
| 存储 | `Storage` | 本地磁盘 | MinIO → S3（R2/OSS） |
| 搜索（Hoard） | `Search` | PostgreSQL `pg_trgm` | Meilisearch |
| 缓存 | `Cache` | 进程内内存 | Redis |
| 限流 | `Limiter` | 进程内固定窗口（`ratelimit.Memory`，已内置） | Redis（待实现） |
| 客户端 IP | `clientip.Resolver` | 可信代理感知解析（头序/可信网段可配，已内置） | — |
| 队列（Hoard） | `Queue` | 内联执行 | asynq（Redis） |
| 邮件 | `Mailer` | SMTP | 服务商 API |

> 认证不走 shared 抽象接口：Yggdrasil 会话与 OIDC Provider 直接在 `mythic-mirror` 内实现（见 ADR-0007 / ADR-0010），跨产品统一登录靠 OIDC 协议而非共享 Go 接口。原先的 `shared/auth` 接口是无人引用的死代码，已移除。

> 这就是"Zitadel 可选、Meili 可选、Redis 可选"的架构保证：**小部署单二进制 + Postgres 即可跑，大部署无痛切到完整全家桶。**

## 6. 部署分级（10 → 10k 用户）

| 层级 | 目标规模 | 资源 | 必选组件 | 可选/推荐组件 | 部署方式 |
|---|---|---|---|---|---|
| **A** | 10–100（个人/小私服） | 1× 2C2G VPS | Go 单二进制 + PostgreSQL + 本地/磁盘存储 | — | `docker compose up -d` |
| **B** | 100–1k（小社区） | 2× 2C4G（或 1× 4C8G） | Go（多副本）+ PostgreSQL + Redis + MinIO/R2 | Meilisearch（Hoard）、Zitadel（需 SSO 时）、CDN 免费层、asynq | Compose 单机 / 双机 |
| **C** | 1k–5k（中型社区） | App 3+ 副本 + 独立 DB/Redis/Meili | Go 无状态多副本 + PG 主读副本 + Redis + Meili + **S3+CDN** | **Zitadel**（多产品统一登录，建议）、asynq、Prometheus/Grafana | K8s 或 Compose + 反代 |
| **D** | 5k–10k+（公共平台） | K8s 集群 + HPA | K8s + HPA + PG 高可用（Patroni/托管）+ Redis Cluster + Meili 集群 + 多区域 S3+CDN | Zitadel HA、完整可观测性、备份/灾备/审计 | K8s（Helm） |

**分级要点**：
- **Zitadel 从 A 到 D 都是可选**：A/B 用内建账号；到 C 起若要多产品 SSO 再挂 Zitadel。
- **Meilisearch 仅 Hoard 需要**，Mirror 永远不装；Hoard 在 A 用 `pg_trgm`，B 起才上 Meili。
- **Redis 在 A 可省**（进程内限流/缓存），B 起必选。
- **存储 A 用本地盘，B 起 MinIO/R2**；**CDN 在 C 起必选**（带宽大头）。
- 无状态 Go 应用 + 接口分层，让 A→D 是**加资源/换实现**而非改代码。

## 7. 开发顺序（建议）

1. **Mythic Mirror** 先行：体量小、协议边界清晰（Yggdrasil），先打通"认证 + 皮肤分发"最小闭环，并沉淀能力分层（Storage/Auth/Cache 接口）。
2. **Mythic Hoard**：复用 Mirror 沉淀的共享模块（账号、存储、限流、i18n、后台框架）与 OpenAPI 契约体系。
3. 二者收敛出 **Mythicove 公共 SDK/服务**（账号、存储、审核、通知）。
4. 再上 Isles（开服）/ Atlas（整合包）/ Compass（启动器）。

## 8. 共享基础设施清单（跨产品复用）

- 账号体系（内建注册/登录/邮箱验证 + 可选 OIDC/Zitadel 统一登录 + 2FA）
- 对象存储抽象 + 直出 URL 签名（local/MinIO/S3 可切换）
- 审核/举报队列（皮肤与模组通用）
- 通知（邮件/站内/Webhook）
- 后台管理框架（RBAC）
- 限流与反滥用（配额、带宽、IP 信誉）
- i18n 框架（zh_CN / en_US 起步）
- 遥测与日志
