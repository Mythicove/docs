---
title: Mythic Mirror 计划
---

> 仓库：`Mythicove/mythic-mirror`。产品现状与 API 面见[产品参考](../products/mirror.md)，调研结论见[为何自研](../research/why-self-built.md)。

## 核心功能（P0 必做 / P1 应有 / P2 加分）

### P0：最小可用闭环

- Yggdrasil 认证服务：实现 authlib-injector 规范全部端点（见产品参考的 API 清单）。
- 皮肤上传和校验：PNG 尺寸校验（64×32 经典、64×64 标准、HD 2^n），slim 模型识别，披风上传。
- 纹理分发：按 UUID 或用户名拉取 skin 和 cape，构造 base64 `textures` 属性。
- 根 meta 端点加 RSA 签名：`GET /` 暴露 `skinDomains` 与 `signaturePublickey`；对 profile 属性做 RSA 签名（1.19+ 硬性要求）。

### P1：完整皮肤站

- 用户体系：注册、邮箱验证、密码找回、OAuth2（GitHub、QQ 等）、验证码（Turnstile）。
- 3D 预览：`skinview3d` 客户端渲染。
- 2D 头像 API：crafatar 兼容 `/avatar`、`/head`、`/body`（服务端 Go `image/draw` 合成）。
- 管理后台：用户管理、皮肤审核、公告、封禁、存储配额。
- i18n：zh_CN 和 en_US。
- 限流与反滥用：上传配额、带宽限制、认证端点限流。

### P2：社区化

- 皮肤画廊、分享、点赞、标签、评论。
- 作为 OIDC Provider（Zitadel 托管）供 Mythicove 生态其他产品统一登录。
- USM、CSL（CustomSkinLoader）兼容 API。

## 数据模型（草案）

- `users`：id, email, password_hash, nickname, avatar, status, role, created_at
- `players`：uuid（离线 UUID）, name, owner_user_id, skin_id, cape_id, model(default|slim)
- `textures`：id, hash(sha256), type(skin|cape), size, width, height, storage_key, created_at
- `sessions`：auth 会话和 refresh token
- `server_binds`（可选）：join/hasJoined 白名单与 serverId 会话
- `admin_logs`、`reports`、`announcements`

## 里程碑

- M0 骨架：OpenAPI 契约 + Go 骨架（chi/pgx/sqlc）+ Postgres + Docker + CI。
- M1 Yggdrasil 认证：全部认证端点 + RSA 签名密钥对 + meta 端点，用 yggdrasil-mock 和 authlib-injector 联调通过。
- M2 皮肤链路：上传、校验、存储、分发、下载，slim 和 HD 处理。
- M3 用户体系：注册、验证、OAuth、验证码、找回。
- M4 前端：皮肤管理页 + skinview3d 预览 + 2D 头像。
- M5 后台：审核、封禁、公告、配额。
- M6 社区化 + i18n + USM/CSL + Zitadel OIDC（可选）。

## 部署分级（Mirror 视角）

Mirror 不需要搜索组件，分级更简单。全局分级见[部署](../deploy/index.md)。

| 层级 | 规模 | 资源 | 组件（必选到可选） |
|---|---|---|---|
| A | 10～100 | 1× 2C2G | Go 单二进制 + Postgres + 本地盘存储（内建账号、进程内限流） |
| B | 100～1k | 2× 2C4G | Go 多副本 + Postgres + Redis + MinIO/R2（Zitadel 可选、CDN 可选） |
| C | 1k～5k | App 3+ 副本 | Go 无状态多副本 + PG 主读副本 + Redis + S3+CDN（Zitadel 建议） |
| D | 5k～10k+ | K8s+HPA | K8s + PG 高可用 + Redis Cluster + 多区域 S3+CDN + Zitadel HA |

## 风险与待决

- 协议细节：以 authlib-injector 官方文档和 yggdrasil-mock 为参照，逐端点对齐，避免签名和字段命名偏差。
- 签名密钥轮换：密钥对如何存储与轮换，需在 M1 定案（私钥不进仓库、不入前端）。
- 许可证：Elastic License 2.0（ELv2，见 ADR-0004）。
- 皮肤校验边界：透明像素、超长宽（2^n 上限）、文件大小上限的取舍。
- 认证切换成本：内建账号到 Zitadel 的迁移路径要在 `Auth` 接口设计时预留（用户 ID 映射、token 校验切换）。
