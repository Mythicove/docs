---
title: 配置服务器与可选集成
description: 启用 Isles，发布服务器，连接面板、地图和 packwiz 客户端包。
---

## 启用服务

Isles 是可选服务，不影响仅运行皮肤站或模组站的部署。源码位于 [Mythicove/mythic-isles](https://github.com/Mythicove/mythic-isles)。目前每个数据目录运行一个实例，配置原子写入本地文件，面板令牌加密保存。

准备两个独立随机值：

- `ISLES_ADMIN_TOKEN`：至少 32 字符，仅用于 Web 服务端访问 Isles。
- `ISLES_SECRET_KEY`：32 个随机字节的 base64 编码，用于加密连接令牌。备份时另外保管此密钥。

把 Isles 仓库放在 workspace 的 `mythic-isles/`，使用附加 Compose 文件：

```sh
docker compose -f docker-compose.yml -f docs/deploy/compose.isles.yml up -d --build isles web
```

单独运行时在 Web 服务端设置 `ISLES_URL=http://127.0.0.1:8095` 和相同的服务令牌。Isles 默认监听 loopback；容器内监听 `0.0.0.0`，无需把其管理端口映射到公网。

网关需将 `/api/isles/*` 转发到 **Web BFF**，先于 Mirror 的 `/api/*` 规则。仓库提供的 `deploy/Caddyfile` 已包含该规则。不要把这一路径直接全部转发到 Isles，否则会绕过 Web 的 Mirror 管理员校验。

## 发布服务器

1. 使用 Mirror 管理员登录，进入 `/admin/integrations`。也可以在页面中临时填写 Mirror 救援令牌。
2. 加载配置，添加服务器，填写名称、介绍、游戏类型和玩家连接地址（必须含端口）。
3. 如需管理进程，先添加 MCSManager 或 Pterodactyl 连接，保存 API 令牌，测试并查询实例，然后在服务器中选择实例。
4. 添加地图、统计、指南或社区链接，保存并公开。
5. 打开 `/servers` 检查前台列表及详情。未发布服务器不会出现在公开 API。

进程运行状态和游戏可连接状态分别展示。Java 与 Bedrock 使用各自协议探测；缓存观察约 20 秒，浏览器每 30 秒刷新，切出页面后暂停。探测延迟从站点所在机器计算。

封面可使用站点同源的图片。外部图片源需在构建 Web 时设置 `ISLES_IMAGE_ORIGINS=https://images.example.org,https://cdn.example.org`，Compose 附加文件已传递此构建参数；它只允许图片来源，不会开放任意脚本或 iframe 来源。

## 面板与监控

- MCSManager 使用面板 Web API 的账号 API key，支持实例发现、进程状态、启停重启、命令和最近 64KB 日志。
- Pterodactyl 使用 Client API key，支持服务器发现、资源状态、power 和命令；实时控制台尚需独立 WebSocket 适配，近期日志入口会明确返回不支持。
- Prometheus Exporter 连接填写完整 metrics 地址，例如 `http://mc:9940/metrics`；测试读取允许的服务器指标，不返回玩家行为序列。
- 留空令牌输入保留已存值；替换时填写新令牌。服务不回传旧值，删除连接前先移除服务器绑定。
- 操作受理后刷新进程状态确认，操作返回成功不代表游戏已经启动完成。

HTTP 上游错误不会回显带 key 的 URL。管理审计记录操作、目标及由 Web 计算的匿名会话标识，不写入控制台命令正文。Isles 服务日志应纳入部署日志保留；直接持有服务令牌的调用方处于管理信任边界。

### Prometheus 抓取 Isles

Isles 私网监听地址提供 `GET /metrics`（Prometheus text 0.0.4），使用现有 `ISLES_ADMIN_TOKEN` Bearer 鉴权。Prometheus 直接访问 `http://isles:8095/metrics`，不通过浏览器 BFF；不要把服务令牌放进公开网页。该令牌同时拥有 Isles 管理权限，因此抓取端必须位于受信任部署中。首批沿用服务令牌，没有新增独立监控凭据。

将 `docs/deploy/prometheus/isles.yml` 中的 job 合入已有 Prometheus 配置，把服务令牌只读挂载为 `/etc/prometheus/isles-token`。示例目标 `isles:8095` 对应 Compose 服务名，独立部署按实际私网地址调整。需要跨受信任私网之外抓取时，由部署层提供 TLS。该文件是抓取配置示例，不会自动启动 Prometheus 容器。

| 指标 | 含义 |
|---|---|
| `mythic_isles_bridge_fresh{server}` | 已配置服务器的最近心跳是否少于 90 秒；未连接或失效为 0，含未公开服务器 |
| `mythic_isles_bridge_observed_timestamp_seconds{server}` | 最近接受的心跳 Unix 时间，过期时仍可用于计算数据年龄 |
| `mythic_isles_bridge_tps{server}` | 最新有效观察中 spark 的 10 秒 TPS |
| `mythic_isles_bridge_mspt_seconds{server}` | spark 一分钟平均 tick 耗时，转为秒 |
| `mythic_isles_bridge_system_cpu_ratio{server}` | spark 一分钟系统 CPU 比例，不是单个游戏进程占比 |
| `mythic_isles_bridge_gc_collections{server,collector}` | spark 正常运行基线以来的收集器次数 |
| `mythic_isles_bridge_gc_collection_seconds{server,collector}` | 同一基线下的累计 GC 秒数，不是暂停分布 |

全部指标是 gauge；GC 基线可以重置，不把它们当作 `_total` counter 使用 `rate()`。性能值缺失、未知或超过 90 秒时不生成序列，不沿用旧样本制造新观察；Prometheus 负责保存历史。抓取仅读取当前快照，不触发游戏探测、面板请求或强制 GC。标签不含玩家、UUID、地址、显示名或密钥。

可查询 `mythic_isles_bridge_fresh == 0` 发现失效 Bridge，用 `time() - mythic_isles_bridge_observed_timestamp_seconds` 查看年龄；`max_over_time(mythic_isles_bridge_tps[5m])` 可查看历史窗口。`GET /healthz` 继续只检查 Isles 进程：游戏服停止后它仍可能返回 200。

已用 **官方 Prometheus 3.16.0 / Windows / Purpur 1.21.1/2329 / Java 21** 实际抓取验证：带令牌目标 `up=1`，无令牌对照 `up=0`，读取 TPS 与三个 GC 收集器；停服并等过真实 90 秒后，`fresh=0` 且性能即时序列消失，TSDB 的 5 分钟历史仍能查询。可在 Paper 原生验收中设置 `ISLES_TEST_PROMETHEUS_DIR` 指向已安装的 Prometheus 目录复跑。没有把配置解析当作容器运行、多副本或任意第三方 exporter 兼容验收。

#### 告警规则

将 `deploy/prometheus/isles-alerts.yml` 与抓取配置放在同一配置目录；`isles.yml` 的 `rule_files` 已引用它。合并进现有部署时也合并 `rule_files`，或按实际挂载位置使用绝对路径。规则默认匹配 `job="mythic-isles"`，修改 job 名称时同步修改两条规则。

- **`MythicIslesScrapeFailed`**：该目标的 `up=0` 持续 2 分钟。检查 Isles 进程、私网链路和抓取凭据；它不表示 Minecraft 端口一定不可达。
- **`MythicIslesBridgeStale`**：已配置服务器的 `bridge_fresh=0`，且同一 `job,instance` 的 Isles 目标仍然 `up=1`，持续 2 分钟。观察原先有效时，需先经过 90 秒有效期，再等待 2 分钟和规则调度时间。没有连过 Bridge 的服务器同样可能触发，包含草稿服务器。

抓取失败时，Bridge 告警被抑制，避免一次 Isles 故障产生每服重复通知；恢复抓取后，如心跳依旧失效，会重新等待完整 2 分钟。删除服务器、移除抓取目标产生的失效序列不会被当作新的 Bridge 故障。这两条规则不检测目标从配置中意外消失的情况，目标清单完整性需由部署方管理。

规则只定义 Prometheus 告警状态。邮件、聊天等通知需由已有 Alertmanager 接收和路由；此示例未配置收件人。没有为 TPS／CPU 设置通用阈值，因为合理值取决于服务器负载和运维目标。

用 Prometheus 3.16.0 自带 `promtool` 在 `deploy/prometheus/` 下复验：

```sh
promtool check rules isles-alerts.yml
promtool test rules isles-alerts.test.yml
```

测试通过真实 PromQL／告警规则引擎验证持续时间、正常恢复、故障抑制、服务器／目标删除及跨目标标签隔离；这些是确定性时间序列场景，不等同于通知送达验收。仓库的 `prometheus rules` CI 使用固定版本和发布者 SHA-256 检查同样的规则。

## packwiz 发布

在服务器中填写 `pack.toml` 地址，先保存配置，再点击“校验并发布客户端包”。成功后前台出现 `.mrpack` 下载按钮，可用于支持该格式的启动器和 Compass 的文件导入。

发布时校验源索引、元数据和文件哈希，记录不可变 ZIP 的内容哈希。失败不会覆盖当前选择的版本。客户端/服务端区别写入 `.mrpack`，普通配置进入 overrides。

目前支持 packwiz 1.1 的 HTTP URL 下载、SHA-1/SHA-256/SHA-512/MD5 验证；不支持的 Murmur2、索引 alias 和 metadata-only CurseForge 下载模式会明确报错，应使用官方 packwiz 导出。可选项保留 optional 环境，但不携带 packwiz 的默认选择界面。

单次发布限制为 90 秒、总读取 256MiB、单个远程模组 128MiB、单个覆盖文件 32MiB、最多 2000 项。实际外部文件仍从其原下载源获取；Isles 不把所有远程模组重新打包分发。

### 用 Compass 安装已发布客户端包

1. 在网站的服务器详情页下载已发布的 `.mrpack`，保存到本机。发布版本使用 SHA-256 内容地址，修改源文件后需重新发布，新产物不会覆盖旧版本。
2. 在 Compass 的“实例”页点击“安装整合包”，选择下载的文件。预览中核对游戏版本、loader、必需/可选文件数、客户端跳过项和覆盖文件数，再填写实例名并安装。
3. 查看安装结果里的下载失败与依赖提示。确认文件到位后，选择自己的账号与合适的 Java，在开始页选择新实例启动。

当前 Compass 会安装索引中标为客户端可选的文件，并单独显示数量；不会按 packwiz `optional.default` 自动取消选择。客户端 `unsupported` 文件跳过，`overrides/` 和 `client-overrides/` 按现有导入规则处理；服务端专用内容不用于客户端安装。重复实例目录拒绝覆盖。下载失败会列入安装结果，不能仅凭实例已出现在列表就认定整包完整。

已在 **Windows / Java 21 / MC 1.21.1 / Fabric Loader 0.16.14** 通过真实 Isles 发布产物进行 Compass 原生安装和启动，固定 Fabric API **0.116.18+1.21.1**（Modrinth `5SwzqWUu`）。1086 字节产物安装了实际模组和一个可选文件，应用一个配置覆盖并跳过一个服务端文件；核对下载文件哈希/大小，真实客户端加载 Fabric API 并初始化方块材质图集。发布后将可选文件的下载内容改成同大小坏文件，再导入新实例，失败文件被明确报告且没有落成游戏文件或残留 `.part`。这里验证的是现有原生导入/启动核心，未将其记为桌面点击、网站一键安装、在线账号认证或实际加入服务器。

复跑需要 Go、Rust、Java 21、网络和可用桌面/OpenGL 会话。两个仓库都在相同验收版本时，从 Isles 仓库执行：

```sh
node scripts/compass-pack-live.mjs /absolute/path/to/compass
```

脚本使用临时 Isles 数据与临时 Compass 实例，输出 `scenario-result.json`、`compass-result.json`、完整客户端及测试日志；固定官方模组版本从原站下载，packwiz/身份外部边界由 loopback 夹具提供。不会复用日常账号或实例；成功初始化后结束验收客户端。原生用例需要显式运行此脚本；普通 CI 编译用例但不启动图形客户端。Mac/Linux 原生运行、一键远程安装、packwiz 默认可选项选择和真实账号进服继续保留待验收。

## 内容来源

Isles 提供固定来源的 Modrinth 与 Hangar 搜索接口，供启动器或自部署站点查找项目。请求使用 `q`、`limit` 以及来源允许的筛选字段；结果保留来源和上游项目链接，不把外部项目文件偷偷镜像到本站。

```text
GET /api/isles/catalog/modrinth/search?q=Fabric&loader=fabric&game_version=1.21.1&limit=20
GET /api/isles/catalog/hangar/search?q=Paper&platform=PAPER&limit=20
GET /api/isles/catalog/modrinth/versions/P7dR8mSH?loader=fabric&game_version=1.21.1
GET /api/isles/catalog/hangar/versions/ViaVersion/ViaVersion?platform=PAPER&limit=20
```

网页入口 `/catalog` 可完成同样的搜索与选版本流程。Modrinth 查询遵循其公共 API 的限流和 User-Agent 要求。Hangar 查询保留平台对应的下载和 SHA-256；版本页显示的是上游兼容性与哈希声明，文件内容校验仍在安装/发布阶段执行。Hangar 每页筛选不代表枚举了全部历史版本，页面已明确说明。

每进程最多 60 次/分钟上游调用、16 条一分钟缓存；超出出站预算返回 429。部署兼容镜像时可在 Isles 服务端设置 `ISLES_MODRINTH_URL` 或 `ISLES_HANGAR_URL`，不能通过公开请求指定任意目标。普通皮肤站不用配置此可选服务。

### 识别已有文件

在 `/catalog` 的“识别本地文件”中选择已有模组或插件，再点击“通过 Modrinth 识别”。文件上限 **128 MiB**，浏览器必须处于 HTTPS 或 localhost 的安全上下文。SHA-512 使用浏览器 Web Crypto 在本地计算；文件内容与本地文件名不上传，仅哈希经 Web BFF / Isles 查询固定 Modrinth 文件索引。

```text
GET /api/isles/catalog/modrinth/hash/{128位SHA-512十六进制哈希}
```

结果给出精确版本、发布渠道、上游声明的 loader/游戏版本、发布者文件名和版本原页面，仅包含 SHA-512 与请求相同的文件。改名不会影响识别；修改过、未公开或未被索引的文件可能返回 404“未收录”。上游不可用或返回哈希不一致时为 502，不冒充无匹配；预算仍与搜索/版本接口共享。此操作独立于目录的平台与游戏版本筛选，不代表文件安全、依赖安装或当前实例兼容性已通过验证，也不会自动安装文件。

已用真实 Modrinth 索引识别 **Simple Voice Chat 2.6.25** 的本地 JAR（版本 `5OqsnSs7`，939410 字节），核对发布者 SHA-512、文件大小、版本 ID，修改字节后的哈希返回 404。可通过 `node scripts/catalog-live.mjs /path/to/published.jar modrinth-version-id` 在 Isles 仓库复跑。生产浏览器另验证本地计算、改名文件、中英界面、390px 布局与超限拒绝；这里不执行或安装被识别的文件。

## 地图、统计与后续插件

BlueMap、squaremap、Dynmap 和 Plan 当前可以关联为具名链接，在各自工具中打开；这不是它们的游戏内 API 适配。成员地图的鉴权仍由对应工具或反向代理控制，隐藏本站链接不等于限制地图访问。

地图还有专用配置：在服务器编辑页选择 BlueMap、squaremap 或 Dynmap，填写浏览器可访问地址（支持含保存视角的 `#fragment`），保存后服务器详情及社区首页出现“世界地图”，进入 `/servers/{id}/map`。地图仍由原工具渲染，站点仅提供页面容器及新标签页入口。

同源地图可直接嵌入；外部地图需在构建 Web 时配置 `ISLES_MAP_ORIGINS=https://map.example.org`，并重新构建。Compose 附加文件已传递此参数。仅放行精确 origin，不全局开放 frame-src；地图服务自身的 CSP `frame-ancestors` 或 X-Frame-Options 也必须允许本站嵌入。不支持 iframe 或来源未放行时仍可打开原地图页面。Iframe 限制为地图所需的脚本、同源和指针交互，未开放顶层导航权限。

仅成员地图应在其网页和数据入口统一鉴权；配置在本站的地址必须是允许玩家知道的浏览器入口，不填内网管理端点或私密 token。当前没有自动改写 BlueMap 标记/玩家皮肤，也没有把页面嵌入当成游戏内 API 接入完成。

## 游戏身份、白名单与玩家资料

`mythic-isles/bridge/paper` 提供 Java 21 Paper/Spigot 插件，初始验证环境为 Purpur 1.21.1。可从 Isles CI 的 `isles-paper-bridge` artifact 获取 JAR，放入 `plugins/` 后重启。

1. 在服务器管理页生成 Bridge 令牌。它只用于这台服务器，轮换会立即作废旧令牌。
2. 配置插件的 `url`（本站或私网 Isles 地址）、`server`（本站服务器 ID）与 `token`，重启。
3. 在管理页刷新 Bridge，确认平台、插件和数据新鲜度。
4. 玩家使用网站会话打开 `/game`，选自己的站点玩家和服务器，生成验证码。
5. 在游戏内执行 `/mythic link <code>`。验证码十分钟过期、单次消费；不同认证体系的 UUID 单独保存，不靠同名自动绑定。
6. 管理员选择已验证的身份，设置白名单或已安装 LuckPerms 的全局成员组。查看任务 `applied` 才表示执行完毕，`pending` 仅表示等待。

插件每 20 秒回报数据；网络在独立线程执行，不阻塞游戏 tick。可选 LuckPerms、PlaceholderAPI 和 spark；没有安装不影响基本身份验证与白名单功能。Folia 和其他 loader 尚未适配此插件。

PlaceholderAPI 的展示项在服务器插件配置的 `placeholders` 中设置，相关 expansion 需实际安装。网页用户不能提交任意占位符。玩家资料只向拥有该站点玩家的网站会话返回，过期数据会标注不可用。spark 优先通过公开 API 服务读取，包括 Paper 内置服务。

其他项目的状态以[生态实施计划](../plans/ecosystem-integrations.md)为准。仅添加链接不表示已完成深度整合。

Paper Bridge 已支持可选的 WorldGuard 与 ViaVersion：安装对应插件后自动检测。玩家 `/game` 页可查看在线时观察到的本人领地成员关系、世界和区域中心坐标，以及实际客户端协议版本；后台可查看 ViaVersion 排除被禁协议后的允许范围。领地最多 32 条并明确截断，不公开其他玩家的领地资料，也不提供网页修改保护规则。协议列表不能代替对代理、认证或模组兼容性的验证。

### ViaBackwards / ViaRewind 旧客户端

需要旧 Java 客户端连接新服时，按上游说明组合安装 ViaVersion、ViaBackwards，以及所需的 ViaRewind。Bridge 后台显示检测到的三个插件版本，支持范围仍由 **ViaVersion 官方 API** 提供，包含已安装扩展的转换路径并排除 `block-protocols` / `block-versions` 禁用项；本站不维护第二份手写兼容表。玩家本人页显示实际连接协议名称，退出后移除在线版本观察，已验证的 UUID 绑定保留。

已在 **Purpur 1.21.1/2329 / Java 21 / ViaVersion 5.12.2 / ViaBackwards 5.12.2 / ViaRewind 4.2.0** 实进程验证：1.12.2、1.8.8 客户端进入游戏并执行一次性绑定，读取版本分别为 `1.12.2`、`1.8.x`。在 ViaVersion 配置中设置 `block-protocols: [47]` 并重启后，下一次心跳范围不再含 `1.8.x`，新的 1.8.8 连接收到明确拒绝。另验 ViaVersion + ViaBackwards 的 1.12.2 路径；仅 ViaVersion 时不列出 1.12，旧客户端也无法完成进服。

这批验收使用 offline-mode、仅 loopback 的协议客户端，覆盖登录、spawn、绑定及版本读取。ViaBackwards 对现代世界高度的旧客户端显示限制有实际警告；支持列表不代表所有物品、方块、高度或游戏行为都能无损转换。1.7 客户端、在线认证、代理网络、Compass 启动前版本检查仍待独立验收。固定扩展版本及 SHA-512 校验已进入 `bridge/paper/test/fetch-plugins.mjs`，可通过 `ISLES_TEST_PLUGIN_FILTER=ViaVersion.jar,ViaBackwards.jar,ViaRewind.jar` 复跑。

安装 Vault 与实际经济插件后，Bridge 会读取已存在账户的余额与 provider 提供的货币显示格式，出现在已绑定玩家的本人资料中。只有 Vault、没有 Economy provider 时不伪造零余额；也不自动创建经济账户。不提供存取款、转账和网页发货接口，避免把只读资料误当作完整的游戏经济交易系统。

## Chunky 世界预生成

在 Paper 兼容服安装 Chunky 1.4.40 和本阶段的 Isles Bridge，重启后进入 `/admin/integrations`，选择服务器并刷新“游戏 Bridge”。“世界预生成”会列出插件报告的已加载世界；不需要玩家先绑定身份。

1. 选择世界，填写正方形或圆形、中心 X/Z 与半径（单位均为方块），点击“开始预生成”。半径范围为 1–100000，同时受服务器已有的 Chunky 半径上限约束。
2. 查看操作回执与世界状态。插件每 20 秒上报，页面每 5 秒读取最近观察，显示已处理区块、百分比，以及运行任务实际提供的速度和预计剩余秒数。
3. 可暂停并继续；暂停任务来自 Chunky 自己的存档，服务器重启后仍可继续。开始新任务不会覆盖暂停中的任务。
4. 取消运行中或暂停的任务前需确认。取消会丢弃续传点，已生成区块仍保留。此功能不会删除区块，也不会阻止玩家连接或自动开启维护模式。

`pending` 表示排队；`dispatched` 表示已领取、尚无回执；`applied` 只表示插件已受理操作。生成是否完成以世界进度为准。开始和取消不能安全重放，因此 Isles 会先持久化领取状态，再执行插件 API；连接中断或重启后不会自动重做已下发操作。若回执不确定，请先检查世界状态再决定下一步。

Chunky 1.4.40 的快速任务可能先写入终止存档、随后才回报异步区块完成。Bridge 通过真实任务事件读取运行期完成状态；重启后若旧存档无法区分完成与取消，页面显示“已停止（存档无法区分完成或取消）”，不会当成已完成。完成任务的耗时不会误显示为预计剩余时间。

世界任务、参数和回执仅供管理员读取，公开服务器目录不包含这些数据。Bridge 被撤销或数据不可用时，后台保留最近观察并禁用操作。验证范围与执行记录见[生态实施计划](../plans/ecosystem-integrations.md)。

## Plan 本人活动与服务器统计

安装 Plan 与本阶段 Paper Bridge，重启后无需增加 Bridge 配置。已经绑定游戏 UUID 的玩家在 `/game` 查看“我的 Plan 活动”；离线时也可读取。管理员在 `/admin/integrations` 选择服务器并刷新 Bridge，查看“Plan 服务器活动”。

- 本人：已保存会话数、游玩总时长、挂机时长、首次保存会话和末次会话结束时间。
- 管理员：当前 Plan 服务器的有会话记录玩家数、会话数及总时长。聚合可包含未绑定玩家，个人明细仅采集本站已经验证的 UUID。
- 口径：读取当前 Plan server UUID 对应的有效存档会话，游玩时长包含挂机；未保存的当前会话不计入。会话结束时间不是实时在线状态。Plan 自身删除或清理记录后，下一次成功观察反映剩余数据。

数据库访问通过官方 Query API 在后台线程执行；没有向网页开放 SQL、数据库凭据或整库下载。插件不可用或查询失败时，统计会缺省，后台明确提示不可用。Bridge 每 20 秒观察，后台每 5 秒读取最近观察，玩家页每 30 秒刷新；数据新鲜度沿用 Bridge 标记。

现有“世界与社区链接”可添加受保护的 Plan 面板地址。Plan 面板仍由 Plan 自身或反向代理鉴权，本站管理员身份和游戏绑定不会自动赋予面板权限。不要为了显示统计而关闭 Plan 认证；Bridge 读取统计不需要访问 Plan 网页端口。

已真服验证 Plan **5.9 build 3705 + SQLite + Purpur 1.21.1/2329**：两位真实测试玩家产生会话，只有已绑定玩家的个人明细被采集；退出和重启后，本人统计仍可读取。MySQL、代理多服与 Plan 面板 SSO 尚未做运行验收。单服已验证身份超过 2000 会明确拒绝统计采集，心跳还受 256 KiB 总体积限制。

## Towny 城镇、国家与本人居民关系

安装 Towny 和本阶段 Paper Bridge，重启后无需新增 Bridge 设置。玩家先通过游戏内命令绑定自己的 UUID，再在 `/game` 查看“我的 Towny 居民关系”：所属城镇/国家、居民数、townblock 数、镇长/国王角色和原插件职级。离线时仍可读取，退出城镇或职级变化会在下一次成功观察中更新。已知居民没有城镇会明确显示“尚未加入”；插件不可用或未知居民不伪装成无城镇。

管理员在 `/admin/integrations` 选择服务器、刷新 Bridge，查看城镇与国家概况。各列表按 UUID 顺序最多展示 100 项，显示完整插件计数和截断提示；本人城镇不受这两个列表截断影响。公开服务器目录没有 Towny 数据，成员页也不会返回其他人的居民明细。

“开放加入”来自 Towny 的 open 标记，“公开传送”来自 public 标记；这两个标记不会自动公开本站资料，也不是网页加入/传送按钮。townblock 使用 Towny 自身单位，不假设面积或输出保护边界。邀请、入镇、城镇权限修改仍在游戏内完成，地图覆盖层、公开招募和网页管理流程继续保留后续计划。

已真服验证 **Towny 0.103.2.0 + flatfile + Purpur 1.21.1/2329**：创建城镇/国家、镇长与国王识别、转移镇长、assistant 职级、离线重启和移除居民。测试环境没有经济插件，Towny 有缺少 economy provider 及 `TownMobPVM:SulfurCube` 提示；验证的是上述只读路径，不代表 Towny 经济、战争与全部游戏版本兼容。MySQL/Folia 尚未验收。Towny 采集复用 2000 个已验证 UUID 和 256 KiB 心跳限制；单居民职级超过 32 条会明确使该次 Towny 观察不可用。

## spark 垃圾回收观察

已安装或由 Paper 提供 spark 服务时，Bridge 自动读取其官方 GC API，无需新增配置。管理员进入 `/admin/integrations`，选择服务器并点击 Bridge 的“刷新”，可查看每个垃圾收集器的回收次数与累计耗时（毫秒）；数据沿用 Bridge 心跳时间与新鲜度提示。默认心跳约 20 秒，页面刷新不会直接向 JVM 请求 GC。

计数以 **spark 正常运行基线**为起点，扣除启动阶段的 GC，随 provider／服务器重启而重置。不是 JVM 启动以来总量、最近一分钟统计、暂停分布或各收集器时间的可直接相加总量。零值按 provider 返回保留；未知的次数或耗时分别显示“未提供”。没有 spark／观察时不补零，公开服务器目录和本人游戏资料不包含这些管理员统计。

已在 **Purpur 1.21.1 build 2329 内置 spark / Microsoft Java 21.0.8 / Windows** 真服验证：用 JDK `jcmd GC.run` 对验收服务器触发回收，下一次心跳的 G1 Old Generation 从 0 次／0 ms 变为 1 次／102 ms；禁用内置 spark 后，绑定与白名单仍正常且不产生 GC 字段。生产浏览器使用该真服记录验证后台展示、未知值、零值、重置、观察消失、中英与 390px 布局。`jcmd` 只用于本地验收脚本，网站未提供强制回收接口；spark 性能报告的生成和分享仍待单独适配。

## Simple Voice Chat 本人连接状态

在游戏服安装 [Simple Voice Chat](https://modrinth.com/plugin/simple-voice-chat) 与 Bridge，按[官方指南](https://modrepo.de/minecraft/voicechat/wiki/server_setup)配置独立 UDP 端口并重启。客户端需要对应版本的语音模组；仅安装服务端插件不会让原版客户端具备语音能力。整合包与代理部署参见[私服指南](./private-modpack-workflows.md)。

1. 使用 `/game` 的一次性码在游戏内绑定实际 UUID。
2. 留在游戏中，等待下一次 Bridge 心跳（默认约 20 秒），刷新 `/game`。
3. 本人资料显示插件是否识别到兼容语音客户端、插件报告的语音连接状态；识别到兼容客户端时，另显示声音启用/禁用状态。麦克风静音与声音禁用是不同状态，本轮 API 不提供前者。

数据复用现有心跳时间与新鲜度提示；退出游戏后在线语音观察消失，已验证的游戏绑定保留。插件未安装、服务尚未启动或 API 无法取得玩家状态时不生成断开记录。本人观察仅供该身份所有者和管理员读取，不进入公开服务器目录。不采集音频、语音组名、组密码、连接密钥或网络地址，也不提供网页端音频控制。

已在 **Simple Voice Chat 2.6.25 / Purpur 1.21.1 build 2329 / Java 21** 验证无客户端、兼容性握手、AES-128-GCM UDP 认证/连接校验、声音禁用/恢复、连接超时、离线清理与重新登录；未装插件的回归也通过。验收使用 offline-mode、仅 loopback 的协议客户端，没有麦克风录制、Opus 编解码或声音播放。官方 API 允许其他附加插件覆盖连接状态，因此页面状态不能证明真实音频传输、麦克风或公网 UDP 可达性；公网、代理、Fabric/NeoForge/Folia 运行验收仍待完成。

## Geyser / Floodgate 基岩身份与连接观察

按 [Geyser 官方部署指南](https://geysermc.org/wiki/geyser/setup/)安装并配置 Geyser；需要 Floodgate 时同时按其官方指南配置认证与密钥。Bridge 不负责修改这两个插件的认证或开放网络端口。Geyser 的 Java 转换目标若新于实际后端，需要按官方要求配置协议转换插件。

1. 在后端服务器安装本阶段 Bridge，重启后在后台刷新，可查看本机 Geyser API 报告的支持基岩版本和 Java 转换目标。这不是公网 UDP 连通性证明。
2. 基岩玩家在 `/game` 为**安装 Bridge 的后端服务器条目**生成一次性码，进服后执行 `/mythic link <code>`。不要把单独发布的基岩地址目录条目当作另一个 Bridge ID。
3. Bridge 通过 Floodgate 在线玩家 API 或本机 Geyser 连接识别基岩来源，不按玩家名前缀或 UUID 外形猜测；绑定时保存平台。玩家本人页显示原始基岩版本、连接来源、上游 Java 账号关联状态；ViaVersion 的转换后 Java 协议另行标注。
4. 白名单与成员资格始终针对实际 Bukkit UUID。Floodgate 已关联 Java 账号时，使用它实际采用的 Java UUID，不从 XUID 重造身份，也不会绕过本站已有的 UUID 所有权检查自动合并账号。

上游 Java 账号关联与本站一次性游戏绑定是两件事；连接观察也不是独立的 Xbox 认证结论。离线后连接字段消失，绑定时的平台与身份保留。没有额外采集 Xbox ID、设备、IP 或会话 token。代理部署必须正确转发 Floodgate 数据；仅后端安装 Floodgate 时，不会虚构远端 Geyser 的支持版本。

基岩地址仍可用现有 `edition: bedrock` 服务器条目发布，填写实际 UDP 端口，由 Isles 做 RakNet 探测；绑定选择上述后端条目。两种入口合并成单一服务器卡片的配置仍待后续完善。

本阶段已用 **Geyser 2.8.3 b941 / Floodgate 2.2.5 b141 / ViaVersion 5.12.2 / Purpur 1.21.1/2329** 跑通真实 Bedrock 1.21.100 客户端的协议进入、游戏内绑定、私有版本观察、实际 Bukkit UUID 白名单及 UDP 探测；也验证了不安装 Floodgate 的 Geyser 路径。验收使用仅 loopback 可访问的未签名协议夹具，**不代表 Xbox Live 在线认证或真实已关联 Java 账号已验收**。公网认证、账号关联和代理转发保留运行验收待办，部署不要照搬夹具的认证例外设置。
