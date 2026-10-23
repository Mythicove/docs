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
| `shared` | Go 能力接口 + 零依赖进程内实现：storage/search/cache/**ratelimit（Memory 固定窗口）**/**clientip（可信代理感知的客户端 IP 解析）**/queue/mailer/i18n/captcha/cdn/oauth/mc。**已删除无人引用的 `auth` 接口**（认证在各服务内直接实现，见 overview §5）。 |
| `api` | OpenAPI 契约（mirror + hoard + common），已对齐实现（见下）。 |
| `docs` | 计划与架构决策（ADR-0001..0010）。 |

## 本轮已修（审计发现 → 修复）

- **邮箱验证 / 找回密码断链**：后端邮件链接原指向 API 的 `POST /account/verify`（浏览器 GET 必失败），且前端无对应路由。现新增前端 `/{locale}/account/verify` 与 `/account/reset-password` 落地页 + 登录页"忘记密码"入口；后端邮件链接改指 `MIRROR_WEB_URL`（新配置，回退 `MIRROR_BASE_URL`），邮件文案走 i18n。冒烟验证 register→邮件链接→verify(204)→authenticate 全通。
- **OpenAPI 契约漂移**：spec 与实现严重不符（`/avatar` vs `/avatars`；hoard 9 个幽灵端点；已实现端点未入 spec）。现契约只描述**已实现路由**：mirror 补 account/skinlib/admin/纹理端点、修 `/avatars`；hoard 删幽灵端点、补 `/api/mods*` 与 mrpack。结构性防再犯：两个 Go 服务加 `TestSpecMatchesRoutes` 漂移门（负向测试已验证能抓幽灵路由），web 用 openapi-typescript 生成类型（`src/lib/api-schema/`）、`api.ts` 改为 re-export、CI `gen:api && git diff --exit-code` 兜底。
- **限流形同虚设**：原按 `RemoteAddr`（含端口）建 key，每条连接独立桶 → 等于没限流；且进程内 map 无界（内存泄漏）。现改用 `shared/ratelimit.Memory`（按 IP 去端口的固定窗口 + 惰性 TTL 清扫）。回归测试 + 真进程验证：同源 30 请求 → 前 10 通过、后 20 个 429。
- **客户端 IP 可伪造**：原 chi `middleware.RealIP` 无条件信任 `X-Forwarded-For`/`X-Real-IP`，公网客户端发个伪造头即可绕过按 IP 限流、污染日志。现由 `shared/clientip.Resolver` 统一解析：**仅当直连对端落在可信代理网段内才采信转发头**；列表头从右向左跳过可信网段（Express trust-proxy 同款算法，抗左侧塞伪造条目）；头名称/顺序与可信网段可配（`*_CLIENT_IP_HEADERS` / `*_TRUSTED_PROXIES` / `*_CLIENT_IP_TRUST_NONE`）。默认头序 `X-Forwarded-For, X-Real-IP, CF-Connecting-IP, True-Client-IP`，默认可信网段 = 环回+私网+链路本地（compose 开箱即用；公网直连客户端无法伪造）。**CDN/云 LB 场景必须把边缘网段（如 Cloudflare IP 段）配进 TrustedProxies**，否则解析到的是边缘 IP。对照实验验证：可信代理下按 XFF 分桶；对端不可信时伪造 XFF 被忽略。
- **`.mrpack` 不合规**：缺 `dependencies`、文件路径非 `mods/`。现按 loader 生成 dependencies、mod 文件加 `mods/` 前缀。冒烟验证 index 合法。
- **安全基线**：两个服务加安全响应头（`X-Content-Type-Options`/`X-Frame-Options`/`Referrer-Policy`/CSP，TLS 或 `X-Forwarded-Proto=https` 时加 HSTS）+ `http.Server` `ReadHeaderTimeout`/`IdleTimeout`（防 Slowloris）。
- **DB 层 CI 覆盖**：CI 加 Postgres service + 测试自动跑迁移，pgstore 集成测试不再永久 skip（本地对真 PG17 全绿）。
- **死代码**：删 `shared/auth`；`shared/ratelimit` 从死代码变为被两服务引用。
- **仓库卫生**：web/compass 补 AGPL-3.0 LICENSE；把此前大量未提交的工作（mirror 18 / hoard 21 / web 16 / compass 8 文件）落入基线提交；README（mirror/hoard/web/compass）、overview §5、ADR-0009 修订、docs/deploy 同步为与现实一致。

