---
title: 为何自研：调研结论
---

本页汇总各产品线的调研结论，回答"为什么不 fork 或复用现有项目"。产品定位与现状见「产品」栏目，排期与风险见「调研与计划」栏目的各产品计划。

## 皮肤站（Mirror）

| 结论 | 依据 |
|---|---|
| Blessing Skin 是唯一完整开源皮肤站，但卡 PHP 8.1 EOL、UI 丑、更新慢 | `bs-community/blessing-skin-server` 1062★，`composer.json` `php:^8.1`，Laravel 10 |
| 其余都是协议片段或渲染服务，无现代替代 | authlib-injector（客户端）、crafatar（头像渲染）、ghauth（停更）、chrly（Go 皮肤分发，停更） |
| 三个成熟组件可直接复用 | `skinview3d`（3D 预览）、Yggdrasil 规范、crafatar 头像 API 约定 |
| 后端语言选 Go 的理由 | 单二进制、低内存；`elyby/chrly` 已验证 Go 写皮肤系统是顺手的；与 MC 后端工具链同构 |

## Mod 托管（Hoard）

| 结论 | 依据 |
|---|---|
| Modrinth 是唯一生产级开源 Mod 托管，但 2024 改许可证为 source-available | `modrinth/code` 2466★，Rust+TS/Vue，许可证 `Other`（非 OSI 开源）；旧 `labrinth`/`knossos` 已 archive |
| CurseForge 闭源，API 需 key 且受限 | 社区靠 furse、cfproxy、curserinth 等 wrapper 反向对接 |
| 无现代可 fork 的开源替代 | TechnicSolder（PHP/MIT，老）、SKCraft/Launcher（Java，私服向）、AutoModpack/HOPPER（仅同步） |
| 工具链可复用 | packwiz（Go/MIT，1026★）是整合包打包事实标准 |
| 后端语言选 Go 的理由 | 与 packwiz、mrpack-install、mcman 等 MC 分发工具链同构；低内存适合多实例自托管 |
