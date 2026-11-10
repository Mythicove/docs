---
title: Minecraft 生态整合实施计划
description: Web、Compass、服务器与可选插件整合的交付顺序、验收和执行台账。
---

## 执行约定

用户已授权按阶段开发、提交并推送（2026-11-09）。全部调研项进入本计划，每项完成以可运行的用户流程和验证证据为准。仅有入口不算完成深度适配，未完成项继续保留。

状态：待做 / 开发中 / 已交付 / 外部验证待办。既有工作树包含其他开发内容，新增阶段单独提交，不将不相关未提交代码纳入生态整合提交。

## 交付顺序

| 阶段 | 内容 | 验收 | 状态 |
|---|---|---|---|
| E0 | 两份调研、全部候选计划与依赖关系 | 文档构建通过，计划可追踪 | 已交付 |
| E1 | Isles 基础：持久化服务器、公开/管理 API、秘密隔离、Java/Bedrock 状态 | HTTP 场景验证配置→公开读取→状态及未授权拒绝 | 已交付 |
| E2 | Web 服务器目录、详情、集成后台及代理鉴权 | 真后端页面流程，普通用户不能管理；未配置可独立运行 | 已交付 |
| E3 | MCSManager、Pterodactyl 的实例发现/控制/日志，监控接口 | 测试上游协议边界，真实目标面板验证另记版本 | HTTP 常用操作已交付；真实面板、实时流及历史监控待做 |
| E4 | packwiz 与 `.mrpack`、Modrinth/Hangar 来源、资源包 | 发布不可变版本，客户端/服务端分离，真实包安装 | packwiz 发布与 Modrinth/Hangar 搜索已交付；Compass 安装、资源包和不支持格式待做 |
| E5 | 游戏 Bridge：平台连接、游戏身份验证、基础状态 | 真服启动与 HTTP 交互，连接撤销和 UUID 授权 | Paper 路径已交付；其他平台待做 |
| E6 | LuckPerms、spark、PlaceholderAPI、Plan | 成员资格、性能摘要、本人资料与面板入口 | 全局权限组、占位符、性能及 Plan 本人/聚合首批已交付；上下文与报告等深入功能待做 |
| E7 | 游戏世界、治理、跨平台与社区扩展 | 每种实际支持平台有测试/真服证据 | ViaVersion、WorldGuard、Vault、Chunky 与 Towny 首批已交付；其他项目和深层联动待做 |
| E8 | Web 社区视觉、分组后台；Compass grasscn 与启动核心流程 | 中文/键盘/小窗口、实际启动与错误/下载进度 | Compass 首页 grasscn 首批已交付，其他页面和 Web 门户重设计待做 |

## 全部候选交付清单

每个项目都有独立状态；单个集成不会强制其他集成安装。

