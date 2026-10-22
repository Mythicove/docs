# 当前进度（2026-10-22）

## 仓库状态

| 仓库 | 状态 |
|---|---|
| `mythic-mirror` | Go 后端：Yggdrasil 认证 + 皮肤/披风 + 账号体系 + 皮肤库 + 正版兼容 + 多 provider（验证码/OAuth/存储/CDN/邮件），可用 |
| `mythic-hoard` | Go 后端：mod 分发 MVP（上传/列表/下载 + Modrinth 兼容读 + `.mrpack`），可用 |
| `web` | Next.js 前端：多主题/多语言/深浅色 + landing/注册/登录/皮肤库/mods/上传/个性化，可用 |
| `compass` | Tauri 2 + React 启动器骨架，核心逻辑待实现 |
| `shared` | Go 能力接口（auth/storage/search/cache/ratelimit/queue/mailer/i18n/captcha/cdn/oauth/mc） |
| `api` | OpenAPI 契约（mirror + hoard + common） |
| `docs` | 计划与架构决策（ADR-0001..0009） |

## 部署模式

- **皮肤站**：`web`(`modules=["skin"]`) + `mythic-mirror`
- **mod 站**：`web`(`modules=["mods"]`) + `mythic-hoard`
- **混合站**（私群场景）：`web`(`modules=["skin","mods"]`) + `mythic-mirror` + `mythic-hoard`

## 待办

- Compass 启动器核心逻辑（鉴权 + skinview3d + .mrpack 下载 + 一键启动）
- 前端：profile 3D 预览、皮肤库详情页、上传鉴权态统一
- hoard：换 Postgres + S3，接入 `shared` 能力接口
- 管理后台 UI：主题配置、mod 审核、用户管理
