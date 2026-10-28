---
title: 部署（Docker Compose）
---

本目录是 Mythicove 混合站的部署文件（与 workspace 根目录的副本一致）。

## 结构

- `docker-compose.yml`：`db`(Postgres) + `mirror` + `hoard` + `caddy`(**统一入口网关**) + `web`。
- `Caddyfile`：网关分流规则——hoard（`/v2/*`、`/api/mods*`、`/auth/*`、`/api/team*`、`/api/user*`）、web（`/api/auth/*` BFF、GET 邮件落地页、其余页面兜底）、mirror（其余 API 与纹理路径）。**分流规则随产品维护，宿主反代无需再写路径规则。**
- `Caddyfile.prod`：宿主 Caddy 生产模板——单域名整体指向网关端口（`DOMAIN` + `GATEWAY` 两个变量）。
- `.env.example`：`API_URL`（浏览器访问的站点地址）、`WEB_URL`（前端地址，邮件链接指向它）、`HOARD_ADMIN_TOKEN` 等。

## 使用

在 **workspace 根目录**（`mythic-mirror`/`mythic-hoard`/`web` 的同级）运行：

```bash
cp docs/deploy/.env.example .env   # 按需改
docker compose up -d --build
```

**统一入口**：`http://localhost:8080`（网关：前端 + 两后端同域）；`http://localhost:3101` 为 web 直连调试端口。生产把域名整体反代到网关即可（`Caddyfile.prod`）。

**分离部署**（前端放 Pages 等独立宿主，后端单独部署）：

```bash
docker compose up -d db mirror hoard caddy   # 跳过 web 服务
```

- 网关的 web 兜底路由因上游缺失返回 502，API 路径不受影响；
- 前端构建时设 `NEXT_PUBLIC_API_URL=https://api.example.com`、运行时设 `API_URL_INTERNAL`（SSR/BFF 服务端取数）；
- 前端宿主必须支持 **Next 服务端路由**（BFF：`/api/auth/*` route handlers 承载 httpOnly cookie 会话），纯静态托管不可用；
- 浏览器必须**同域**访问 API：优先用前端宿主的 path rewrite/redirect 把 API 路径代理到网关（保持 cookie SameSite=Lax 生效）；若改为跨域直连，需配 `*_CORS_ORIGINS`，且会话 cookie 为 Lax、跨站 fetch 不携带——登录态将不可用，不推荐。

## 反向代理与客户端 IP

两个后端通过 `shared/clientip` 解析真实客户端 IP（限流/日志），**仅当直连对端在可信代理网段内才采信转发头**（防伪造 `X-Forwarded-For` 绕过限流）：

- 默认头序：`X-Forwarded-For, X-Real-IP, CF-Connecting-IP, True-Client-IP`（`*_CLIENT_IP_HEADERS` 可覆盖顺序与内容）
- 默认可信网段：环回 + 私网 + 链路本地 → 本 compose（Caddy 与应用同 docker 网络）开箱即用
- **CDN / 云 LB 必须显式配置**：把边缘网段加入 `MIRROR_TRUSTED_PROXIES` / `HOARD_TRUSTED_PROXIES`（如 [Cloudflare IP 段](https://www.cloudflare.com/ips/)），否则解析到的是边缘 IP，限流会按边缘合并
- 应用直接暴露公网（无任何反代）时设 `*_CLIENT_IP_TRUST_NONE=true`
- 边缘代理应覆写/清洗客户端自带的转发头（Caddy `reverse_proxy` 默认对 XFF 做追加，配合右到左解析是安全的）

## 生产部署（TLS 域名）

开发直接访问网关端口（HTTP、localhost）。生产用 [`Caddyfile.prod`](https://github.com/Mythicove/docs/blob/main/deploy/Caddyfile.prod)：设置 `DOMAIN` / `GATEWAY` 后 Caddy 自动签发 Let's Encrypt 证书，单域名整体指向统一入口网关，含安全头兜底。

配套运维件（`docs/deploy/`）：

- [`backup.md`](https://github.com/Mythicove/docs/blob/main/deploy/backup.md) + [`backup.sh`](https://github.com/Mythicove/docs/blob/main/deploy/backup.sh)：Postgres dump + 纹理/文件卷备份、保留策略、恢复步骤与演练要求
- [`observability/`](https://github.com/Mythicove/docs/tree/main/deploy/observability)：Prometheus 抓取片段、告警规则（promtool 校验过）、Grafana 面板

## 镜像发布（GHCR）

各仓库在打 `v*` tag 时，GitHub Actions 会自动构建并推送到 `ghcr.io/mythicove/<repo>`（镜像名全小写，发布工作流会把 `github.repository` 转小写）：

```bash
git tag v0.1.0 && git push origin v0.1.0
```

（发布前需在 GitHub org 设置里允许 Actions 写 Packages，或用 PAT 登录。）