| 项目 | 最小有用交付及深入目标 | 依赖 | 状态 |
|---|---|---|---|
| MCSManager | 连接测试、选择实例、启停重启、命令、近期日志；实时日志和可选 OIDC | E1/E2 | HTTP 适配已交付；真面板、实时流、SSO 待做 |
| Pterodactyl | Client API 选择服务器、资源、power、command、WebSocket | E1/E2 | Client HTTP 适配已交付；真面板和 WebSocket 待做 |
| BlueMap | 地图入口/嵌入、权限与网关说明；世界/地标/皮肤关联 | E1/E2，深度需 Bridge | 地图配置、独立嵌入页与保存视角已交付；真地图、标记与皮肤待做 |
| squaremap | 已有地图入口、地图标记适配 | E1/E2，深度需 Bridge | 地图配置与独立嵌入页已交付；真地图与标记适配待做 |
| Dynmap | 已有地图入口、官方标记 API | E1/E2，深度需 Bridge | 地图配置与独立嵌入页已交付；真地图与标记适配待做 |
| packwiz | 源检查、版本发布、`.mrpack` 导出/安装、可选项与服务端分离 | E1，Hoard/Compass | 待做 |
| AutoModpack | 独立实例安装/共存、服务端配置指引；协议适配单独验证 | Compass | 共存/独立实例指引已交付；同步协议与实例真验收待做 |
| Modrinth | 搜索/版本/哈希识别，选定版本安装，保留来源 | Hoard/Compass | 搜索、兼容版本、上游下载及哈希展示已交付；按文件哈希识别和 Compass 安装待做 |
| Hangar | 插件搜索/版本/下载来源，平台过滤 | E1/E2 | 搜索、按平台版本/下载/哈希已交付；服务端安装待做 |
| Polymer | 资源包版本/产物链接、AutoHost 接入；发布本站产物 | 资源包分发 | AutoHost 部署指引已交付；产物采集/发布待做 |
| SkinsRestorer | 已验证身份应用本站皮肤，持久/临时和代理模式验证 | Bridge、Mirror | 待做 |
| LuckPerms | 本站负责的成员组授予/撤销、上下文及状态读取 | Bridge、身份绑定 | 全局组授予/撤销及读取已验证；上下文/到期待做 |
| PlaceholderAPI | 站长选定的玩家资料展示项；不可用结果明确 | Paper Bridge | 已交付；真服 Server expansion 解析通过 |
| Plan | 既有分析入口、访问隔离；本人活动与聚合资料 | E1/E2，深入需 Bridge | 5.9/3705 + SQLite 真服验证已存会话、离线本人资料、当前服聚合及重启持久性；面板沿用自身鉴权，MySQL/代理/SSO 待验收 |
| spark | TPS/MSPT/CPU/GC、报告链接，支持范围明确 | Bridge | TPS/MSPT/CPU 已验证；GC/报告入口待做 |
| Prometheus Exporter | `/metrics`、`/health`，历史监控接已有 Prometheus | E1/E2 | 待做 |
| Geyser / Floodgate | Java/Bedrock 入口、基岩探测、验证后的跨平台身份 | E1，身份需 Bridge | loopback 未签名 Bedrock 协议真客户端验证绑定、版本、实际 Bukkit UUID 白名单与 UDP 探测；Xbox 在线认证、真实 Java 关联、代理及双入口配置待验收/完善 |
| ViaVersion / Backwards / Rewind | 实际支持版本范围与进服检查 | Bridge、Compass | ViaVersion 5.12.2 协议范围与在线玩家版本已真服验证；Backwards/Rewind 与 Compass 检查待做 |
| WorldGuard | 领地/成员只读、地图定位；授权管理 | Paper Bridge | 本人领地/角色/世界/中心坐标已真服验证；地图覆盖层与授权修改待做 |
| Towny | 城镇/国家/居民/招募与地图；授权管理 | Paper Bridge | 0.103.2.0 flatfile 真服验证城镇/国家概况、本人角色/职级、离线重启及移除；公开招募、地图与授权修改待做 |
| FTB Teams / Chunks | 团队、领地及实际强制加载状态 | 对应模组平台 Bridge | 待做 |
| FTB Quests | 任务定义、本人/团队进度只读，隐藏规则 | 对应模组平台 Bridge | 待做 |
| CoreProtect | 举报坐标关联历史查询；回滚/恢复作为独立管理流程 | Paper Bridge | 待做 |
| Ledger | Fabric 历史查询/举报关联，先确认支持接口 | Fabric Bridge | 待做 |
| LibertyBans | 本人处罚、管理查询、申诉；授权处罚操作 | Bridge、身份绑定 | 待做 |
| Vault | 本人余额/货币格式；交易需单独完整语义 | Paper Bridge、Economy provider | Vault 1.7.3 + EssentialsX Economy 2.21.2 只读余额/格式已真服验证；不提供交易 |
| DiscordSRV | 复用已验证绑定和事件、身份/成员关联 | Paper Bridge | 待做 |
| Simple Voice Chat | 包依赖、部署诊断与指引；游戏内状态 | Compass，深入需 Bridge | 2.6.25 / Paper 路径已验证兼容客户端握手、加密 UDP 连接、声音禁用/恢复、超时及离线清理；客户端/UDP/代理指引已交付，实际音频与公网/代理部署待验收 |
| itzg/docker-minecraft-server | 固定版本 Compose 示例、packwiz/资源/网络配置 | E4 | 固定镜像 Paper 模板及 packwiz overlay 已解析验证；目标容器运行待验收 |
| Chunky | 预生成任务发起、进度/暂停/取消与维护状态 | Bridge 或面板命令 | 1.4.40 真服验证正方形/圆形、进度/ETA、暂停重启续传、运行中/暂停后取消及完成；后台管理已交付，不自动设置停服维护 |

