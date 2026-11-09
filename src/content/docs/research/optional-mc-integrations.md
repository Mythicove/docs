---
title: 自部署站点的可选 Minecraft 生态整合
description: 调研整合包、权限、玩家统计、性能、领地、任务、治理、皮肤和社区工具的实际接入价值。
---

## 结论与调研范围

MCSManager 和 BlueMap 只是服务器管理与世界地图两个入口。对 Mythicove 更有长期价值的整合，还包括客户端内容同步、成员与游戏身份、玩家统计、性能监控、领地与团队、任务进度及社区治理。

建议首批重点考虑 **packwiz、LuckPerms、Plan、spark/Prometheus Exporter、PlaceholderAPI 和 Geyser/Floodgate**；将 **AutoModpack、SkinsRestorer、Polymer** 作为面向特定部署的选项。已有地图和面板通过各自适配接入，不要求站长统一更换现有工具。

本页调研于 2026-11-09，依据项目官方文档、官方仓库 README、公开 API 源码及部分公开 HTTP 接口。没有实际安装运行这些插件；“接口已确认”不代表对应 Mythicove 适配器已经实现，也不代表所有 Minecraft 版本均兼容。

## 1. 先区分四种整合方式

| 方式 | 典型项目 | 用户需要什么 | 我们实现什么 |
|---|---|---|---|
| 网页入口/嵌入 | Plan、squaremap、Dynmap | 对应工具及可访问的网页地址 | 服务器导航、页面入口、访问控制和适合嵌入时的页面容器 |
| 远程接口 | Pterodactyl、Prometheus Exporter | 地址及必要的服务凭据 | 后端连接、状态读取、有限的管理操作 |
| 文件/分发协议 | packwiz、资源包 | 包源或发布产物 | 导入、版本与哈希校验、发布和启动器安装 |
| 游戏内 API | LuckPerms、spark、WorldGuard、FTB Chunks | 对应插件/模组及目标平台 Bridge | 通过 Java API 读取数据或执行明确的游戏操作 |

不少 MC 项目所谓的“API”是进程内 Java API，不是 HTTP REST API。网站不能通过输入它的服务器地址直接调用；也不应因此去读写对方内部数据库或解析控制台文字作为首选接口。

“可选”应贯彻到依赖：没有配置就没有额外进程、定时任务和前台入口；只看地图不要求安装 Bridge；安装一个 Bridge 也不要求同时安装所有受支持插件。

## 2. 候选矩阵

难度指 Mythicove 整合的工程成本，不等于工具本身安装难度。中高难度通常涉及游戏内身份、版本适配或写操作。

