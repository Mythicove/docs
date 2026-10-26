---
title: ADR-0011 身份架构：Mirror 为唯一 IdP，其余产品做 OIDC RP + 投影表
---

- 状态：已接受
- 日期：2026-10-26

## 背景

Mythicove 有多个需要"知道用户是谁"的产品：Mirror（皮肤站/账号体系）、Hoard（mod 分发，需团队与上传权限）、Compass（启动器）。若各产品各自维护账号，就会出现多套密码、多套邮箱验证、多套封禁状态，且用户在不同产品里的身份无法关联。需要一个身份架构，既能统一登录，又不让每个产品都背上账号安全面（密码存储、邮件、找回、防撞库）。

同时有一个部署现实：小群体自用时希望"一条 `docker compose up` 起全套"，允许 Mirror 与 Hoard 共用同一个 Postgres 实例；但两者的表名（`users`/`sessions`/`files`）天然会撞。

## 决策

- **Mirror 是唯一身份提供方（IdP）**：账号、密码（Argon2id）、邮箱验证、找回、封禁、第三方 OAuth 绑定、OIDC Provider（ADR-0010）全部只在 Mirror。其它产品**不存密码、不发邮件**，账号安全面为零。
- **其余产品作 OIDC RP + 本地投影表**：Hoard 用授权码流登录 Mirror，从 ID token 的 claims（`sub`/`username`/`email`）upsert 出自己的 `users` 投影行，不做手工同步、不建定时拉取。会话是 Hoard 自签的 httpOnly cookie（`hoard_session`，7 天，服务端可撤销），不转存 Mirror 的 token。
- **关联键 = OIDC `sub`**（即 Mirror `users.id` 的字符串形式）。**跨服务不建外键**，即使同库也不建——外键会把两个独立可部署的产品耦成必须同时迁移。
- **同库必须 schema 隔离**：Hoard 的对象全部落在 `hoard` schema（DSN 带 `options=-csearch_path=hoard`，migration 00001 里 `CREATE SCHEMA IF NOT EXISTS hoard`）。这样"共用一个 Postgres 实例"只是部署便利，不构成表级共享。
- **权限不隐式继承**：Hoard 自管角色（`role=user|admin`），来源是本站提升或 `HOARD_ADMIN_SUBJECTS` 白名单在登录时幂等映射，**不读 Mirror 的 role**。Mirror 的管理员不自动成为 mod 站管理员（两者的管理面语义不同）。`HOARD_ADMIN_TOKEN` 保留为 bootstrap/救援通道，与用户体系并存。
- **产品级授权用 PAT 而非会话**：脚本/CI 上传走 `mhp_` 前缀的个人访问令牌（sha256 存储、声明 scopes、有效期、last_used），上传要求 `UPLOAD` scope。会话只服务浏览器。
- **issuer 分离视界**：`HOARD_OIDC_ISSUER` 必须是浏览器面地址且与 Mirror 的 `MIRROR_BASE_URL` 完全一致（`iss` 校验），容器内访问发现/令牌端点用 `HOARD_OIDC_INTERNAL_BASE_URL`。二者不可互换。
- **不抽公共账号 library**：唯一值得重新考虑的情形是"mod 站必须单二进制、无 Mirror 也能跑"；当前不接受该约束，故不把 Mirror 的账号核心抽成模块（也不进 `shared`——`shared` 只放接口与零依赖实现，ADR-0005）。

## 后果

- 正：
  - 一套登录覆盖全生态；新产品接入只需注册一个 OIDC client + 一张投影表，不碰密码学。
  - 账号安全面集中在 Mirror 一处，加固（限流、验证码、审计、封禁）只需做一次。
  - 同库/分库、单副本/多副本都是部署选择，不改业务代码；换 Zitadel 等外部 IdP 只改 issuer 配置（C/D 档能力分层，ADR-0003）。
  - 无跨服务外键 ⇒ 两个仓库可独立迁移、独立备份、独立回滚。
- 负：
  - Hoard 的 `users` 是投影，字段新鲜度依赖"登录时 upsert"；用户在 Mirror 改昵称后，未重新登录前 Hoard 侧仍是旧值。可接受（非授权语义），需要时再补 backchannel logout 或定时刷新。
  - 两套管理员模型并存（Mirror 的 `role=admin` 会话 / Hoard 的 `HOARD_ADMIN_TOKEN` + `HOARD_ADMIN_SUBJECTS`），运维需要理解各自边界；文档与 `.env.example` 必须写清。
  - 多产品各自的会话 cookie 意味着"登出全站"需要逐产品调用（当前 Compass/Hoard 各自 `POST /auth/logout`），没有全局登出。
  - 团队所有权变更只有"新增 owner + 原 owner 退出"这一条路径（末位 owner 受保护，退出/降级均 409）；尚无独立的"移交所有权"端点，也没有邀请接受/拒绝流（owner 直接加人）。这两项是已知缺口，见 `docs/plans/status.md`。
