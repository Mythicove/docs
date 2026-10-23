# 当前进度（2026-10-23）

> 本次更新同时是一次审计后的修复。措辞按"能跑通的最小闭环 + 已知差距"如实描述，
> 不再用笼统的"可用"。距 Blessing Skin / Modrinth 的成熟度差距见文末"已知差距"。

## 成熟度总览

代码量约 11.7k 行（mirror 6.3k Go / hoard 2.6k Go / shared 0.2k / web 2.1k TS / compass 0.5k）。
定性：**打通了核心闭环的原型（M1–M3 为主），不是半成品，也远未到成熟产物。**
两个后端能 build/vet/test 全绿，web 能 typecheck/lint/build，关键链路有真进程冒烟验证。

## 仓库状态

| 仓库 | 实际状态 |
|---|---|
| `mythic-mirror` | Go 后端。Yggdrasil 全套端点 + RSA 签名、皮肤/披风上传校验与分发、crafatar 风格头像/渲染、账号体系（注册/邮箱验证/找回密码/GitHub OAuth/Microsoft 正版绑定/邀请码/验证码）、皮肤库（发布/点赞，**评论只写不读**）、管理后台、OIDC Provider（Fosite，**token 存内存**）。存储本地/S3、缓存内存/Redis、邮件 SMTP/Resend/日志可切。集成测试对真 Postgres 全绿。 |
| `mythic-hoard` | Go 后端。Project→Version→File 三级模型（Postgres/sqlc 或内存）、本地/S3 存储、pg_trgm/Meili 搜索、inline/asynq 队列、下载统计、审核状态、Modrinth 兼容读子集、`.mrpack` 生成（含 dependencies + mods/ 路径）。**上传/审核仅靠 `HOARD_ADMIN_TOKEN`，无用户体系。** |
| `web` | Next.js 16 App Router。**全部客户端渲染（无 SSR/RSC 数据获取）**。landing/注册/登录(OAuth+忘记密码)/邮箱验证与重置落地页/皮肤库列表+详情/上传皮肤披风(profile)/3D 预览/管理后台/mod 列表+上传。类型由 OpenAPI 契约生成。**零前端测试；token 存 localStorage；管理后台手贴 admin token。** |
| `compass` | Tauri 2 原型（~500 行单页）。Yggdrasil 登录 + skinview3d 预览 + `.mrpack` 下载 + 委托 Prism 启动。**不原生启动 Minecraft**（无 Java 检测/版本清单/asset 下载/authlib-injector 注入/实例管理），无 CI、无自动更新。 |
| `shared` | Go 能力接口 + 零依赖进程内实现：storage/search/cache/**ratelimit（新增 Memory 固定窗口实现）**/queue/mailer/i18n/captcha/cdn/oauth/mc。**已删除无人引用的 `auth` 接口**（认证在各服务内直接实现，见 overview §5）。 |
| `api` | OpenAPI 契约（mirror + hoard + common），已对齐实现（见下）。 |
| `docs` | 计划与架构决策（ADR-0001..0010）。 |

## 本轮已修（审计发现 → 修复）

