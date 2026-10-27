---
title: Mythic Mirror（皮肤站）
---

> 仓库：`Mythicove/mythic-mirror`　品牌名：Mythic Mirror（幻镜）　定位：第三方 Minecraft 皮肤站，兼容 Yggdrasil API。

## 定位与目标

为离线模式服务器提供外置登录与自定义皮肤/披风服务。玩家注册账号、上传皮肤，服务端通过 authlib-injector 对接后，客户端即可加载皮肤。目标是做 Blessing Skin 的现代化替代：UI 现代、协议齐全、无 PHP EOL 风险，且从 10 人私服到 10k 公共站都能按需部署。

## 技术栈

| 层 | 选型 |
|---|---|
| 后端 | Go（chi + pgx + sqlc） |
| 契约 | OpenAPI 3.1（`openapi-typescript` 生成 TS client；Go 侧手写，漂移测试保证 spec 与路由一致） |
| 数据库 | PostgreSQL + goose 迁移 |
| 缓存/限流 | Redis（`Cache`/`RateLimiter` 接口，A 档可进程内） |
| 存储 | `Storage` 接口：local / MinIO / S3 |
| 认证 | 内建 session（必选）+ 自建 Fosite OIDC IdP（生态 SSO）；第三方 OAuth 为 GitHub/Microsoft |
| 图片 | Go 标准库 `image`（校验/重编码/2D 头像） |
| 前端 | Next.js 或 Vite + React |
| 3D 预览 | bs-community/skinview3d |
| 验证码 | 多驱动（Turnstile、reCAPTCHA、hCaptcha、Cap 自托管），保护范围后台可配 |
| 部署 | Docker + Caddy（分级见[计划](/plans/mirror/)） |

## 架构设计

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

- `auth`：账号、session、验证码；会话与 OIDC IdP 直接在本仓实现（ADR-0007、ADR-0010、ADR-0011）。
- `yggdrasil`：认证端点、`join`/`hasJoined`、name↔UUID 解析。
- `texture`：皮肤/披风上传、校验、模型识别、base64 属性构造与 RSA 签名。
- `render`：2D 头像/预览 API（crafatar 兼容，`image/draw` 合成）。
- `user`：玩家资料、UUID 管理（离线 UUID = `MD5("OfflinePlayer:"+name)` 的 version-3 UUID）。
- `admin`：审核、封禁、公告、配额。
- 横切：`storage`、`cache`、`ratelimit`、`i18n`、`mailer`。

## Yggdrasil API 清单（对齐 authlib-injector 规范）

- `GET /`：meta，返回 `{"meta":{...},"skinDomains":["..."],"signaturePublickey":"<PEM base64>"}`
- `POST /authserver/authenticate`：玩家名加该玩家的独立密码换 token 和用户资料（ADR-0012：网站主密码不进协议端点，站点因此可以只留第三方登录）
- `POST /authserver/refresh`：刷新 token
- `POST /authserver/validate`、`POST /authserver/invalidate`、`POST /authserver/signout`
- `POST /sessionserver/session/minecraft/join`：记录 serverId 会话
- `GET /sessionserver/session/minecraft/hasJoined?username=&serverId=&ip=`：服务端换取玩家资料
- `GET /sessionserver/session/minecraft/profile/{uuid}?unsigned=false`：返回带签名的 profile（含 base64 textures）
- `POST /api/profiles/minecraft`：批量 name→UUID 查询
- 自定义：`GET /skin/{name}`、`GET /cape/{name}`、`GET /avatars/{uuid}`、`GET /avatars/by-name/{name}`、`GET /renders/head/{uuid}`、`GET /renders/body/{uuid}`、`GET /usm/{uuid}`、`GET /textures/{key}`，以及旧版 `MinecraftSkins`、`MinecraftCloaks` 直链

关键实现点：

1. `textures` 属性格式：base64 JSON，含 `textures.SKIN.url`、`textures.CAPE.url`、`metadata.model`（slim），并对整个 value 做 RSA 签名写入 `signature`。
2. 离线 UUID 生成必须与 Mojang 一致：`UUID.nameUUIDFromBytes(("OfflinePlayer:"+name).getBytes(UTF_8))`。
3. HD 皮肤（64×128 及 2^n 倍数）需正确解析第二层纹理。
4. `hasJoined` 是进服热路径：P1 起用 Redis 缓存 profile，减轻 DB 压力。

## 相关文档

- 计划：[Mythic Mirror 计划](/plans/mirror/)（功能分级、数据模型草案、里程碑、部署分级、风险）
- 调研：[为何自研](/research/why-self-built/)
- 架构决策：[ADR-0007 认证设计](/architecture/adr-0007-auth-design/)、[ADR-0008 RSA 密钥管理](/architecture/adr-0008-rsa-key-management/)、[ADR-0012 凭证分离](/architecture/adr-0012-credential-separation/)
- 接入指南：[authlib-injector 接入](/guides/authlib-injector/)
- 部署：[部署](/deploy/)
