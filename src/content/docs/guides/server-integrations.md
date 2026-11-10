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

## packwiz 发布

在服务器中填写 `pack.toml` 地址，先保存配置，再点击“校验并发布客户端包”。成功后前台出现 `.mrpack` 下载按钮，可用于支持该格式的启动器和 Compass 的文件导入。

发布时校验源索引、元数据和文件哈希，记录不可变 ZIP 的内容哈希。失败不会覆盖当前选择的版本。客户端/服务端区别写入 `.mrpack`，普通配置进入 overrides。

目前支持 packwiz 1.1 的 HTTP URL 下载、SHA-1/SHA-256/SHA-512/MD5 验证；不支持的 Murmur2、索引 alias 和 metadata-only CurseForge 下载模式会明确报错，应使用官方 packwiz 导出。可选项保留 optional 环境，但不携带 packwiz 的默认选择界面。

单次发布限制为 90 秒、总读取 256MiB、单个远程模组 128MiB、单个覆盖文件 32MiB、最多 2000 项。实际外部文件仍从其原下载源获取；Isles 不把所有远程模组重新打包分发。

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