- **邮箱验证 / 找回密码断链**：后端邮件链接原指向 API 的 `POST /account/verify`（浏览器 GET 必失败），且前端无对应路由。现新增前端 `/{locale}/account/verify` 与 `/account/reset-password` 落地页 + 登录页"忘记密码"入口；后端邮件链接改指 `MIRROR_WEB_URL`（新配置，回退 `MIRROR_BASE_URL`），邮件文案走 i18n。冒烟验证 register→邮件链接→verify(204)→authenticate 全通。
- **OpenAPI 契约漂移**：spec 与实现严重不符（`/avatar` vs `/avatars`；hoard 9 个幽灵端点；已实现端点未入 spec）。现契约只描述**已实现路由**：mirror 补 account/skinlib/admin/纹理端点、修 `/avatars`；hoard 删幽灵端点、补 `/api/mods*` 与 mrpack。结构性防再犯：两个 Go 服务加 `TestSpecMatchesRoutes` 漂移门（负向测试已验证能抓幽灵路由），web 用 openapi-typescript 生成类型（`src/lib/api-schema/`）、`api.ts` 改为 re-export、CI `gen:api && git diff --exit-code` 兜底。
- **限流形同虚设**：原按 `RemoteAddr`（含端口）建 key，每条连接独立桶 → 等于没限流；且进程内 map 无界（内存泄漏）。现改用 `shared/ratelimit.Memory`（按 IP 去端口的固定窗口 + 惰性 TTL 清扫）。回归测试 + 真进程验证：同源 30 请求 → 前 10 通过、后 20 个 429。
- **`.mrpack` 不合规**：缺 `dependencies`、文件路径非 `mods/`。现按 loader 生成 dependencies、mod 文件加 `mods/` 前缀。冒烟验证 index 合法。
- **安全基线**：两个服务加安全响应头（`X-Content-Type-Options`/`X-Frame-Options`/`Referrer-Policy`/CSP，TLS 或 `X-Forwarded-Proto=https` 时加 HSTS）+ `http.Server` `ReadHeaderTimeout`/`IdleTimeout`（防 Slowloris）。
- **DB 层 CI 覆盖**：CI 加 Postgres service + 测试自动跑迁移，pgstore 集成测试不再永久 skip（本地对真 PG17 全绿）。
- **死代码**：删 `shared/auth`；`shared/ratelimit` 从死代码变为被两服务引用。
- **仓库卫生**：web/compass 补 AGPL-3.0 LICENSE；把此前大量未提交的工作（mirror 18 / hoard 21 / web 16 / compass 8 文件）落入基线提交；README（mirror/hoard/web/compass）、overview §5、ADR-0009 修订、docs/deploy 同步为与现实一致。

## 部署模式

- **皮肤站**：`web`(`modules=["skin"]`) + `mythic-mirror`
- **mod 站**：`web`(`modules=["mods"]`) + `mythic-hoard`
- **混合站**：`web`(`modules=["skin","mods"]`) + 两后端，共享同一 Postgres（mirror 用默认 goose 表，hoard 用 `hoard_goose_version`，不冲突）
- 单 API 域名经 Caddy 分流：`/v2/*`、`/api/mods*` → hoard，其余 → mirror
- 邮件链接依赖 `MIRROR_WEB_URL`/`WEB_URL` 指向前端（compose 已配）

## 已知差距（距成熟产物，未在本轮处理）

**后端深度**
- OIDC token 仍存内存（`fosite` MemoryStore），多实例/重启失效 → 需 Postgres/Redis storage
- `account.mojangStates` 仍是进程内 map → 多副本下 Microsoft 正版绑定失效
- 皮肤库评论**只写不读**（无列表端点/UI）；无标签/搜索/排序/分页；无 2FA/举报/配额/审计日志
- 邮箱校验 `validEmail` 仍偏宽松；多数请求体未跑 validator
- Hoard **无用户/组织/团队/API Token**（只有管理员 token）→ 不是 Modrinth 替代品；无版本依赖关系、上传不解析 mod 元数据、无上游镜像代理、搜索无 facets 透传到 UI
- Meili 分支 `total_hits` 仍是近似

**前端 / 启动器**
- 全客户端渲染，无 SSR/RSC，SEO 与首屏差；无 mod 详情页；无数据层（query/form 库）；组件库仅 7 个 shadcn 件（admin 页手搓）；错误直接 `String(e)`
- token 存 localStorage（XSS 风险）+ 后端 CORS `*`；管理后台靠手贴 token（非会话登录）
- 零前端测试（无单测/Playwright）；compass 无 CI、`launch` 直接执行 UI 可编辑的程序名、下载全量入内存无进度/校验

**工程化**
- 无 E2E/契约字段级测试；无性能/负载数据；无 Helm/K8s（overview §6 的 C/D 档只是纸面）；无 CHANGELOG/release/tag（除 shared 1 个）；Caddyfile 无 TLS、不路由 web
- CI 无 gofmt 门（仓库存在既有未格式化文件：admin.go/migrate.go/s3storage.go/render.go/memstore.go）
- 无 ToS/Privacy/DMCA/内容合规

## 建议下一步（收敛，勿并行）

先把 **Mirror 单产品**做到"能给别人用"：评论可读+审核、皮肤库搜索/排序/分页、SSR 列表页、完整后台（会话登录而非手贴 token）、Playwright E2E、OIDC/正版绑定的多副本存储。Hoard 在补齐用户体系前不宜宣传为 Modrinth 替代。
