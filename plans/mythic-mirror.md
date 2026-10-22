# Mythic Mirror（皮肤站）完整计划

> 仓库：`Mythicove/mythic-mirror`　品牌名：Mythic Mirror（幻镜）　定位：第三方 Minecraft 皮肤站，兼容 Yggdrasil API。

## 1. 定位与目标

为离线模式服务器提供"外置登录 + 自定义皮肤/披风"一站式服务。玩家注册账号、上传皮肤，服务端通过 authlib-injector 对接后，客户端即可加载皮肤。目标是做 **Blessing Skin 的现代化替代**：UI 现代、协议齐全、无 PHP EOL 风险，且从 10 人私服到 10k 公共站都能按需部署。

## 2. 调研结论（为何自研）

| 结论 | 依据 |
|---|---|
| Blessing Skin 是唯一完整开源皮肤站，但卡 PHP 8.1 EOL、UI 丑、更新慢 | `bs-community/blessing-skin-server` 1062★，`composer.json` `php:^8.1`，Laravel 10 |
| 其余都是协议片段/渲染服务，无现代替代 | authlib-injector（客户端）、crafatar（头像渲染）、ghauth（停更）、chrly（Go 皮肤分发，停更） |
| 三个成熟组件可直接复用 | `skinview3d`（3D 预览）、Yggdrasil 规范、crafatar 头像 API 约定 |
| 后端语言选 Go 的理由 | 单二进制、低内存；`elyby/chrly` 已验证 Go 写皮肤系统是顺手的；与 MC 后端工具链同构 |

## 3. 核心功能（P0 必做 / P1 应有 / P2 加分）

### P0 — 最小可用闭环
- **Yggdrasil 认证服务**：实现 authlib-injector 规范全部端点（见 §7）。
- **皮肤上传/校验**：PNG 尺寸校验（64×32 经典 / 64×64 标准 / HD 2^n），slim 模型识别，披风上传。
- **纹理分发**：按 UUID/用户名拉取 skin/cape，构造 base64 `textures` 属性。
- **根 meta 端点 + RSA 签名**：`GET /` 暴露 `skinDomains` 与 `signaturePublickey`；对 profile 属性做 RSA 签名（1.19+ 硬性要求）。

### P1 — 完整皮肤站
- **用户体系**：注册、邮箱验证、密码找回、OAuth2（GitHub/QQ 等）、验证码（Turnstile）。
- **3D 预览**：`skinview3d` 客户端渲染。
- **2D 头像 API**：crafatar 兼容 `/avatar`、`/head`、`/body`（服务端 Go `image/draw` 合成）。
- **管理后台**：用户管理、皮肤审核、公告、封禁、存储配额。
- **i18n**：zh_CN / en_US。
- **限流与反滥用**：上传配额、带宽限制、认证端点限流。

### P2 — 社区化
- 皮肤画廊 / 分享 / 点赞 / 标签 / 评论。
- 作为 OIDC Provider（Zitadel 托管）供 Mythicove 生态其他产品统一登录。
- USM / CSL（CustomSkinLoader）兼容 API。

## 4. 技术栈

| 层 | 选型 |
|---|---|
| 后端 | Go（chi + pgx + sqlc + oapi-codegen） |
| 契约 | OpenAPI 3.1（`openapi-typescript` 生成前端 client） |
| 数据库 | PostgreSQL + goose 迁移 |
| 缓存/限流 | Redis（`Cache`/`RateLimiter` 接口，A 档可进程内） |
| 存储 | `Storage` 接口：local / MinIO / S3 |
| 认证 | 内建 JWT/session（必选）+ Zitadel OIDC（可选） |
| 图片 | Go `image/draw` + `x/image`（校验/重编码/2D 头像） |
| 前端 | Next.js 或 Vite + React |
| 3D 预览 | bs-community/skinview3d |
| 验证码 | Cloudflare Turnstile |
| 部署 | Docker + Caddy（分级见 §9） |

## 5. 架构设计

```
                    ┌─────────────────────────────┐
 Minecraft 客户端 ──▶   authlib-injector (客户端)  ──▶  Yggdrasil API (Go/chi)
                    └─────────────────────────────┘         │
 浏览器/玩家 ──────▶  Web 前端 (Next.js) ──▶  REST (Go/chi) ─┤
                                                             ├─▶ PostgreSQL（账号/纹理元数据）
                                                             ├─▶ Storage 接口（local/MinIO/S3）
                                                             ├─▶ Redis（限流/缓存，可省）
                                                             └─▶ 2D 头像合成（image/draw）
```

