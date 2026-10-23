# 部署（Docker Compose）

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

## 镜像发布（GHCR）

各仓库在打 `v*` tag 时，GitHub Actions 会自动构建并推送到 `ghcr.io/Mythicove/<repo>`：

```bash
git tag v0.1.0 && git push origin v0.1.0
```

（发布前需在 GitHub org 设置里允许 Actions 写 Packages，或用 PAT 登录。）
