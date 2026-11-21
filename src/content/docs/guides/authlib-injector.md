---
title: 接入 Yggdrasil（外置登录）
description: 服务端接入 Mirror 玩家认证与签名皮肤
---

Mythic Mirror 兼容 Yggdrasil API，配合客户端与服务端的 authlib-injector 完成社区玩家认证和自定义皮肤加载。

## 服务端（Java 版）

1. 下载 [authlib-injector](https://github.com/yushijinhun/authlib-injector/releases)。
2. 启动时追加参数：

```bash
java -Dauthlibinjector.side=server -javaagent:authlib-injector-1.2.8.jar=https://<你的域名> -jar server.jar --nogui
```

传入 Mirror 的站点根地址；注入器自行拼接 `/authserver` 和 `/sessionserver` 等端点。客户端也必须接入同一个 Mirror，Compass 会自动完成注入。

外置在线认证使用 `server.properties` 中的 `online-mode=true`。已在 Purpur 1.21.1 build 2329、Java 21、authlib-injector 1.2.8 与真实 Compass/Fabric 客户端验证进服，服务端 UUID、SLIM 皮肤 URL、有效属性签名和 PNG 内容均通过核对。该场景设置 `enforce-secure-profile=false`；聊天安全档案签名是另一项能力。

## 关键端点

| 端点 | 作用 |
|---|---|
| `GET /` | 根 meta（`skinDomains`、`signaturePublickey`） |
| `POST /authserver/authenticate` | 玩家名 + 该玩家的**独立密码**换 token（网站主密码在此无效，见 [ADR-0012](/architecture/adr-0012-credential-separation/)） |
| `POST /sessionserver/session/minecraft/join` | 进服记录 serverId 会话 |
| `GET /sessionserver/session/minecraft/hasJoined` | 服务端换取玩家资料 |
| `GET /sessionserver/session/minecraft/profile/{uuid}` | 返回带 RSA 签名的 profile |

## 皮肤属性签名

Mirror 使用 RSA-2048 私钥（见 [ADR-0008](/architecture/adr-0008-rsa-key-management/)）对 base64 编码的 `textures` 属性值做 Yggdrasil 协议要求的 SHA1withRSA 签名，公钥经根 meta 端点下发。authlib-injector 使用该公钥与协议算法验证属性签名。

> 离线 UUID 生成与 Mojang 一致：`UUID.nameUUIDFromBytes("OfflinePlayer:" + name)`。
