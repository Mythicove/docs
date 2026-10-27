---
title: 贡献指南
---

本页是 Mythicove 生态所有仓库的统一贡献指南正本；各仓库根目录的 `CONTRIBUTING.md` 仅为指向本页的指针文件，仓库特有的构建/测试命令见各仓库 `README`。

## 仓库分工

| 仓库 | 内容 | 许可证 |
|---|---|---|
| `mythic-mirror` / `mythic-hoard` | Go 后端产品 | Elastic License 2.0 |
| `web` / `compass` | 前端产品（Next.js / Vite） | Elastic License 2.0 |
| `shared` | 共享 Go 模块（能力接口 + 领域类型） | Elastic License 2.0 |
| `api` | OpenAPI 契约与生成物 | MIT |
| `docs` | 文档站（Astro + Starlight）、ADR、部署产物 | 内容 CC BY-SA 4.0 / 站点代码 MIT |

## 如何贡献

1. **Bug 与需求**：先在对应仓库提 issue；跨产品的问题提到 `docs`。安全漏洞请走[安全策略](./security.md)的私密上报流程，不要开公开 issue。
2. **Pull Request**：小改动可直接发 PR；涉及架构、数据模型或跨仓库契约的改动，请先提 issue 或在 `docs` 补一份 ADR 再动手。
3. **参与即认同**：所有互动遵守[行为准则](./code-of-conduct.md)。

## 提交规范

- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：`feat:` / `fix:` / `docs:` / `chore:` / `refactor:` 等（`web` 仓库由 commitlint + lint-staged 强制）。
- 一个提交只做一件事；换证、依赖升级等杂务与功能改动分开提交。

## 代码风格

- **Go**（`shared` / `mythic-mirror` / `mythic-hoard`）：`gofmt`；SQL 查询一律经 `sqlc` 生成，不手写扫描代码；CI 跑 `govulncheck`。
- **TypeScript/前端**（`web` / `compass`）：ESLint + Prettier + Stylelint；组件遵循仓库内现有模式（shadcn/ui）。
- **API 契约**（`api`）：先改 OpenAPI，再跑代码生成；不要手改生成物。

## 文档与语言约定

- 仓库根目录文档（`README`、`CHANGELOG`、`LICENSE.history` 等）**默认英文**（如 `README.md`），中文版加 `.zh-CN.md` 后缀（如 `README.zh-CN.md`）；两个文件顶部互相提供切换链接，单文件内不混排两种语言。
- 文档站内容以 zh-CN 为默认语言（`src/content/docs/` 根目录），英文放 `src/content/docs/en/`；新页面尽量双语，未翻译页自动回退中文。
- 安全策略 / 行为准则 / 贡献指南的正本即本站「社区」栏目页面，各仓库只放指向本站的英文指针文件。

## 架构决策

影响多仓库或有长期影响的决策，须在 `docs/src/content/docs/architecture/` 增加 ADR（编号顺延），说明背景、决策、理由与后果；推翻旧决策时修订原 ADR 并注明修订日期（参考 ADR-0004）。

## 许可证与贡献归属

向任何仓库提交贡献，即同意你的贡献按该仓库的现行许可证（见上表与各仓库 LICENSE）发布。产品仓库为 source-available（ELv2），并非 OSI 定义的开源项目，请在对外描述时注意措辞；换证历史见各仓库 `LICENSE.history`。
