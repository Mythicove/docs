---
title: 私服整合包、资源包与语音的可选部署
description: 使用 packwiz、AutoModpack、Polymer、Simple Voice Chat 和 itzg 维护私服客户端与服务端。
---

## 选择已有的分发路线

Mythicove 不要求站长同时采用所有工具。已经用 packwiz 或 AutoModpack 的社区可以保留现有流程；Hoard 承担本站发布，Compass 承担独立游戏实例，Isles 关联服务器与对应的客户端版本。

### packwiz

适合用 Git 管理清单、固定发布版本、区分客户端和服务端、提供可选内容。Isles 已提供 packwiz 1.1 URL 源到 `.mrpack` 的校验发布，具体支持格式及限制见[服务器集成指南](./server-integrations.md)。

```text
站长维护 pack.toml / index.toml
        ↓ 发布一版
Isles 校验索引、元数据与文件 → 固定哈希的 .mrpack
        ↓
服务器页面下载 → Compass 或其他支持 .mrpack 的启动器导入
```

采用官方 packwiz-installer 的启动器也可继续使用原源地址，官方 installer 支持可选项界面和服务端物理侧选择。当前 `.mrpack` 导出不复制其默认勾选界面；不能把滚动源 URL 当作不可变的发布版本。

### AutoModpack

适合由游戏服务端维护内容，玩家通过客户端模组按服同步。按[官方说明](https://github.com/Skidamek/AutoModpack)安装服务端/客户端对应版本；同步过程会要求首次确认服务器证书指纹，并可能需要重启游戏。

为 AutoModpack 创建独立实例，先装官方支持的 Minecraft/Loader 与客户端模组，再连接服务器。不要同时让启动器的包更新和 AutoModpack 对同一组文件负责。站点可提供安装说明及入口，但当前还没有第三方同步协议适配；提供本指南不表示 Compass 已原生实现 AutoModpack。

### Polymer 和普通服务器资源包

Polymer 已有资源包生成与 AutoHost。已有可用地址时，在本站服务器说明中提供浏览器入口，无需强制搬到本站存储。[官方 AutoHost 指南](https://polymer.pb4.eu/latest/user/resource-pack-hosting/)区分直接连接、代理和自定义端口配置。

普通 Java 服务器资源包与整合包不是同一类产物：前者由 Minecraft 的资源包提示和服务器配置控制，后者还决定 Loader、mods 和配置文件。发布时分别记录版本与哈希，避免用一个“客户端包”字段混淆两种下载。当前尚未实现 Polymer 生成产物自动采集及游戏内资源包应用状态回报。

### Simple Voice Chat

将对应版本的客户端组件加入独立实例或整合包，服务端按[官方部署指南](https://modrepo.de/minecraft/voicechat/wiki/server_setup)开放其语音使用的 **UDP** 端口。只开放 Minecraft 的 TCP 端口不等于语音可连接；代理网络需使用对应的代理配置。

网页提供部署和连接指引即可与现有游戏语音共存。当前没有网页音频桥接，也没有声称浏览器能直接作为原生语音客户端；游戏内状态适配仍列在计划中。

## 不安装面板的 itzg 部署示例

`deploy/minecraft/compose.yml` 是独立的 Paper 示例，固定 itzg Java 21 镜像 manifest，默认 Minecraft 1.21.1。用户可以显式调整 `MC_VERSION`，先确认插件与 Java 版本匹配。示例不挂载宿主 Docker socket，不启用 RCON，世界数据存独立命名卷。

先阅读并明确选择是否接受 [Minecraft EULA](https://www.minecraft.net/eula)，通过 `MC_EULA` 传入对应值：

```sh
export MC_EULA=true
docker compose -p my-community -f docs/deploy/minecraft/compose.yml up -d
```

可调整 `MC_PORT`（默认 25565）和 `MC_MEMORY`（默认 2G）。停止并保留世界：

```sh
docker compose -p my-community -f docs/deploy/minecraft/compose.yml down
```

这里不使用 `--volumes`：删除世界应由站长在明确备份后单独处理。

采用 packwiz/Fabric 时叠加 overlay：

```sh
export PACKWIZ_URL=https://files.example.org/server-pack/pack.toml
docker compose -p my-community \
  -f docs/deploy/minecraft/compose.yml \
  -f docs/deploy/minecraft/compose.packwiz.yml up -d
```

`MC_VERSION` 和 pack.toml 中的 Minecraft 版本需保持一致，客户端和服务端只安装各自物理侧内容。镜像使用自身的 packwiz 安装支持，本站没有再实现一套容器安装器。

启动后在 Isles 添加实际玩家连接地址即可展示游戏状态。容器进程管理仍由 Compose 或原有面板负责；这个模板不等于网页获得远程 Docker 管理权限。

验证记录：已解析两套 Compose 配置，确认必填 EULA/包源缺失时拒绝；镜像 manifest 已通过 Docker registry 查询固定。完整容器运行、插件/整合包安装结果需在目标部署继续验收，不以配置解析通过替代真服验证。
