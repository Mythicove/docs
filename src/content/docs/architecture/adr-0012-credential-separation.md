---
title: ADR-0012 凭证分离：网站主密码与启动器独立密码
---

- 状态：已接受
- 日期：2026-10-27

## 背景

Mirror 此前只有**一个**密码凭据（`users.password_hash`，Argon2id）和**一个**校验原语（`Store.Authenticate`），被四处共用：网站登录 `/account/login`、启动器 `/authserver/authenticate`、`/authserver/signout`、以及 OIDC IdP 的登录表单 `/oauth2/login/accept`。一个凭据同时服务两个信任域，带来三个具体后果：

1. **无法只关掉密码登录。** 想把站点切成"完全第三方登录"，就等于同时切断启动器登录——而启动器（Yggdrasil 协议）没法走浏览器重定向，第三方登录对它不可用。
2. **`login_methods` 是装饰品。** 后台那个"密码登录"开关只有 `internal/admin` 读它，`account`/`yggdrasil`/`oidc` 一律不读；关掉之后三个校验点全都照常放行，web 登录页的密码表单也无条件渲染。也就是说"禁用账号密码登录"这个能力**当时并不存在**。
3. **第三方绑定不留痕。** GitHub 登录只按 email 匹配既有账号，匹配上就直接登入，数据库里不记录"这个账号绑过 GitHub"。于是"该账号是否纯密码用户"根本无法判定，任何依赖它的策略都无从实施。

同时，"当前玩家"（`users.active_player_uuid`）这个指针在多玩家账号下语义含糊：启动器登录时它决定你以谁的身份进服，但用户在启动器里无从选择，只能回网站改指针。

## 决策

- **启动器凭证按玩家发放，与主密码彻底分开。** 新表 `player_credentials(player_uuid, name, password_hash, created_at, last_used_at)`。`/authserver/authenticate` 的 `username` 是**玩家名**、`password` 是该玩家的**独立密码**；主密码在协议端点上完全不被查询。一个玩家可持有多条（按设备/用途区分），上限 3 条。
- **主密码只服务人类登录面**：`/account/login`、`/oauth2/login/accept`、密码重置。三者共用 `yggdrasil.CheckPasswordLogin` 这一份规则实现。
- **网站会话不代表任何玩家。** `sessions.player_id` 对网站/OIDC 会话为空串，只有启动器会话钉住玩家。`/account/login` 的响应因此不再包含 profile 段（新形状 `LoginSession{accessToken, clientToken}`）；前端显示/操作哪个玩家由 `GET /account/players` 里选，选择存浏览器本地。
- **删除"当前玩家"指针**（migration 00013 `DROP COLUMN active_player_uuid`，`Player.active` 字段、`POST /account/players/{name}/activate`、`Store.PlayerByUser`/`SetActivePlayer` 一并删除）。启动器按玩家名直接定位玩家，指针失去了唯一的存在理由。
- **`sessions.credential_id` 外键 `ON DELETE CASCADE`**：撤销一条独立密码，由它建立的会话立即消失（不是等 24 小时过期）。这是"凭证泄露后能马上止损"的必要属性，用一个可空列 + 一条外键换来，不需要任何撤销列表或轮询。
- **`player_credentials.player_uuid` 用 `ON UPDATE CASCADE`**：玩家改名会重算 uuid（uuid 由名字派生），凭证跟随玩家本身而不是旧 uuid。改名仍然销毁游戏会话（身份变了），但不销毁凭证——否则改个名字就要重设所有设备的启动器密码。
- **第三方绑定落库**：新表 `user_identities(provider, subject, user_id, email)`，PK `(provider, subject)`。登录时**先认绑定**（provider+subject 命中即登入），未命中才退回按 email 匹配既有账号并当场写下绑定。此后 provider 侧改邮箱、或邮箱被接管，都不再改变账号归属。本站**不提供解绑**：在"强制绑定"策略下解绑等于把账号锁死。
- **策略三项，其中主密码开关不新增**（`admin.AuthPolicy`）：
  - `PasswordLogin` 由 `login_methods` 的 `password` 项推导，**不单独持久化**——同一件事只留一个开关，避免"面板关了但策略还开着"。关闭后：账号密码注册立即停止；主密码登录只对**尚未绑定第三方**的账号放行（宽限）；已绑定的一律 403（稳定错误码 `password_login_disabled`）。
  - `RequireBinding`：未绑定第三方的账号不能用皮肤上传/皮肤库发布与应用/启动器登录/SSO。账号管理、绑定流程本身、举报与评论**不受限**，否则用户会被锁在"必须先绑定才能进绑定页"的死循环里。实现是 `CheckBinding` 一份规则 + 两种施加方式：已认证路由挂 `RequireBinding` 中间件，启动器登录（无会话）内联调用。
  - `MaxPlayers`：单账号玩家数上限，默认 1。存量超额账号不回收，只是不能再加。