| 候选 | 用户获得什么 | 主要路径 | 难度 / 建议 |
|---|---|---|---|
| packwiz | 私有整合包发布、可选模组、客户端/服务端内容分离和更新 | HTTP + TOML 清单、现有 installer | 中；优先 |
| AutoModpack | 玩家连接私服时按服同步 mods、配置和资源 | 双端模组及自有同步机制 | 中高；先兼容共存 |
| Modrinth / Hangar | 在站内查找兼容内容、识别版本、查看更新 | 公开 HTTP API | 中；优先内容来源接入 |
| Polymer | 使用其生成的资源包，展示服务器的定制内容入口 | 资源包发布产物、AutoHost | 中；特定 Fabric 社区 |
| SkinsRestorer | 某些现有服不切换认证体系也能应用本站皮肤 | Java API + Bridge | 中高；对现有服接入有价值 |
| LuckPerms | 网页成员资格与指定游戏权限组关联 | Java API + Bridge | 中；优先 |
| PlaceholderAPI | 显示余额、等级、称号、技能等已有插件数据 | Java 占位符解析 + Bridge | 中；优先有限展示 |
| Plan | 玩家活跃度、游玩时间、回访和服务器运营面板 | 自带 Web，深入时用受支持 API | 低起步/中高深入；优先 |
| spark | TPS/MSPT、CPU/GC 摘要及性能分析报告入口 | Java API + Bridge，报告链接 | 中；优先诊断 |
| Minecraft Prometheus Exporter | 历史性能曲线、告警和服务健康 | `/metrics`、`/health` + Prometheus | 低中；已有监控用户优先 |
| Geyser / Floodgate | Java/基岩版进服指引、跨平台身份识别 | 配置 + Floodgate Java API | 中；有跨平台用户时优先 |
| ViaVersion 系列 | 展示正确的客户端版本范围与建议 | 已装组件/配置、Java API | 中；与进服检查关联 |
| squaremap / Dynmap | 兼容站长已有地图与地标生态 | 自带 Web，标记走各自 API | 低起步/中深入；地图可选适配 |
| WorldGuard | 我的领地、成员、区域说明及地图覆盖层 | Java 区域 API + Bridge | 中；生存/建筑服 |
| Towny | 城镇、国家、居民和招募页面 | TownyAPI + Bridge | 中高；城镇服 |
| FTB Teams / FTB Chunks | 团队、领地、区块与强制加载状态 | 模组 API + 对应平台 Bridge | 中高；模组服 |
| FTB Quests | 任务图鉴、个人或团队进度展示 | 模组 API，需进一步验证进度读取 | 高；探索性 |
| CoreProtect / Ledger | 网页举报附带方块历史，管理人员调查入口 | CoreProtect Java API；Ledger 需进一步核实接口 | 中高；治理场景 |
| LibertyBans | 本人处罚记录、申诉与管理查询 | Java API + Bridge | 中高；有治理流程时 |
| Vault | 玩家个人页显示游戏余额和货币名 | Java Economy provider + Bridge | 中；以只读开始 |
| DiscordSRV | 已有游戏↔Discord 绑定、聊天和身份信息复用 | 插件 API + Bridge | 中；已有 Discord 社区 |
| Simple Voice Chat | 整合包包含语音组件、安装说明和故障指引 | 包依赖与部署配置；深入时 Java API | 低兼容/高深度；按需 |
| Pterodactyl | 使用现有面板做启停、资源状态和日志管理 | Client HTTP API / WebSocket | 中；第二种面板适配 |
| itzg/docker-minecraft-server | 不装面板的小私服也能按模板运行服务器和包 | Compose 模板、配置和 packwiz 支持 | 低模板/高远程管理；按需 |
| Chunky | 后台发起预生成、维护时查看进度 | 已确认命令体系；细粒度 API 待核实 | 中；运维扩展 |

不要求同一能力全装：packwiz 和 AutoModpack 是不同分发路线；spark 与 Exporter 解决的诊断/历史监控重点不同；地图与权限系统也按用户现有环境选择。

## 3. 最值得先做的整合

### 3.1 packwiz：把“给群友发整合包”做成可维护的发布流程

官方格式用 `pack.toml`、`index.toml` 和单项元数据描述内容，适合 Git 管理；支持可选模组、客户端/服务端分离，可导出 Modrinth 包。官方 installer 可以用在客户端启动前和服务端启动脚本中。

建议体验：

1. 站长关联 packwiz 源，导入为一个可发布的包版本。
2. Web 展示版本、变更、可选内容和对应服务器。
3. Hoard 保留发布版本与必要产物；Compass 安装并检查版本。
4. 已使用 packwiz-installer 的用户仍能使用既有方式，不被迫换启动器。

首先利用导出 `.mrpack` 和现有 installer，验证真实兼容性，再决定是否由 Compass 原生解释 packwiz 格式。不要一开始维护第二套完整安装器。对于滚动 HTTP 源，站点发布时应固定清单及版本，不能把同一个会变化的 URL 当作不可变发布版本。

`itzg/minecraft-server` 已有 `PACKWIZ_URL` 支持，适合同时给站长提供服务端 Compose 模板。文件能下载不等于客户端和服务端应安装完全相同的 mods。

### 3.2 AutoModpack：兼容用户现有的自动同步路线

官方说明中，服务端生成包元数据并提供文件；客户端模组同步内容并在需要时重启游戏。它本来就面向私服，且不要求专用启动器。

建议先提供 AutoModpack 服务器类型说明、所需客户端组件与安装入口，在 Compass 中验证独立实例运行及文件更新的共存行为。不要同时让 Compass 和 AutoModpack 管理同一个目录中的同一批文件。