模块划分（每模块对应接口，便于替换实现）：
- `auth`：账号、session、验证码；`Auth` 接口（内建 / OIDC-Zitadel）。
- `yggdrasil`：认证端点、`join`/`hasJoined`、name↔UUID 解析。
- `texture`：皮肤/披风上传、校验、模型识别、base64 属性构造与 RSA 签名。
- `render`：2D 头像/预览 API（crafatar 兼容，`image/draw` 合成）。
- `user`：玩家资料、UUID 管理（离线 UUID = `MD5("OfflinePlayer:"+name)` 的 version-3 UUID）。
- `admin`：审核、封禁、公告、配额。
- 横切：`storage`、`cache`、`ratelimit`、`i18n`、`mailer`。

## 6. 数据模型（草案）

- `users`：id, email, password_hash, nickname, avatar, status, role, created_at
- `players`：uuid（离线 UUID）, name, owner_user_id, skin_id, cape_id, model(default|slim)
- `textures`：id, hash(sha256), type(skin|cape), size, width, height, storage_key, created_at
- `sessions`：auth 会话 / refresh token
- `server_binds`（可选）：join/hasJoined 白名单与 serverId 会话
- `admin_logs`、`reports`、`announcements`

## 7. Yggdrasil API 清单（对齐 authlib-injector 规范）

- `GET /` — meta：`{"meta":{...},"skinDomains":["..."],"signaturePublickey":"<PEM base64>"}`
- `POST /authserver/authenticate` — 账号密码换 token + 用户资料
- `POST /authserver/refresh` — 刷新 token
- `POST /authserver/validate` / `POST /authserver/invalidate` / `POST /authserver/signout`
- `POST /sessionserver/session/minecraft/join` — 记录 serverId 会话
- `GET /sessionserver/session/minecraft/hasJoined?username=&serverId=&ip=` — 服务端换取玩家资料
- `GET /sessionserver/session/minecraft/profile/{uuid}?unsigned=false` — 返回带签名的 profile（含 base64 textures）
- `POST /api/profiles/minecraft` — 批量 name→UUID 查询
- 自定义：`GET /skin/{name|uuid}`、`GET /cape/{name|uuid}`、`GET /avatar|/head|/body/{uuid}`（crafatar 兼容）

**关键实现点**：
1. `textures` 属性格式：base64 JSON，含 `textures.SKIN.url`、`textures.CAPE.url`、`metadata.model`（slim），并对整个 value 做 RSA 签名写入 `signature`。
2. 离线 UUID 生成必须与 Mojang 一致：`UUID.nameUUIDFromBytes(("OfflinePlayer:"+name).getBytes(UTF_8))`。
3. HD 皮肤（64×128 及 2^n 倍数）需正确解析第二层纹理。
4. `hasJoined` 是进服热路径：P1 起用 Redis 缓存 profile，减轻 DB 压力。

## 8. 里程碑

- **M0 骨架**：OpenAPI 契约 + Go 骨架（chi/pgx/sqlc）+ Postgres + Docker + CI。
- **M1 Yggdrasil 认证**：全部认证端点 + RSA 签名密钥对 + meta 端点，用 yggdrasil-mock/authlib-injector 联调通过。
- **M2 皮肤链路**：上传 → 校验 → 存储 → 分发 → 下载，slim/HD 处理。
- **M3 用户体系**：注册/验证/OAuth/验证码/找回。
- **M4 前端**：皮肤管理页 + skinview3d 预览 + 2D 头像。
- **M5 后台**：审核/封禁/公告/配额。
- **M6 社区化 + i18n + USM/CSL + Zitadel OIDC（可选）。

## 9. 部署分级（Mirror 视角，详见 PLAN.md §6）

Mirror 不需要搜索组件，分级更简单：

| 层级 | 规模 | 资源 | 组件（必选 → 可选） |
|---|---|---|---|
| A | 10–100 | 1× 2C2G | Go 单二进制 + Postgres + 本地盘存储（内建账号、进程内限流） |
| B | 100–1k | 2× 2C4G | Go 多副本 + Postgres + Redis + MinIO/R2（Zitadel 可选、CDN 可选） |
| C | 1k–5k | App 3+ 副本 | Go 无状态多副本 + PG 主读副本 + Redis + S3+CDN（Zitadel 建议） |
| D | 5k–10k+ | K8s+HPA | K8s + PG 高可用 + Redis Cluster + 多区域 S3+CDN + Zitadel HA |

## 10. 风险与待决

- **协议细节**：以 `authlib-injector` 官方文档 + `yggdrasil-mock` 为参照，逐端点对齐，避免签名/字段命名偏差。
- **签名密钥轮换**：密钥对如何存储与轮换，需在 M1 定案（私钥不进仓库/不入前端）。
- **许可证**：AGPL vs MIT，开工前确认。
- **皮肤校验边界**：透明像素、超长宽（2^n 上限）、文件大小上限的取舍。
- **认证切换成本**：内建账号 → Zitadel 的迁移路径要在 `Auth` 接口设计时预留（用户 ID 映射、token 校验切换）。
