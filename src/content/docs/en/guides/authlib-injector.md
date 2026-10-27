---
title: Plug in Yggdrasil
description: Load skins on an offline server with authlib-injector
---

Mythic Mirror speaks Yggdrasil. Point authlib-injector at it and offline-server clients load your skins.

## Server (Java)

```bash
java -javaagent:authlib-injector-1.2.x.jar=https://<your-domain>/authserver -jar server.jar
```

## Key endpoints

| Endpoint | Purpose |
|---|---|
| `GET /` | Root meta (`skinDomains`, `signaturePublickey`) |
| `POST /authserver/authenticate` | Exchange a **player name + that player's launcher password** for a token (the site password is not accepted here — see [ADR-0012](/architecture/adr-0012-credential-separation/)) |
| `POST /sessionserver/session/minecraft/join` | Record the serverId session |
| `GET /sessionserver/session/minecraft/hasJoined` | Server fetches the profile |
| `GET /sessionserver/session/minecraft/profile/{uuid}` | Signed profile |

Mojang requires the `textures` property signature from 1.19+. Mirror signs it with an RSA-2048 key (see [ADR-0008](/architecture/adr-0008-rsa-key-management/)).
