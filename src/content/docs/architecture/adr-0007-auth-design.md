---
title: ADR-0007 认证设计
---

- 状态：已接受
- 日期：2026-10-22

## 背景

`shared/auth` 已定义 `Auth` 接口（`Authenticate`/`Validate`/`Refresh`/`SignOut`，token 为不透明字符串）。需确定 token 形态、口令哈希、会话存储与 Web 前端登录方案。

## 决策

- **Yggdrasil/API token 用不透明随机串，不用 JWT**：`authenticate` 返回 `accessToken` + `clientToken`；服务端会话存 Postgres（`sessions` 表），`validate`/`refresh`/`join` 均查服务端状态，撤销即时生效。
- **refresh 轮换**：`Refresh` 校验 `clientToken` 绑定，换发新 `accessToken` 并轮换 refresh token。
- **口令哈希 Argon2id**（不用 bcrypt/PBKDF2）。
- **Web 前端**用 httpOnly session cookie（独立于 Yggdrasil token）；**Hoard 程序化上传**用不透明 API token（`api_tokens` 表）。
- **Zitadel/OIDC 可选替换** `Authenticate` 的数据源，但保持同一 `Auth` 接口与 token 语义。

> 2026-10-27 修订：本 ADR 写就时全站只有一个口令凭据、一个 `Authenticate` 原语。
> [ADR-0012](./adr-0012-credential-separation.md) 把它拆成"网站主密码"与"启动器按玩家发放的独立密码"两条互不相通的校验路径，
> 并规定网站会话不再代表任何玩家。token 形态（不透明随机串 + 服务端会话 + 即时撤销）不变。

## 后果

- 正：可撤销、语义贴近 Mojang（clientToken 绑定客户端）。
- 负：`hasJoined` 热路径每次查会话，需 Redis 缓存（ADR-0003 已预留）。
