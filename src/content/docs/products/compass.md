---
title: Mythic Compass（罗盘）
description: 启动器 —— Yggdrasil 登录 + 3D 皮肤预览 + 整合包下载
---

Mythic Compass 是 Mythicove 生态的启动器（Tauri 2 + React），负责把玩家从「登录」带到「进服」。

## 核心能力

- **Yggdrasil 登录**：**玩家名 + 该玩家的启动器独立密码**换取 accessToken / clientToken（[ADR-0012](/architecture/adr-0012-credential-separation/)：网站主密码不进协议端点，故站点可以只留第三方登录而启动器照常工作）。独立密码在网站的账号页（Profile → 启动器登录）生成，一个玩家可有多条，撤销即时生效。
- **3D 皮肤预览**：`skinview3d` 实时预览当前皮肤。
- **整合包浏览与下载**：从 Hoard 拉取 Mod/整合包列表，一键下载 `.mrpack`。
- **一键启动**：把 `.mrpack` 导入外部启动器（默认 Prism Launcher）并拉起。

## 架构

```
Compass (Tauri)
 ├─ React 前端：登录 / 皮肤预览 / Mod 浏览
 └─ Rust 命令：download_file（.mrpack 下载）、launch（调用外部启动器）
        │
        ├─ Mirror  /authserver/authenticate + /skin/{name}
        └─ Hoard   /api/mods + /v2/project/{id}/version/{vid}/mrpack
```

## 启动方式

当前版本把「实际拉起 Minecraft」委托给 Prism Launcher（支持 `--import` 导入 `.mrpack`），玩家在 Prism 里配置 authlib-injector 指向皮肤站即可加载皮肤。

> 内建原生启动（自解析版本 / 资源 / 库、自动下载 Java、实例与整合包管理、三平台打包）已有分阶段计划，见 [Compass 启动器开发计划](/plans/compass-launcher/)；Phase 1 验收通过后，本文这条"委托 Prism"的说明会被删除，不保留两种启动方式。
