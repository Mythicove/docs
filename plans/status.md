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
| `web` | Next.js 16 App Router。**皮肤库列表/详情已改 RSC 服务端渲染**（搜索/排序/分页/评论区/应用到我的皮肤），其余页面仍为客户端渲染。landing/注册/登录(OAuth+忘记密码)/邮箱验证与重置落地页/上传皮肤披风(profile)/3D 预览/管理后台/mod 列表+上传。类型由 OpenAPI 契约生成。**零前端测试；token 存 localStorage；管理后台手贴 admin token。** |
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
- ~~OIDC token 仍存内存~~ ✅ 已落 Postgres（含客户端跨副本感知）；~~`account.mojangStates` 进程内~~ ✅ 已落 cache
- 皮肤库仍缺：标签体系、2FA、举报、配额
- 邮箱校验 `validEmail` 仍偏宽松；多数请求体未跑 validator
- Hoard **无用户/组织/团队/API Token**（只有管理员 token）→ 不是 Modrinth 替代品；无版本依赖关系、上传不解析 mod 元数据、无上游镜像代理、搜索无 facets 透传到 UI
- Meili 分支 `total_hits` 仍是近似

**前端 / 启动器**
- 全客户端渲染问题已在皮肤库解决（列表/详情 RSC SSR）；其余页面（mods/profile/登录注册）仍为客户端渲染；无 mod 详情页；token 仍存 localStorage（P2 换 httpOnly cookie）；~~管理后台手贴 token~~ 已改会话登录（token 为救援通道）
- 零前端测试（无单测/Playwright，W4）；compass 无 CI、`launch` 直接执行 UI 可编辑的程序名、下载全量入内存无进度/校验

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

> **进度（2026-10-23）**：W1 后端✅（详情/评论读删/搜索排序分页/apply 全部落地，单测+真 PG 集成+11 项运行时冒烟全过，spec 同步且漂移门绿）；W2✅（皮肤库两页 RSC SSR + 搜索/排序/分页/评论区/apply + toast(sonner) + error/loading 边界 + admin 页 Tabs/Table 组件化，SSR 真渲染验证过，`API_URL_INTERNAL` 已进 compose）；W3✅（admin **会话登录**上线：后端 AdminAuth 本就支持 role=admin 会话，web 管理面板改用登录会话、手贴 token 降级为救援通道、hoard token 独立输入；CORS 收窄为可配白名单 `*_CORS_ORIGINS`，mirror 回退 WEB_URL，运行时验证允许/拒绝/PATCH 预检/会话 200/非管理员 403 五项全过）。**W4✅（Phase 1 完成）**：Playwright E2E 全链路**本地真跑通过**并进 CI（注册→mailpit 收验证邮件→验证→登录→上传皮肤→发布到皮肤库→SSR 搜索→详情点赞/评论/应用）；gofmt 门 + 存量格式化；mirror/hoard/web CHANGELOG；profile 页补"发布到皮肤库"UI。E2E 抓出并修复两个真 bug：**SMTP 邮件从未发出**（go-mail host/port 误用 + 默认强制 STARTTLS + 错误被 `_ =` 吞掉；现按端口/凭证自动选 TLS 策略、发送失败进日志）与 **profile 上传 playerName 恒为空**（auth 异步恢复后 state 不回填，UI 上传从未通过）。v0.1.0 tag 已打（本地，待 push）。

后端（W1，先行，前端依赖它）：✅
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

**状态（2026-10-23）：全部工程项完成 ✅，`v0.2.0` 已发布**；剩余"两周无手工干预运维"验收待真实部署窗口。

