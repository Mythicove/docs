---
title: Mythic Compass（罗盘）
---

Mythic Compass 是 Mythicove 生态的启动器（Tauri 2 + React），负责把玩家从「登录」带到「进服」。

## 核心能力

- Yggdrasil 登录：用**玩家名 + 该玩家的启动器独立密码**换取 accessToken / clientToken。ADR-0012 规定网站主密码不进协议端点，因此站点可以只留第三方登录而启动器照常工作。独立密码在网站的账号页（Profile → 启动器登录）生成，一个玩家可有多条，撤销即时生效。
- 3D 皮肤预览：`skinview3d` 实时渲染当前皮肤。
- Mod 与整合包浏览：从 Hoard 拉取 Mod、整合包与版本列表。下载与安装随开发计划落地。

## 架构

```
Compass (Tauri)
 ├─ React 前端：登录 / 皮肤预览 / Mod 浏览
 └─ Rust 模块：version（版本 JSON 与启动参数）、launch（原生启动）、net（下载与校验）、
    install、java（探测）、instance（实例）、assets、meta（piston-meta）
```

Rust 模块已实现并有测试，Tauri 命令与 UI 接线进行中。

## 启动方式

Prism 委托与 `.mrpack` 下载已在 P0 删除。原生启动（版本与资源解析、Java 探测、参数构造、进程管理）由上述 Rust 模块承担，命令接线完成后 Compass 自己拉起 Minecraft。阶段计划与验收标准见 [Compass 启动器开发计划](../plans/compass-launcher.md)。
