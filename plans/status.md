# 当前进度（2026-10-23）

## 仓库状态

| 仓库 | 状态 |
|---|---|
| `mythic-mirror` | Go 后端：Yggdrasil 认证 + 皮肤/披风 + 账号体系 + 皮肤库 + 正版兼容 + 多 provider（验证码/OAuth/存储/CDN/邮件/Redis）+ 管理后台（用户/登录方式/公告/邀请码/皮肤审核）+ OIDC Provider（Fosite），可用 |
| `mythic-hoard` | Go 后端：mod 分发（Postgres + sqlc 三级模型 + S3/本地存储 + 搜索 pg_trgm/Meili + 队列 inline/asynq + 下载统计 + 审核状态），Modrinth 兼容读 + `.mrpack`，可用 |
| `web` | Next.js 前端：多主题/多语言/深浅色 + landing/注册/登录(OAuth 按钮)/皮肤库/皮肤详情/上传/3D 预览/管理后台/mod 搜索下载，可用 |
| `compass` | Tauri 2 + React 启动器：Yggdrasil 登录 + skinview3d 3D 预览 + mod/整合包浏览 + `.mrpack` 下载 + 外部启动器（Prism）接管启动，可用 |
| `shared` | Go 能力接口（auth/storage/search/cache/ratelimit/queue/mailer/i18n/captcha/cdn/oauth/mc） |
| `api` | OpenAPI 契约（mirror + hoard + common） |
| `docs` | 计划与架构决策（ADR-0001..0010） |

## 部署模式

- **皮肤站**：`web`(`modules=["skin"]`) + `mythic-mirror`
- **mod 站**：`web`(`modules=["mods"]`) + `mythic-hoard`
- **混合站**（私群场景）：`web`(`modules=["skin","mods"]`) + `mythic-mirror` + `mythic-hoard`，共享同一 Postgres（各自 goose 版本表）
- 单 API 域名经 Caddy 分流：`/v2/*`、`/api/mods*` → hoard，其余 → mirror

## 认证与 SSO

- Yggdrasil 不透明 token（ADR-0007）；登录方式注册表 `/api/login-methods`；OIDC Provider `/oauth2/*`（ADR-0010）
- Hoard 上传经 `HOARD_ADMIN_TOKEN`；Mirror 管理后台经 `MIRROR_ADMIN_TOKEN` 或 role=admin 会话

## 待办（后续路线）

- OIDC token 多实例存储（`fosite.Storage` 的 Postgres/Redis 实现，替换 `storage.MemoryStore`）
- Compass 内建原生 Minecraft 启动（当前委托 Prism Launcher 接管，见 compass README）
- Hoard 账号/组织/团队 + API Token、上游镜像代理（Modrinth/CurseForge）
- 皮肤库评论列表展示、皮肤详情"应用到我的皮肤"
- Meili 搜索的总命中数在 interface 层面补全（当前近似）