- 多实例正确性：~~fosite storage 落 Postgres~~✅（`pgstore.OIDCStore`，JSONB 全量会话 + 惰性 GC；双副本真机验证：A 发码 B 换 token、跨副本 refresh 轮换、重放拒绝、userinfo claims 完整；顺带修复两个存量 bug——consent 后从未 GrantScope 导致 id_token 永远发不出、userinfo sub 恒为空；客户端缓存未命中节流重载解决跨副本注册感知）；~~`mojangStates` 落 cache~~✅；~~`ratelimit` Redis 实现~~✅（`internal/redislimit`，Lua 原子 INCR+PEXPIRE，双副本共享计数真机验证 10 过/14 拒）；**goose 迁移加 advisory lock**（双副本并发启动竞态，真机复现后修复）
- ~~web 会话加固~~✅：access token 移出 localStorage → httpOnly cookie（`mythic_session`，SameSite=Lax+Secure，7d）；Next route handlers `/api/auth/login|logout|session`（BFF：token 只在服务端经手，响应仅回非敏感 meta）；mirror `BearerToken` cookie 回退（Auth/AdminAuth 共用；启动器 Bearer 头不受影响）；CORS 白名单时 AllowCredentials；登出服务端 invalidate；CSRF=SameSite Lax+JSON-only 双层阻断（cookie 路径无表单可达端点）；E2E 增断言：localStorage 无 token、document.cookie 读不到会话
- ~~Caddyfile 生产模板~~✅：`docs/deploy/Caddyfile.prod`（自动 TLS、双域名路由、安全头兜底、mirror 会话亲和作 OIDC 过渡措施，`caddy validate` 通过）
- ~~审计日志~~✅：`audit_log` 表（migration 00008），全部管理操作记录 actor（token/user:id）+ 来源 IP（clientip），`GET /api/admin/audit` + 后台"审计日志"页签；集成测试 + 运行时验证
- ~~配额（上传数量/大小）~~✅：mirror 存储配额（migration 00010 `files` 登记表按上传者归属 + sha256 去重、`users.storage_tier` 分级、`MIRROR_QUOTA_STORAGE_BYTES/TIERS/PUBLISHED`；登记→检查→超限回滚，重传同图不误拒）+ 发布数量配额（413）；hoard 单文件上限 `HOARD_MAX_FILE_BYTES`（默认 512MiB，413）；memstore/PG 双实现测试
- ~~举报 + 皮肤审核队列~~✅：migration 00011（`reports` 表 + `skinlib_items.status`）；`POST /reports`（登录用户，同目标唯一 409）；`MIRROR_SKIN_REVIEW=true` 发布进 under_review（公开列表零泄漏）；admin `reports`/`skins` 端点 + 后台"举报/皮肤审核"页签（驳回/删除并结案/批准/下架/退回）；全部落审计；memstore+PG 集成测试 + 真机 HTTP 全流程验证（204/409/404/队列过滤/批准上架/审计记录）
- ~~HTML 邮件模板~~✅：multipart/alternative（SMTP）+ html（Resend），i18n intro/button/footer 三段式；**E2E 抓出并修复 SMTP 从未送达**（go-mail host/port 误用 + 强制 STARTTLS + 吞错）
- ~~备份/恢复~~✅：`docs/deploy/backup.sh` + `backup.md`（pg_dump custom + 卷打包 + 保留策略 + 恢复演练要求）
- ~~Prometheus/Grafana~~✅：`docs/deploy/observability/`（告警规则 promtool 校验过、dashboard JSON、抓取配置；hoard 补齐 /metrics）；~~k6 压测基线~~✅：`docs/deploy/k6/`（读 20→50VU p95=4.5ms 0 错误；写 5VU 登录+上传+发布 checks 100% p95=63ms；阈值即 SLO 草案，生产验收在目标硬件重跑记录）
- 验收：按文档从零运维小站两周无手工干预（待真实部署窗口）；~~双副本部署登录态/限流/OIDC 正确~~✅（限流/OIDC/正版绑定/迁移均已双副本真机验证）；~~发布 `v0.2.0`~~✅（mirror/hoard/web/api 同步 tag；web 会话为破坏性变更：AuthState 不再含 accessToken）

### Phase 3 — Hoard 用户体系与开放上传（预计 6–8 周）

