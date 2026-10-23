---
title: ADR-0010 OIDC Provider 与登录方式注册表
---

- 状态：已接受
- 日期：2026-10-23

## 背景

皮肤站（Mirror）需要同时扮演两个角色：为玩家提供多种登录方式（密码 + 第三方 OAuth），以及作为 OIDC Provider 供 Mythicove 生态其他产品（Compass 启动器等）统一登录。需确定两者如何落地，避免引入不必要的外部组件。

## 决策

- **登录方式注册表**：`GET /api/login-methods` 返回按序启用的登录方式（`password` + 已配置的 OAuth provider），管理员经 `PUT /api/admin/login-methods` 持久化顺序与开关（存 `settings` 表）。前端据此动态渲染登录按钮，无需改前端代码即可增删 provider。
- **OIDC Provider 用 Ory Fosite**（`compose` 组装），启用授权码 + PKCE、`client_credentials`、`refresh_token`、`openid`（ID token RS256 签名，复用 ADR-0008 的 RSA 密钥）。单实例用 `storage.MemoryStore` 存 token，客户端存 `settings`（`oauth_clients` JSON），多实例时替换为分布式存储即可，不改业务代码。
- **客户端密钥**：public 客户端走 PKCE（Compass 用），confidential 客户端密钥 sha256 存储，自实现 `Hasher` 常量时间比较。
- **授权端登录会话**：OIDC `/oauth2/auth` 用 httpOnly cookie（存 Yggdrasil session token），登录页由 API 域直接渲染，规避跨域 cookie 问题。

## 后果

- 正：一套 Fosite 覆盖 SSO，无需 Zitadel；客户端管理经 `/api/admin/oauth-clients`；能力分层（token 存储、密钥）保留替换点。
- 负：单实例内存 token 存储重启即失效；多实例需补 SQL/Redis 存储（已预留 `fosite.Storage` 接口）。
