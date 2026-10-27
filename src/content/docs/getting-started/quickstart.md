---
title: 快速开始
description: 用 Docker Compose 在本地把整个 Mythicove 跑起来
---

一套 `docker compose up` 即可启动皮肤站 + Mod 站 + 前端。

## 前置条件

- Docker 与 Docker Compose v2
- 可选的域名（本地开发用 `localhost` 即可）

## 1. 拉取并启动

在仓库根目录（含 `docker-compose.yml` 与 `Caddyfile`）执行：

```bash
cp .env.example .env
docker compose up -d --build
```

默认端口：

| 服务 | 地址 |
|---|---|
| **统一入口网关**（前端 + 皮肤站 + Mod 站，Caddy 按路径分流） | `http://localhost:8080` |
| 前端直连（调试用） | `http://localhost:3101` |
| Postgres | `localhost:5432` |

## 2. 验证

```bash
curl http://localhost:8080/healthz          # ok
curl http://localhost:8080/api/login-methods # 登录方式
curl http://localhost:8080/api/mods          # Mod 列表
curl http://localhost:8080/.well-known/openid-configuration # OIDC
```

## 3. 配置说明

关键环境变量（见 `.env.example`）：

| 变量 | 作用 |
|---|---|
| `API_URL` | 浏览器访问的站点地址（统一入口=对外域名） |
| `API_PORT` / `WEB_PORT` | 网关 / 前端直连的宿主机端口 |
| `HOARD_ADMIN_TOKEN` | Mod 上传鉴权（留空则开放上传） |
| `MIRROR_ADMIN_TOKEN` | 皮肤站后台鉴权 |

皮肤站、Mod 站共享同一个 Postgres（各自独立的 goose 版本表）。compose 内置的 Caddy 网关按路径分流：`/v2/*`、`/api/mods*`、`/auth/*`、`/api/team*`、`/api/user*` → Hoard；`/api/auth/*`（BFF）与页面兜底 → Web；其余 API 与纹理路径 → Mirror。宿主反代只需把域名整体指向网关（见 [部署](../deploy/index.md)）。

> 生产级的分级部署（Redis / S3 / Meilisearch 等）见 [部署](../deploy/index.md)。
