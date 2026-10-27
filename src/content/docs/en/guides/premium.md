---
title: Premium (Microsoft) binding
description: Keep the real UUID and fall back to Mojang textures
---

Premium players can bind a Microsoft account to keep their real UUID and fall back to Mojang textures.

```bash
MIRROR_OAUTH_MICROSOFT_CLIENT_ID=...
MIRROR_OAUTH_MICROSOFT_CLIENT_SECRET=...
```

The OAuth2 authorization-code flow exchanges the Microsoft token through the Xbox / XSTS flow to resolve the real UUID (see [ADR-0007](../../architecture/adr-0007-auth-design.md)).