## 部署模式

- **皮肤站**：`web`(`modules=["skin"]`) + `mythic-mirror`
- **mod 站**：`web`(`modules=["mods"]`) + `mythic-mirror`（身份中心）+ `mythic-hoard`。Hoard 不自建账号体系，经 Mirror OIDC 登录（见下"身份架构决策"）；Mirror 是单二进制 + 同一 Postgres，代价可忽略
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

## 下一阶段规划（收敛，勿并行）

原则：先把 **Mirror 单产品**做到"能给陌生人用"，再补生产运维基线，然后才动 Hoard 的用户体系（重写级）。每阶段有独立验收标准，做完打 tag 发版。

### 身份架构决策（Phase 3 的前提，2026-10-23 定）

问题：Hoard 缺用户系统。共享 Mirror 的 users 表？还是把账号体系放进 shared？

**决策：都不是。Mirror = 生态身份中心（OIDC Provider，已建成），Hoard = OIDC 客户端（RP），只存用户投影 + teams + API Token。**

| 方案 | 结论 | 理由 |
|---|---|---|
| 共享 users 表（同库同表） | 否决 | 两服务 schema/迁移互相锁死；独立 mod 站模式直接坏掉；双写方破坏服务边界 |
| 账号体系放 shared | 否决 | shared 章程是零依赖接口/纯实现；账号要 PG/bcrypt/mailer/captcha，塞进去必然膨胀；只放接口就是刚删掉的 `shared/auth` 死代码重演 |
| Hoard 自建完整账号 | 否决 | 重复 Mirror 约 1.5k 行账号/邮件/验证码逻辑，双倍安全面与维护成本 |
| **Hoard 作 OIDC RP + 投影表** | **采纳** | 复用已建成的 `/oauth2/*`（ADR-0010 就是为此）；Hoard 不存密码不发邮件，账号安全面为零；投影表从 ID token claims（sub/username/email）登录时 upsert，无手工同步；C/D 档换 Zitadel 只改 issuer 配置 |

要点：
- 两服务可同库实例（compose 便利），但**表绝不共享**；关联键 = OIDC `sub`（即 mirror users.id 字符串），不建跨服务外键
- Hoard 侧：`users`（投影：sub/username/email/avatar/role）+ `teams`/`team_members` + `personal_access_tokens`（哈希存储，上传/管理用）；`HOARD_ADMIN_TOKEN` 保留作 bootstrap/救援通道
- 管理员映射：Hoard 自管角色（admin UI 提升 + `HOARD_ADMIN_SUBJECTS` 环境变量白名单自动映射），不隐式信任 Mirror 的 role
- 唯一值得重新考虑的情形：若坚持"mod 站必须是单二进制（无 Mirror）"，则退路是把 Mirror 账号核心抽成独立 library 模块（不进 shared）——当前不接受该约束，故不抽
- 待 docs 仓库迁移落定后补 ADR-0011（身份架构）正式记录

### Phase 1 — Mirror 可交付（预计 4–6 周）

目标：一个陌生人按文档部署后，能完成 注册→验证→登录→传皮肤→皮肤库浏览互动 全流程。**范围=产品功能补齐**；生产化正确性（多实例/存储加固）归 Phase 2。

后端（W1，先行，前端依赖它）：
- `GET /skinlib/{id}` 详情端点（现状：前端拉 `listSkinLib(0,1000)` 客户端 find，必须废掉）
- `GET /skinlib/{id}/comments` 评论读取 + 管理端删除；皮肤库 `q` 搜索 + 排序（最新/点赞）+ 分页 total
- `POST /skinlib/{id}/apply` "应用到我的皮肤"（认证，将库条目纹理设为自己玩家的皮肤）
- 每项同步改 spec → `pnpm gen:api` → 漂移门自动兜底

前端（W2）：
- 皮肤库列表/详情改 RSC/SSR（SEO+首屏），废弃客户端全量拉取
- 分页/排序/搜索 UI、评论展示+发表、apply 按钮、toast/`error.tsx`/`loading.tsx`/skeleton
- 补 shadcn table/tabs/dialog/pagination/skeleton（admin 页去手搓 div）

