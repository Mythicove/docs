# Security Policy

## Supported Versions

项目尚处于规划阶段，暂无正式发布版本。首个版本发布后，此处列出安全支持矩阵。

## Reporting a Vulnerability

**请勿在公开 issue 中披露安全漏洞。** 使用仓库 Security 标签下的「Private vulnerability reporting」提交私有 Security Advisory，或先私下联系维护者。我们会在确认后处理并发布对应修复版本与公告。

## Dependency Baseline

- **Go**：CI 强制运行 `govulncheck`；依赖升级由 Dependabot 自动化。
- **前端（Node/TS）**：代码落地后，CI 增加 `npm/pnpm audit`。
- **重点关注的已知项**（截至 2026-10-22）：
  - `undici`（Node 内置 fetch 依赖）须 ≥ 6.29.1 / 7.30.1 / 8.12.2，并跟进 Node 官方补丁。
  - `klauspost/compress`（若被间接引入）须 ≥ v1.18.7。

## Out of Scope

本生态技术栈为 Go 后端 + TypeScript 前端，不含 PHP。PHP2Shell 类（PHP core RCE）漏洞不适用。