- **"纯密码账号还有多少"只做提示，不做门禁。** `CountPasswordOnlyUsers`（`password_hash <> '' AND status='active' AND email_verified AND NOT EXISTS(identities)`，走 `users_password_only` 部分索引）只在管理面板打开时算一次。登录热路径上的判定是"**这个账号自己**有没有绑定"——而登录本来就要读用户行，不增加查询。于是宽限集合自然收缩，归零那一刻主密码登录已无人可用，**不需要第二个开关，也不需要自动切换状态**。
- **`Signout` 语义收窄并真正实现**：此前它校验密码后什么也不删（一个纯粹的 no-op）。现在校验「玩家名 + 独立密码」后销毁**该玩家**的游戏会话。协议原文是"注销该账号所有令牌"，但凭证属于单个玩家，用一条玩家凭证去清掉同账号其他玩家的会话并不合理，故按玩家收窄（网站会话 `player_id` 为空，天然不受影响）。
- **`availableProfiles` 只含认证到的那一个玩家。** 一条独立密码只证明它所属玩家的身份；同账号下别的玩家各有各的密码，不该因为知道其中一条就被列出来。这也让"进服身份"与"启动器里看到的身份"必然一致（此前的 bug 类）。
- **顺带修掉三个既有缺口**（都是本次改动的必经之路）：`GetUserAuth` 加 `status='active'` 过滤（此前 banned/suspended 照样能拿会话）；`/oauth2/login/accept` 挂上 `"auth"` 限流桶（此前它是全站唯一能无限速试主密码的端点）；`login_methods` 的 `password` 开关真正强制生效。

## 后果

- 正：
  - 站点可以真正切到"仅第三方登录"，而启动器不受影响——这是做启动器产品的前提。
  - 一个凭据不再横跨两个信任域：网站密码泄露不等于游戏身份被接管，反之亦然；启动器凭证可以按设备撤销。
  - 撤销即时生效（外键级联），不需要会话黑名单或短 TTL 折衷。
  - 绑定关系落库后，账号归属不再依赖"provider 返回的 email 恰好没变"。
  - 删掉了 `active_player_uuid` 一整套机制（列、两个 store 方法、一个端点、`Player.active` 字段、web 的"设为当前玩家"按钮），换来"登录时输入谁的名字就是以谁的身份进服"这一条更直白的规则。
- 负 / 破坏性变更：
  - **启动器登录的用户名从邮箱变成玩家名**，且必须先在网站为该玩家建一条独立密码。存量部署升级后，所有用户在补齐独立密码之前都无法从启动器登录（网站登录不受影响）。Compass 已同步改；第三方启动器（HMCL/Prism + authlib-injector）需要用户改填玩家名。
  - `/account/login` 响应形状变了（不再有 `availableProfiles`/`selectedProfile`），`/account/exchange-code` 不再返回 `playerName`/`playerId`；`Player.active` 从契约中移除。web BFF 与前端已同步。
  - **登录成本随凭证条数线性增长**：Argon2id（m=64MiB, t=1, p=NumCPU）没有可用的快速查找键，失败尝试要把候选哈希逐条校验。上限设为 3 条（`account.MaxCredentialsPerPlayer`）并靠 `last_used_at DESC` 让常用凭证先命中，把这个放大控制在可接受范围。若将来要放宽条数，正确做法是加一个服务端 pepper 的 HMAC 快速查找列，而不是直接调大常量。
  - 不提供解绑第三方：用户换 GitHub 账号时只能由管理员介入。这是"强制绑定"策略下的自觉取舍。
  - 玩家名成为登录标识的一部分，因此**改名会改变启动器登录名**（凭证保留，但要用新名字登录）。改名前已有确认提示。
- 未处理（记入台账，不在本次范围）：
  - `sessions` TTL 24h 与 web cookie `maxAge` 7d 仍不一致（cookie 比会话多活 6 天，之后每个请求都 401 而浏览器还以为自己登录着）。
  - memstore 的会话不过期（与 pgstore 的 24h 不一致），测试因此覆盖不到过期路径。
  - `email_verified` 仍不参与任何门禁：未验证邮箱的账号可以正常登录（本次没有顺手改，因为无 SMTP 的部署会因此把所有人锁在门外，那是一个独立的策略决定）。
