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
| E1 | Isles 基础：持久化服务器、公开/管理 API、秘密隔离、Java/Bedrock 状态 | HTTP 场景验证配置→公开读取→状态及未授权拒绝 | 开发中 |
| E2 | Web 服务器目录、详情、集成后台及代理鉴权 | 真后端页面流程，普通用户不能管理；未配置可独立运行 | 待做 |
| E3 | MCSManager、Pterodactyl 的实例发现/控制/日志，监控接口 | 测试上游协议边界，真实目标面板验证另记版本 | 待做 |
| E4 | packwiz 与 `.mrpack`、Modrinth/Hangar 来源、资源包 | 发布不可变版本，客户端/服务端分离，真实包安装 | 待做 |
| E5 | 游戏 Bridge：平台连接、游戏身份验证、基础状态 | 真服启动与 HTTP 交互，连接撤销和 UUID 授权 | 待做 |
| E6 | LuckPerms、spark、PlaceholderAPI、Plan | 成员资格、性能摘要、本人资料与面板入口 | 待做 |
| E7 | 游戏世界、治理、跨平台与社区扩展 | 每种实际支持平台有测试/真服证据 | 待做 |
| E8 | Web 社区视觉、分组后台；Compass grasscn 与启动核心流程 | 中文/键盘/小窗口、实际启动与错误/下载进度 | 待做 |

## 全部候选交付清单

每个项目都有独立状态；单个集成不会强制其他集成安装。

| 项目 | 最小有用交付及深入目标 | 依赖 | 状态 |
|---|---|---|---|
| MCSManager | 连接测试、选择实例、启停重启、命令、近期日志；实时日志和可选 OIDC | E1/E2 | 待做 |
| Pterodactyl | Client API 选择服务器、资源、power、command、WebSocket | E1/E2 | 待做 |
| BlueMap | 地图入口/嵌入、权限与网关说明；世界/地标/皮肤关联 | E1/E2，深度需 Bridge | 待做 |
| squaremap | 已有地图入口、地图标记适配 | E1/E2，深度需 Bridge | 待做 |
| Dynmap | 已有地图入口、官方标记 API | E1/E2，深度需 Bridge | 待做 |
| packwiz | 源检查、版本发布、`.mrpack` 导出/安装、可选项与服务端分离 | E1，Hoard/Compass | 待做 |
| AutoModpack | 独立实例安装/共存、服务端配置指引；协议适配单独验证 | Compass | 待做 |
| Modrinth | 搜索/版本/哈希识别，选定版本安装，保留来源 | Hoard/Compass | 待做 |
| Hangar | 插件搜索/版本/下载来源，平台过滤 | E1/E2 | 待做 |
| Polymer | 资源包版本/产物链接、AutoHost 接入；发布本站产物 | 资源包分发 | 待做 |
| SkinsRestorer | 已验证身份应用本站皮肤，持久/临时和代理模式验证 | Bridge、Mirror | 待做 |
| LuckPerms | 本站负责的成员组授予/撤销、上下文及状态读取 | Bridge、身份绑定 | 待做 |
| PlaceholderAPI | 站长选定的玩家资料展示项；不可用结果明确 | Paper Bridge | 待做 |
| Plan | 既有分析入口、访问隔离；本人活动与聚合资料 | E1/E2，深入需 Bridge | 待做 |
| spark | TPS/MSPT/CPU/GC、报告链接，支持范围明确 | Bridge | 待做 |
| Prometheus Exporter | `/metrics`、`/health`，历史监控接已有 Prometheus | E1/E2 | 待做 |
| Geyser / Floodgate | Java/Bedrock 入口、基岩探测、验证后的跨平台身份 | E1，身份需 Bridge | 待做 |
| ViaVersion / Backwards / Rewind | 实际支持版本范围与进服检查 | Bridge、Compass | 待做 |
| WorldGuard | 领地/成员只读、地图定位；授权管理 | Paper Bridge | 待做 |
| Towny | 城镇/国家/居民/招募与地图；授权管理 | Paper Bridge | 待做 |
| FTB Teams / Chunks | 团队、领地及实际强制加载状态 | 对应模组平台 Bridge | 待做 |
| FTB Quests | 任务定义、本人/团队进度只读，隐藏规则 | 对应模组平台 Bridge | 待做 |
| CoreProtect | 举报坐标关联历史查询；回滚/恢复作为独立管理流程 | Paper Bridge | 待做 |
| Ledger | Fabric 历史查询/举报关联，先确认支持接口 | Fabric Bridge | 待做 |
| LibertyBans | 本人处罚、管理查询、申诉；授权处罚操作 | Bridge、身份绑定 | 待做 |
| Vault | 本人余额/货币格式；交易需单独完整语义 | Paper Bridge、Economy provider | 待做 |
| DiscordSRV | 复用已验证绑定和事件、身份/成员关联 | Paper Bridge | 待做 |
| Simple Voice Chat | 包依赖、部署诊断与指引；游戏内状态 | Compass，深入需 Bridge | 待做 |
| itzg/docker-minecraft-server | 固定版本 Compose 示例、packwiz/资源/网络配置 | E4 | 待做 |
| Chunky | 预生成任务发起、进度/暂停/取消与维护状态 | Bridge 或面板命令 | 待做 |

## 基础设计与验证

- 公开站点数据和管理秘密使用不同响应，密钥不出现在公开配置、日志或浏览器地址。
- 优先验证协议和现有安装器，避免为单项能力新造同类框架。
- 没有实例或插件的功能标明未连接/不支持，不用零值伪造成功。
- Java/Bedrock 探测是游戏可连接性，面板进程状态单独呈现。
- 记录具体服务端平台、MC、插件版本，真实外部环境测试与 HTTP 协议测试分开记录。
- E2 首次交付复用 Mirror 已有管理员校验，通过服务器端 BFF 调用 Isles；不将游戏 token 或主密码作为 Isles 管理凭据。

## 执行记录

- E0：调研和本计划纳入 docs；docs 构建验证。

参考：[视觉与总体架构评估](../research/web-and-mc-ecosystem.md)、[可选整合调研](../research/optional-mc-integrations.md)。