目前核实到的是它自己的同步机制，不是供第三方网站调用的稳定管理 REST API。导入其清单或直接替代其客户端需要额外协议研究，不列为首版承诺。

### 3.3 LuckPerms：成员资格真正进入游戏

最直接的流程是“网站审核通过 → 允许加入/获得指定成员组”，个人页也可展示游戏称号和身份。

- 通过公开 Java API 读写指定组，不直接修改 LuckPerms 存储表。
- 由站长选择服务器里真实存在的组；不要让他手填整套权限节点规则。
- 网站管理员、游戏 OP、LuckPerms 组分别授权，不能因一次账号绑定自动相互提升。
- 仅管理本站负责的成员组；上下文、继承关系及临时资格按目标版本验证。
- 到期/撤销与服务器暂不可达时需要能表达实际生效状态，不能只在网页隐藏徽章。

前提是已验证的游戏 UUID 绑定。用户名、邮箱、正版/离线/Floodgate UUID 不能互相替代。

### 3.4 PlaceholderAPI：以少量适配覆盖很多现有插件

它能解析来自 Essentials、Vault、LuckPerms 及其他扩展的占位符。我们可以先交付有限的“玩家展示项”，例如称号、等级、余额，再按实际服选数据。

Bridge 在游戏内解析后返回结果；前台读取站长配置好的展示项。玩家不直接提交任意占位符模板。未安装扩展时可能原样返回占位符，应明确显示为不可用，不能把 `%xxx%` 当作真实数值。

这条路线适合读展示数据；领地修改、处罚与经济交易应使用相应业务 API。它不是支持所有插件操作的万能接口，也不自然适用于所有 loader。

### 3.5 Plan：运营统计与玩家档案

Plan 已有自带 Web 服务器、玩家与服务器分析，多平台支持范围也较广。首版提供站长统计入口即可创造价值，深入后可考虑本人游玩时间、最近活动和站点内的聚合趋势。

本轮确认的 APIv5 包括 DataExtension、Query、PageExtension。它们是 Java 扩展 API；其中 Query API 涉及数据库查询，不能描述成现成稳定的远程统计 REST API。首版不复制整套分析 UI，也不抓取页面内部请求来冒充正式集成。

若嵌入或代理 Plan，应保留其访问权限；后台分析与玩家公开资料需要分别选字段。无需安装 Plan 的小服可以仅使用基础在线状态。

### 3.6 spark 与 Prometheus Exporter：按需求选择监控深度

spark Java API 已明确提供 TPS、MSPT、CPU 和 GC 指标，适合通过 Bridge 做当前健康摘要；性能报告则保留报告链接，不重建 profiler。部分平台没有 ticks，部分统计可能为空，不能统一填 20 TPS。

Minecraft Prometheus Exporter 已提供远程 `/metrics` 和 `/health`，适合已有 Prometheus/Grafana 的站长。可以复用现有监控基础，展示后台摘要与历史趋势；没有监控需求的小站无需增加整套时序服务。

该 Exporter 对 Folia 的支持是实验性/部分指标支持，官方表格也明确区分；必须按目标平台显示能力。不要把所有玩家行为导入 Prometheus 当作玩家档案数据库。

## 4. 能增加产品特色的可选项

### 4.1 Geyser / Floodgate 与 ViaVersion

可以让前台提供准确的 Java 和基岩版地址、端口、版本说明、登录和绑定指引。Floodgate API 可识别 Bedrock 玩家并查询关联信息；Geyser 的公共 REST API 不能自动当成本地服务器状态 API。

“本站账号 ↔ Java UUID ↔ Floodgate 身份”的验证绑定做好后，后续白名单、资料和成员资格才能复用。基岩版玩家不能被要求安装 Java 的 `.mrpack`；Geyser 也不能普遍解决任意 Java 模组包的兼容性。

ViaVersion 系列可帮助显示可连接版本，但不能仅根据“已安装 ViaVersion”推断无限版本兼容。以实际已启用组件与目标版本范围为准，模组协议与所需客户端内容另行检查。