## 基础设计与验证

- 公开站点数据和管理秘密使用不同响应，密钥不出现在公开配置、日志或浏览器地址。
- 优先验证协议和现有安装器，避免为单项能力新造同类框架。
- 没有实例或插件的功能标明未连接/不支持，不用零值伪造成功。
- Java/Bedrock 探测是游戏可连接性，面板进程状态单独呈现。
- 记录具体服务端平台、MC、插件版本，真实外部环境测试与 HTTP 协议测试分开记录。
- E2 首次交付复用 Mirror 已有管理员校验，通过服务器端 BFF 调用 Isles；不将游戏 token 或主密码作为 Isles 管理凭据。

## 执行记录

- E0：调研和本计划纳入 docs；docs 构建验证。
- E1/E2：`mythic-isles` 已建仓并推送；持久化目录、加密连接令牌、Java/Bedrock 探测、MCSManager/Pterodactyl 常用操作、Prometheus 指标和 packwiz URL 源发布。HTTP/TCP/UDP 场景与 race 检测通过；面板真实部署、实时控制台和不支持的 packwiz 模式继续保留待办。
- Web：`/servers`、服务器详情、`/admin/integrations`、服务端 BFF 与中英界面完成；Playwright 使用真实 Isles 进程跑通发布→前台浏览→链接，验证匿名管理 401、跨站写入 403、玩家不能给他人生成绑定码及 390px 无横向溢出。Web CI、既有 E2E 和新增 Isles E2E 均绿（`6c4647b`）。
- E5/E6 首批：Java 21 Paper/Spigot Bridge 完成。Purpur 1.21.1 build 2329 真进程 + Mineflayer 1.21.1 玩家验证心跳、游戏内一次性 UUID 绑定、白名单任务；LuckPerms 5.5.71 验证成员组授予和撤销；PlaceholderAPI 2.12.3 + Server expansion 验证资料解析；内置 spark API 服务验证 TPS/MSPT/CPU。结果保存在本地场景目录，脚本 `bridge/paper/test/live.mjs` 可复跑。
- 真服发现：内置 spark 不作为普通 Bukkit 插件列出，改为发现公开 Spark service/provider；没有数据不回填虚假 TPS。成员操作以持久化 desired-state 队列执行并回报 pending/applied/failed。
- E4 内容来源：`/catalog` 完成中英文搜索、来源切换、平台/游戏版本筛选、版本列表、原站下载和上游哈希展示。Isles 使用部署级固定源、2MiB 响应上限、一分钟缓存、16 条缓存容量及每进程 60 次/分钟出站预算。生产 HTTP 场景覆盖筛选组合、缓存、无效输入、版本元数据、超大响应和预算；Playwright 两个场景通过（含移动端），真实 Modrinth Fabric API 与 Hangar ViaVersion 元数据读取通过。没有把“上游声明哈希”当作实际下载验证，也没有将目录阶段记成插件自动安装完成。
- E7 首批：ViaVersion 5.12.2 与 WorldGuard 7.0.12 / WorldEdit 7.3.9 在 Purpur 1.21.1/2329 真服通过。观察服务端允许协议和实际客户端版本，创建真实矩形区域并加入已绑定玩家，验证私有资料返回成员角色及中心坐标、无物理范围的模板区域不会误显示。后端覆盖个人授权/公开数据隔离，Web 的独立生产构建场景通过“生成码→Bridge 绑定→上报→本人领地/客户端版本”。地图覆盖层、区域修改与其他平台没有提前销项。
- E8 Compass 首批：grasscn Button/Input/Progress 与离线字体/材质接入首页，新增选择实例、账号门槛、启动失败重试、运行/停止和文件进度。CSS 先声明层次，旧全局控件样式处于 legacy 层，避免覆盖 MC 控件。保留既有品牌色与 skinview3d；中文正文不强制像素字。Chromium IPC 边界场景验证中文长名称、独立密码、重试/停止、125%/150% 与最小窗口无横向溢出；Windows Tauri/WebView2 实机验证中文输入、离线资源和无账号禁用启动。Mac/Linux、实际从新首页启动游戏，以及实例/设置/日志页的控件迁移仍保留待办。另从暂存区独立导出构建，验证发布内容不依赖其他未提交 Rust/账号改动。
- E8 Web 首批：配置并发布服务器后，首页采用真实站点名称/介绍、服务器/世界截图、游戏连接状态、地图与整合包入口及个人资料导航；不再以 Yggdrasil 技术介绍作为服务器社区首屏。未启用服务器的部署保留现有皮肤/模组入口，不增加人工“首页模式”开关。服务器数据按请求读取，构建期未连接 Isles 不会把空目录固化。独立生产构建浏览器场景验证发布后首页自动变化、原技术徽标不再出现，以及 390px 无横向溢出。
- 地图首层：服务器配置新增 BlueMap/squaremap/Dynmap 类型及浏览器地址，`/servers/{id}/map` 保留原工具与视角 fragment，加载独立 iframe，提供新标签页入口。不由 Go/Next 代理地图 tile。外部 iframe 来源由构建期 CSP 精确配置，未允许的来源给出提示，不全局放开。HTTP 场景验证地址/类型/草稿公开边界，生产 Web 场景验证配置→保存→嵌入外部工具→保留视角→移动端；没有将 fixture iframe 验证冒充真实地图渲染或标记 API 验证。
- 自部署配方：新增[私服整合包、资源包与语音指南](../guides/private-modpack-workflows.md)及固定 itzg manifest 的 Paper Compose、packwiz/Fabric overlay。Compose 配置解析通过；实际 Docker 运行尚未验证，本机容器查询曾超时，不将模板阶段记为容器运行交付。workspace 根 `go.work` 已加入 Isles（根目录无 git，服务仓库自身可独立构建）。
- Vault 首批：真实 Vault 1.7.3 / EssentialsX Economy 2.21.2 / Purpur 1.21.1 验证已绑定玩家余额、provider 名称、货币名和 provider 格式；本人网页资料展示通过。原始浮点值与显示格式保持上游结果，没有擅自把数值转为精确分币或改写格式；只读适配不暴露交易操作。历史 EssentialsX 对此服务端有版本警告，记录的是已跑通的特定 API 路径，不是认证全部上游功能兼容。
- Chunky 首批（2026-11-10）：Purpur 1.21.1/2329 + Chunky 1.4.40 真进程生成正方形与圆形选区，读取实际区块进度/ETA；验证暂停→重启服务器→继续、运行中取消、暂停后取消、小范围 25 区块完成。任务操作复用既有队列，新增持久化领取后执行，丢失回执不会自动重放非幂等操作；HTTP 场景覆盖授权、参数、状态前置条件、重复领取、服务重启和回执失败。未装 Chunky 的真服回归绑定与白名单通过。
- 真服暴露的状态边界：Chunky 1.4.40 可能先保存零计数终止点，再由异步回调报告 100%。Bridge 读取真实任务生命周期事件，区分运行期对象与存档；重启后无法从终止存档证明完成或取消时报告 `stopped`。生产浏览器场景使用真服记录的上游观察，走真实 Web/BFF/Isles 领取与回执链路，验证自动进度、刷新后暂停状态、取消确认、390px 布局与令牌撤销禁用。记录样本位于 `web/e2e/fixtures/chunky-observations.json`。尚未提供自动维护模式，生成本身不会限制玩家登录。
- Plan 首批（2026-11-10）：通过官方 Query API 后台只读查询，按当前 Plan server UUID 限定存档会话，导出服务器聚合及已验证 UUID 的个人活动。Purpur 1.21.1/2329 + Plan 5.9/3705 + SQLite 真服记录已绑定玩家与未绑定访客，两人的会话均计入聚合，但仅前者个人明细被采集；验证退出、重启后本人仍可读取。HTTP 与生产浏览器场景覆盖所有权、Bridge 跨服令牌隔离、公开目录不含统计、管理员聚合和查询不可用不伪造零。原生记录用于 `web/e2e/fixtures/plan-observations.json`；未将已存会话当作实时在线计数，也未改动 Plan 面板认证。
- Towny 首批：Towny 0.103.2.0 / flatfile / Purpur 1.21.1/2329 实际创建城镇和国家，识别镇长/国王；加入未绑定访客、转移镇长并授予 assistant，验证离线重启后本人关系保持、踢出后不残留。概况仅管理员可见，个人明细仅已验证 UUID，复用 Bridge 心跳与身份清单。`public` 明确解释为公开传送，不等于网站公开权限；不导出传送坐标与居民目录。列表上限 100 各自有完整计数/截断提示，本人关系独立返回。原生记录用于 `web/e2e/fixtures/towny-observations.json`；公开招募、地图覆盖层和授权写操作未销项。
- Geyser/Floodgate 首批（2026-11-11）：Geyser 2.8.3 b941、Floodgate 2.2.5 b141、ViaVersion 5.12.2 与 Purpur 1.21.1/2329 实进程，Bedrock 1.21.100 通过真实 RakNet/加密握手、`start_game` 和游戏内命令完成一次性绑定，实际检查 Bukkit UUID 写入原生白名单；Java 玩家没有被误标基岩。另跑 Geyser 无 Floodgate 路径，验证实际 UDP 探测。本人页分开显示 Bedrock 原始版本和 ViaVersion 转换后 Java 协议；后台读取 Geyser 支持版本。HTTP/生产浏览器场景覆盖个人所有权、公开数据隔离、平台枚举、身份持久化和离线移除在线连接观察。夹具仅 loopback、允许未签名代理连接，XUID 为零；不将它冒充 Xbox Live 或真实 Java 账号关联验收，代理与双入口合并仍保留待办。

