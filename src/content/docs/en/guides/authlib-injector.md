---
title: Plug in Yggdrasil
description: Connect server authentication and signed skins to Mirror
---

Mythic Mirror speaks Yggdrasil. Connect both clients and servers through authlib-injector for community player authentication and custom skins.

## Server (Java)

```bash
java -Dauthlibinjector.side=server -javaagent:authlib-injector-1.2.8.jar=https://<your-domain> -jar server.jar --nogui
```

Use the Mirror site root; the injector appends `/authserver` and `/sessionserver` itself. Compass injects the client automatically. External online authentication uses `online-mode=true` in `server.properties`.

The Windows scenario passed with Purpur 1.21.1 build 2329, Java 21, authlib-injector 1.2.8 and a real Compass/Fabric client. Native Bukkit observations confirmed the Mirror player UUID, SLIM skin URL, valid property signature and matching PNG bytes. It used `enforce-secure-profile=false`; secure chat profile signing requires separate validation.

## Key endpoints

| Endpoint | Purpose |
|---|---|
| `GET /` | Root meta (`skinDomains`, `signaturePublickey`) |
| `POST /authserver/authenticate` | Exchange a **player name + that player's launcher password** for a token (the site password is not accepted here — see [ADR-0012](/architecture/adr-0012-credential-separation/)) |
| `POST /sessionserver/session/minecraft/join` | Record the serverId session |
| `GET /sessionserver/session/minecraft/hasJoined` | Server fetches the profile |
| `GET /sessionserver/session/minecraft/profile/{uuid}` | Signed profile |

Mirror signs the base64-encoded `textures` value with the Yggdrasil protocol's SHA1withRSA algorithm and an RSA-2048 key (see [ADR-0008](/architecture/adr-0008-rsa-key-management/)). The root metadata supplies the public key that authlib-injector uses to verify property signatures.