### 4.2 SkinsRestorer：接纳已有认证体系的服务器

对不准备全服切换到 Mirror/Yggdrasil 的站长，可以研究让已验证玩家选用本站皮肤，由 Bridge 调用 SkinsRestorer API 应用。

它有公开 Java API，且区分持久化与临时应用。具体纹理生成/签名、代理网络及部署模式需要验证，不能承诺上传一张 PNG 后任意正版客户端都能立即看到。皮肤显示与认证身份仍分开处理。

### 4.3 Polymer 与普通资源包发布

Polymer 面向可被原版客户端访问的服务端定制内容，并有资源包生成/AutoHost。适合做“这台服务器需要什么资源、当前资源包版本、下载与说明”。

优先接已有资源包产物或已有 AutoHost，不要求站长再把同一个包搬到 Hoard。站长选择用本站发布时，再复用对象存储与分发能力。生成内容的 HTTP 入口不等于远程管理 Polymer 的 API，也不保证任何第三方模组都能因此免客户端安装。

### 4.4 WorldGuard / Towny / FTB Teams 与 Chunks

这组整合能让“我的玩家”页面长出真正的游戏信息：我的团队、城镇、领地、成员、地图位置和招募入口。

- **WorldGuard**：官方区域 API 覆盖管理器、区域、空间查询和事件；适合建筑服/生存服。
- **Towny**：有 TownyAPI，适合城镇、国家与居民社区；用其模型表达城镇，不强行转成普通矩形领地。
- **FTB Chunks/Teams**：公开 API 已有领地主体、认领与强制加载相关能力，适合模组服。请求强制加载与实际正在强制加载也不是同一状态。

先展示并把领地关联到既有地图。网页改成员、认领区块或修改保护规则需要完整的游戏授权与线程约束，放到相应适配验证后。FTB 游戏团队也不等于 Hoard 发布模组的内容团队。

### 4.5 FTB Quests

很适合模组服的任务图鉴、入服教程与团队成就，但本轮只确认公开顶层 API/任务文件入口，没有完整验证任务进度读取、事件和版本稳定性。

建议列为探索项，先只读个人/团队进度，保留任务隐藏规则；网页发奖励和完成任务不作为早期能力。其成本高于挂一个任务说明页面。

### 4.6 CoreProtect / Ledger 与 LibertyBans

可让站点承接“举报 → 提交坐标/时间 → 管理员查历史 → 游戏内处置 → 申诉”的实际工作。

CoreProtect 有查询、回滚、恢复等 Java API；其 Networking API 是游戏客户端数据包协议，不是浏览器 HTTP 接口。Ledger 已确认是 Fabric 世界变更记录工具，本轮未验证等价的稳定查询 API，不能直接照搬 CoreProtect 适配。

LibertyBans 有处罚查询/管理 API，官方明确推荐 API 而非直接操作数据库。适合本人处罚与申诉；游戏处罚、论坛/网站封禁与内容审核仍有各自范围。优先查询，写操作按真实工作流独立交付。

### 4.7 Vault：可读的游戏经济信息

Vault 是服务接口适配层，需要服里已有实际 Economy provider，不是独立的货币系统。初期可显示本人余额、货币名与格式化结果。

网页交易、兑换、商店发货需要处理重复提交与游戏侧实际结果，不应仅将“命令已发送”当作支付/发货成功。只读资料有明确价值，做完整跨服金融系统则超出当前目标。

### 4.8 DiscordSRV 与 Simple Voice Chat

DiscordSRV 已有游戏与 Discord 的聊天、账号关联和角色同步；优先复用其已验证绑定和事件，避免再造一套双向聊天。网站与 Discord 的 OAuth 登录并不自动证明游戏身份，单向公告 webhook 也不需要安装 DiscordSRV。

Simple Voice Chat 的首批整合价值是客户端包依赖、部署说明和连接故障指引。它有 Java API，但浏览器不能直接变成原生语音客户端；网页语音需要额外的音频协议/WebRTC 桥接。无需为了展示“支持语音”就传输玩家音频。

## 5. 站长既有基础设施也应该被接纳

