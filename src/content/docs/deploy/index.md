---
title: 部署（Docker Compose）
---

本目录是 Mythicove 混合站的部署文件（与 workspace 根目录的副本一致）。

## 结构

- `docker-compose.yml`：`db`(Postgres) + `mirror` + `hoard` + `caddy`(单 API 域名反代) + `web`。
- `Caddyfile`：单 API 域名路由——`/v2/*`、`/api/mods*` → hoard；其余 → mirror。
- `.env.example`：`API_URL`（浏览器访问的 API 域名）、`WEB_URL`（前端地址，邮件链接指向它）、`HOARD_ADMIN_TOKEN` 等。

## 使用

在 **workspace 根目录**（`mythic-mirror`/`mythic-hoard`/`web` 的同级）运行：

```bash
cp docs/deploy/.env.example .env   # 按需改
docker compose up -d --build
```

单 API 域名：`http://localhost:8080`（mirror + hoard 统一入口），前端 `http://localhost:3101`。

## 反向代理与客户端 IP

两个后端通过 `shared/clientip` 解析真实客户端 IP（限流/日志），**仅当直连对端在可信代理网段内才采信转发头**（防伪造 `X-Forwarded-For` 绕过限流）：

- 默认头序：`X-Forwarded-For, X-Real-IP, CF-Connecting-IP, True-Client-IP`（`*_CLIENT_IP_HEADERS` 可覆盖顺序与内容）
- 默认可信网段：环回 + 私网 + 链路本地 → 本 compose（Caddy 与应用同 docker 网络）开箱即用
- **CDN / 云 LB 必须显式配置**：把边缘网段加入 `MIRROR_TRUSTED_PROXIES` / `HOARD_TRUSTED_PROXIES`（如 [Cloudflare IP 段](https://www.cloudflare.com/ips/)），否则解析到的是边缘 IP，限流会按边缘合并
- 应用直接暴露公网（无任何反代）时设 `*_CLIENT_IP_TRUST_NONE=true`
- 边缘代理应覆写/清洗客户端自带的转发头（Caddy `reverse_proxy` 默认对 XFF 做追加，配合右到左解析是安全的）

## 生产部署（TLS 域名）

开发用根目录 `Caddyfile`（HTTP、localhost）。生产用 [`Caddyfile.prod`](../../../deploy/Caddyfile.prod)：设置 `API_DOMAIN` / `WEB_DOMAIN` 后 Caddy 自动签发 Let's Encrypt 证书，含安全头兜底与 mirror 会话亲和（OIDC token 落库前的多副本过渡措施）。

配套运维件（`docs/deploy/`）：

- [`backup.md`](../../../deploy/backup.md) + [`backup.sh`](../../../deploy/backup.sh)：Postgres dump + 纹理/文件卷备份、保留策略、恢复步骤与演练要求
- [`observability/`](../../../deploy/observability/)：Prometheus 抓取片段、告警规则（promtool 校验过）、Grafana 面板

## 镜像发布（GHCR）

各仓库在打 `v*` tag 时，GitHub Actions 会自动构建并推送到 `ghcr.io/Mythicove/<repo>`：

```bash
git tag v0.1.0 && git push origin v0.1.0
```

（发布前需在 GitHub org 设置里允许 Actions 写 Packages，或用 PAT 登录。）
