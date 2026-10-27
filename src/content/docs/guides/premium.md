---
title: 正版绑定（Microsoft）
description: 让正版玩家保留真实 UUID，皮肤走 Mojang 兜底
---

正版玩家可绑定 Microsoft 账号，保留真实 UUID，未上传皮肤时回退到 Mojang 纹理。

## 流程

1. 登录后在个人中心发起 Microsoft OAuth（OAuth2 授权码流程 + Xbox/XSTS 换取 UUID）。
2. Mirror 把玩家的 `premium_uuid` 写入 `players` 表。
3. 拉取 profile 时，若 `premium_uuid` 非空，`textures` 用真实 UUID，皮肤缺失时从 Mojang 纹理回退。

## 配置

```bash
MIRROR_OAUTH_MICROSOFT_CLIENT_ID=...
MIRROR_OAUTH_MICROSOFT_CLIENT_SECRET=...
```

## 注意

- 需在 Azure 应用注册里配置回调 URL：`{BaseURL}/mojang/oauth/callback`。
- 完整设计见 [ADR-0007 认证设计](/architecture/adr-0007-auth-design/)。