- **squaremap / Dynmap**：给已有地图提供入口和地标关联。squaremap 的 2D 俯视方向适合需要轻量导航的站点；标记 API 需游戏内适配。是否轻量仍取决于世界规模和渲染设置，不承诺固定资源占用。
- **Pterodactyl**：官方 Client 路由源码确认资源查询、power、command 和 WebSocket 入口。可作为 MCSManager 之后的具体适配，不把 Application API 密钥和 Client API 密钥混用；源码来自开发分支，实现时固定发行版本。
- **itzg/docker-minecraft-server**：适合简单 Compose 运行与文档模板。提供模板很轻；若要从网站控制远端 Docker，则是新增远程管理能力，不能等同于填一个容器名。
- **Chunky**：可以做预生成任务入口。已确认跨平台项目与命令体系，精确进度回报、取消与恢复接口仍需针对实际版本研究，不能承诺已经具备结构化 API 对接。
- **Modrinth / Hangar**：属于可选的外部内容来源，而非站长必须自部署的服务。适合 Hoard/Compass 查询内容与版本；本轮实际请求 Hangar 项目列表获得响应。下载按具体内容授权和上游方式处理，查询来源不等于自动建立全部文件镜像。

## 6. 给自部署用户的选择方式

后台应展示能带来的具体结果和所需依赖，而不是让站长面对一长列含糊的插件名称：

```text
集成
  客户端内容：packwiz / AutoModpack 共存指引 / 上游内容来源
  玩家与成员：LuckPerms / Floodgate / SkinsRestorer
  玩家资料：Plan / PlaceholderAPI / 游戏团队与领地
  服务器健康：spark / Prometheus 数据源
  世界：现有地图 / 领地覆盖层
  社区治理：处罚 / 方块历史 / Discord
```

这是信息组织建议，不意味着首版实现这些全部分类页面。先有实际适配，后显示对应入口。

几类典型组合可作为文档推荐配方，不新增必须选择的“服务器类型模式”：

| 部署者 | 推荐组合 |
|---|---|
| 小群模组私服 | packwiz 或 AutoModpack、基础服务器状态、按需语音 |
| Paper 生存社区 | LuckPerms、Plan、spark、已有地图，按需处罚和方块历史 |
| Fabric/NeoForge 模组社区 | 内容分发、对应平台指标、FTB 领地/团队；任务进度后续探索 |
| 建筑/城镇社区 | WorldGuard 或 Towny、作品与地图关联、成员审核 |
| Java/基岩互通社区 | Geyser/Floodgate、分平台进服说明、验证后的身份关联 |

## 7. 实施顺序和维护边界

### 第一批：无需自有 Bridge 也能产生价值

1. packwiz 导入/导出与既有安装器兼容，连接 Hoard 和 Compass。
2. Plan 与已有地图的站点入口。
3. 已有 Prometheus 数据源的后台摘要。
4. Modrinth/Hangar 内容来源；AutoModpack、语音和 itzg 的兼容指引。

### 第二批：一个明确目标平台的 Bridge

按首批实际部署用户确定 Paper 或 Fabric，先完成游戏内 UUID 绑定、基础状态，再增加 LuckPerms、spark 和有限的资料读取。Paper 分支可增加 PlaceholderAPI，不能假设 Fabric 分支也有等价插件。

同一 Bridge 对已安装插件使用可选依赖；不同时建设所有平台的同名空适配器。Bridge 与 Web 通信采用明确版本的业务消息，例如查询本人资料或更新本站成员组，不暴露一个可以执行任意 Java 调用的接口。

游戏内数据通过对应平台的调度规则获取，网络请求不阻塞 tick；断线、未安装和不支持都能表达，缺少字段不伪装成零。Folia、代理端与普通 Paper 调度不能互相假定兼容。

### 第三批：由真实社区需求选择深度玩法

选择一种领地系统或治理流程完成端到端交付，再考虑任务、交易与复杂同步。维护清单应记录具体 MC、loader、插件及 Bridge 版本和最近验证时间，状态为“文档方案 / 原型 / 已验证”，不能仅靠一个 logo 宣称已支持。