- Simple Voice Chat 首批（2026-11-11）：2.6.25 / Purpur 1.21.1/2329 / Java 21 实进程通过官方 Bukkit API 采集兼容客户端、连接与声音禁用状态。仅 loopback 的协议客户端完成 compatibility 20 握手、AES-128-GCM UDP 认证与连接校验，验证声音禁用/恢复、停止 keepalive 后超时、退出后移除观察及重新进服状态重置；未装插件的真服回归通过。复用玩家快照、20 秒心跳及本人授权，未知或缺失状态不回填断开，缺字段/null 的部分观察被拒绝。生产浏览器场景读取真服记录 `web/e2e/fixtures/voicechat-observations.json`，覆盖中英界面、状态变化、390px 布局、所有权/公开隔离及离线清理。2.6.25 API 没有麦克风静音读取；其他附加插件可覆盖连接状态，因此不将观察当作实际音频、公网 UDP 或麦克风可用证明。语音组、音频传输和公网/代理仍待验收。

部署入口见[配置服务器与可选集成](../guides/server-integrations.md)。当前“深度已验证”的平台仅为上述 Paper 兼容环境，不宣称 Fabric/NeoForge/Folia 已支持。

参考：[视觉与总体架构评估](../research/web-and-mc-ecosystem.md)、[可选整合调研](../research/optional-mc-integrations.md)。