目标：普通用户不需要管理员 token 就能发布 mod；在此之前 Hoard 不宣传为 Modrinth 替代。按上方身份架构决策执行：

后端：
- ~~Hoard OIDC RP~~✅（W1，2026-10-23）：`internal/oidcrp`（go-oidc v3：discovery/JWKS 轮换/签名/iss/aud/exp/nonce 全校验，机密客户端）；migration 00002（`users` 投影 + `sessions`）；`/auth/oidc/login|callback`、`/auth/logout`、`/auth/me`；state/nonce 短期 httpOnly cookie；会话 cookie `hoard_session`（httpOnly+Lax，7d，服务端可撤销）；投影 upsert **重登不覆盖已提升的 role**；`HOARD_ADMIN_SUBJECTS` 白名单幂等映射 admin；CORS 白名单允许凭证；spec 漂移门绿；mem+PG 测试；**真机 SSO 全流程打通**（mirror IdP：login→consent→code→callback→me(role=admin)→logout→401，投影/会话落 PG 验证）
- ~~迁移：`users` 投影表、`teams`/`team_members`、`personal_access_tokens`~~✅（W2，migration 00002/00003）：投影表 + 服务端会话（W1）；teams 两级角色（owner 管成员/删项目，member 传版本）；PAT `mhp_` 前缀明文仅创建时返回一次、sha256 哈希存储、scopes、过期、last_used、可撤销；`projects.team_id` 可空兼容存量；mem+PG 集成 + HTTP 全链路测试（401/403/撤销即失效/明文不泄漏）
- ~~用户级上传~~✅（W3）：`POST /v2/project`（Modrinth 形 multipart data+file，自动建团队归属）、`POST /v2/version`（团队成员校验）、`DELETE /v2/project/{id}`（owner/admin）；PAT scopes 强制（声明 scopes 须含 UPLOAD）；`HOARD_REQUIRE_REVIEW` 审核开关接线；管理员 `/api/mods` 队列保留；spec 漂移门绿
- ~~mod 元数据解析~~✅（W4）：`internal/modmeta` 解析 jar 内 `fabric.mod.json`/`quilt.mod.json`/`META-INF/(neo)forge.mods.toml`（BurntSushi/toml）→ 自动填充 title/description/loaders/game_versions（minecraft 依赖下界）/license/version/icon；表单优先、冲突写 `metadata_flags`（title/description/loader/game_versions_mismatch）；icon 提取入对象存储 + `GET /api/mods/{id}/icon` 直出；migration 00004（license/icon_key/meta_flags 列）；非 jar/损坏元数据静默兼容；7 项解析单测 + 上传集成测试
- ~~版本依赖~~✅（W5）：migration 00005 `version_dependencies`（required/optional/incompatible/embedded，Modrinth 形）；`POST /v2/project|version` data 带 `dependencies[]`（非法类型 400）；`GET /v2/project/{id}/dependencies`；mrpack 完全合规增强：`dependencies.minecraft.version`（版本级 game_versions 优先）、`env.client/server`（映射 client_side/server_side）、`overrides/` 目录；deps+mrpack 集成测试
- 搜索 facets 透传 + Meili `total_hits` 补全（旧 TODO）

前端：
- mod 详情页（版本列表/changelog/文件/依赖）、创建项目+发版向导、teams 管理、PAT 管理
- mods 模块登录改走 Hoard 会话（OIDC 跳转），与 skins 模块的 Yggdrasil Bearer 并存于统一 auth context

验收：SSO 注册→建项目→传 jar（元数据自动填充）→发依赖→生成 mrpack→Prism 安装，全程零管理员 token。

### Phase 4 — 生态扩展（持续，按需启动）

- i18n 扩语言（目标 15+，接 Crowdin/Weblate）
- Compass 原生启动（piston-meta + assets + authlib-injector 注入）或先做 Prism 账号深度集成；补 CI/自动更新；`launch` 白名单化
- 上游镜像代理（Modrinth/CurseForge 冷启动）；插件/Webhook；Isles/Atlas 建仓评估