### 最小设计检查

1. **结构性**：以内容分发、身份、资料和运维任务组织整合，避免每加插件就新建一套账号和页面结构。
2. **配置负担**：只要求连接信息与站长的业务选择；能查询的组、实例和插件版本由系统读取。
3. **可推导性**：游戏内插件可在安装 Bridge 后检测；远程服务仍需站长明确提供目标，不扫描网络猜测。
4. **规模**：先实现具体接入，不先设计插件市场、通用脚本执行器或所有项目共享的复杂数据模型。
5. **适用面**：每种路线都允许不安装；普通皮肤站不承担模组服整合的运行成本。

最小有效新增能力是完成一条可用的内容分发流程，以及一条验证后的玩家身份/资料流程。单纯增加外链不能叫深度整合，但已有成熟 Web 面板的入口也不必先重写才能交付。

## 8. 官方依据

以下链接是本轮确认信息的主要来源；标记“源码”的接口仍需固定版本并做真服验证。

- [packwiz](https://packwiz.infra.link/)、[installer 与服务端用法](https://packwiz.infra.link/tutorials/installing/packwiz-installer/)。
- [AutoModpack](https://github.com/Skidamek/AutoModpack)。
- [Modrinth API](https://docs.modrinth.com/api/)、[Hangar API 文档](https://hangar.papermc.io/api-docs)、[实际项目列表接口](https://hangar.papermc.io/api/v1/projects?limit=1)。
- [Polymer](https://polymer.pb4.eu/latest/)、[资源包 AutoHost](https://polymer.pb4.eu/latest/user/resource-pack-hosting/)。
- [SkinsRestorer Java API](https://skinsrestorer.net/docs/development/api)。
- [LuckPerms 仓库与 API 说明](https://github.com/LuckPerms/LuckPerms)。
- [PlaceholderAPI 开发文档](https://wiki.placeholderapi.com/developers/using-placeholderapi/)。
- [Plan](https://github.com/plan-player-analytics/Plan)、[APIv5](https://github.com/plan-player-analytics/Plan/wiki/APIv5)。
- [spark Developer API](https://spark.lucko.me/docs/Developer-API)。
- [Minecraft Prometheus Exporter](https://github.com/sladkoff/minecraft-prometheus-exporter)。
- [Geyser](https://geysermc.org/wiki/geyser/)、[Floodgate API](https://geysermc.org/wiki/floodgate/api/)。
- [ViaVersion](https://github.com/ViaVersion/ViaVersion)。
- [squaremap](https://github.com/jpenilla/squaremap)、[Dynmap](https://github.com/webbukkit/dynmap)。
- [WorldGuard API](https://worldguard.enginehub.org/en/latest/developer/)、[Towny 与 API 入口](https://github.com/TownyAdvanced/Towny)。
- [FTB Chunks](https://github.com/FTBTeam/FTB-Chunks)、[FTBChunksAPI 源码](https://github.com/FTBTeam/FTB-Chunks/blob/main/common/src/main/java/dev/ftb/mods/ftbchunks/api/FTBChunksAPI.java)。
- [FTBQuestsAPI 源码](https://github.com/FTBTeam/FTB-Quests/blob/main/common/src/main/java/dev/ftb/mods/ftbquests/api/FTBQuestsAPI.java)。
- [CoreProtect API](https://docs.coreprotect.net/api/)、[Networking API](https://docs.coreprotect.net/api/networking/)、[Ledger](https://github.com/QuiltServerTools/Ledger)。
- [LibertyBans](https://github.com/A248/LibertyBans)、[VaultAPI](https://github.com/MilkBowl/VaultAPI)。
- [DiscordSRV](https://docs.discordsrv.com/)、[Simple Voice Chat API](https://modrepo.de/minecraft/voicechat/api/overview)。
- [Pterodactyl Client 路由源码](https://github.com/pterodactyl/panel/blob/develop/routes/api-client.php)。
- [itzg Minecraft Server 文档](https://docker-minecraft-server.readthedocs.io/en/latest/)、[Chunky](https://github.com/pop4959/Chunky)。
