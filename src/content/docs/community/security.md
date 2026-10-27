---
title: 安全策略
---

本页是 Mythicove 生态所有仓库的统一安全策略正本；各仓库根目录的 `SECURITY.md` 仅为指向本页的指针文件。

## 支持版本

只有各仓库的最新发布版本获得安全支持。旧版本（含 AGPL 时期的 v0.1.x–v0.3.x tag）不再单独发布安全补丁，请升级到最新版本。

## 上报漏洞

**请勿在公开 issue 中披露安全漏洞。** 使用对应仓库 Security 标签下的「Private vulnerability reporting」提交私有 Security Advisory，或邮件联系维护者 <team@tsinbei.com>。我们会在确认后处理，并发布对应修复版本与公告。

## 依赖基线

- **Go**：CI 强制运行 `govulncheck`；依赖升级由 Dependabot 自动化。
- **前端（Node/TS）**：CI 运行 `npm/pnpm audit`。
- **重点关注的已知项**（截至 2026-10-22）：
  - `undici`（Node 内置 fetch 依赖）须 ≥ 6.29.1 / 7.30.1 / 8.12.2，并跟进 Node 官方补丁。
  - `klauspost/compress`（若被间接引入）须 ≥ v1.18.7。

各仓库特有的依赖基线（如 `shared` 的零第三方依赖约定）记录在该仓库的 `SECURITY.md` 指针文件中。

## 范围外

本生态技术栈为 Go 后端 + TypeScript 前端，不含 PHP。PHP2Shell 类（PHP core RCE）漏洞不适用。