认证与安全（W3）：
- **admin 会话登录**：role=admin 账号经 authenticate 换会话，替代手贴 `adminToken`（token 通道保留为救援）；web 管理后台改造
- CORS 从 `*` 收窄为 `MIRROR_CORS_ORIGINS`/`HOARD_CORS_ORIGINS` 白名单（默认前端 origin）

质量与发布（W4）：
- Playwright E2E 进 CI：compose 起栈 + mailpit 收验证邮件 → 注册→验证→登录→上传→皮肤库可见→评论
- gofmt 门（顺带格式化 5 个既有未格式化文件）；CHANGELOG 起步
- 打 `v0.1.0`（mirror/web/shared/api 同步 tag），compose 提供 pin GHCR 镜像版本
- 验收：陌生人按文档部署并走完全流程；CI 全绿含 E2E

### Phase 2 — 生产化与运维基线（预计 3–4 周）

目标：敢开一个 A/B 档公共小站并持续运营。**范围=正确性与可运维性**（Phase 3 依赖其中的 IdP 加固）。

- 多实例正确性：fosite storage 落 Postgres（替换 MemoryStore）、`mojangStates` 落 cache 接口、`ratelimit` Redis 实现（高档）
- web 会话加固：access token 移出 localStorage → httpOnly cookie + CSRF double-submit（Yggdrasil Bearer 保留给启动器/游戏客户端）
- Caddyfile 生产模板：自动 TLS、路由 web、安全头兜底；CDN 场景 `*_TRUSTED_PROXIES` 配置文档化（Cloudflare 段）
- 审计日志（管理操作 + clientip 记录的来源 IP）、配额（上传数量/大小）、举报 + 皮肤审核队列
- HTML 邮件模板（mailer.Message.HTML 已预留）；备份/恢复 runbook + 脚本
- Prometheus 告警规则 + Grafana dashboard 模板；k6 压测基线并回填 overview §6 分级数据
- 验收：按文档从零运维小站两周无手工干预；双副本部署登录态/限流/OIDC 正确；发布 `v0.2.0`

### Phase 3 — Hoard 用户体系与开放上传（预计 6–8 周）

目标：普通用户不需要管理员 token 就能发布 mod；在此之前 Hoard 不宣传为 Modrinth 替代。按上方身份架构决策执行：

后端：
- Hoard OIDC RP：授权码流（发现文档/JWKS 校验/nonce）、web 会话 cookie；配置 `HOARD_OIDC_ISSUER/CLIENT_ID/SECRET`
- 迁移：`users` 投影表、`teams`/`team_members`、`personal_access_tokens`（sha256 哈希存储、scopes、过期、last_used）；`projects.team_id`（可空，兼容存量管理员上传）
- 用户级上传：`POST /v2/project`（Modrinth 形 multipart）经会话/PAT 鉴权 + 所有权校验；管理员队列保留
- mod 元数据解析：读 jar 内 `fabric.mod.json` / `(neo)forge mods.toml` / `quilt.mod.json` → 自动 loaders/game_versions/license/icon/名称描述，与表单冲突时标旗
- 版本依赖：`version_dependencies`（required/optional/incompatible/embedded）+ `GET /v2/project/{id}/dependencies`；mrpack 完全合规（dependencies 版本、overrides、env）
- 搜索 facets 透传 + Meili `total_hits` 补全（旧 TODO）

前端：
- mod 详情页（版本列表/changelog/文件/依赖）、创建项目+发版向导、teams 管理、PAT 管理
- mods 模块登录改走 Hoard 会话（OIDC 跳转），与 skins 模块的 Yggdrasil Bearer 并存于统一 auth context

验收：SSO 注册→建项目→传 jar（元数据自动填充）→发依赖→生成 mrpack→Prism 安装，全程零管理员 token。

### Phase 4 — 生态扩展（持续，按需启动）

- i18n 扩语言（目标 15+，接 Crowdin/Weblate）
- Compass 原生启动（piston-meta + assets + authlib-injector 注入）或先做 Prism 账号深度集成；补 CI/自动更新；`launch` 白名单化
- 上游镜像代理（Modrinth/CurseForge 冷启动）；插件/Webhook；Isles/Atlas 建仓评估
