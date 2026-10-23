---
title: Mythic Compass（罗盘）
description: 启动器 —— Yggdrasil 登录 + 3D 皮肤预览 + 整合包下载
---

Mythic Compass 是 Mythicove 生态的启动器（Tauri 2 + React），负责把玩家从「登录」带到「进服」。

## 核心能力

- **Yggdrasil 登录**：邮箱 + 密码换取 accessToken / clientToken，与皮肤站同一套账号。
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

> 内建原生启动（自解析版本 / 资源 / 库）在路线图中。
