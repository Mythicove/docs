---
title: 接入 Yggdrasil（外置登录）
description: 服务端如何让离线服加载皮肤
---

Mythic Mirror 兼容 Yggdrasil API，配合 authlib-injector 让离线服客户端加载自定义皮肤。

## 服务端（Java 版）

1. 下载 [authlib-injector](https://github.com/yushijinhun/authlib-injector/releases)。
2. 启动时追加参数：

```bash
java -javaagent:authlib-injector-1.2.x.jar=https://<你的域名>/authserver -jar server.jar
```

其中 `https://<你的域名>/authserver` 指向 Mirror 的认证端点。

## 关键端点

| 端点 | 作用 |
|---|---|
| `GET /` | 根 meta（`skinDomains`、`signaturePublickey`） |
| `POST /authserver/authenticate` | 玩家名 + 该玩家的**独立密码**换 token（网站主密码在此无效，见 [ADR-0012](../architecture/adr-0012-credential-separation.md)） |
| `POST /sessionserver/session/minecraft/join` | 进服记录 serverId 会话 |
| `GET /sessionserver/session/minecraft/hasJoined` | 服务端换取玩家资料 |
| `GET /sessionserver/session/minecraft/profile/{uuid}` | 返回带 RSA 签名的 profile |

## 1.19+ 签名要求

Mojang 从 1.19 起强制校验 profile 的 `textures` 属性签名。Mirror 使用 RSA-2048 私钥（见 [ADR-0008](../architecture/adr-0008-rsa-key-management.md)）对 textures 属性做 SHA256withRSA 签名，公钥经根 meta 端点下发。

> 离线 UUID 生成与 Mojang 一致：`UUID.nameUUIDFromBytes("OfflinePlayer:" + name)`。
