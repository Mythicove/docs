---
title: 贡献指南
---

本页是 Mythicove 生态所有仓库的统一贡献指南正本。各仓库根目录的 CONTRIBUTING.md 是指向本页的指针文件，仓库特有的构建和测试命令见各仓库 README。

## 仓库分工

| 仓库 | 内容 | 许可证 |
|---|---|---|
| mythic-mirror、mythic-hoard | Go 后端产品 | Elastic License 2.0 |
| web、compass | 前端产品（Next.js、Vite） | Elastic License 2.0 |
| shared | 共享 Go 模块（能力接口与领域类型） | Elastic License 2.0 |
| api | OpenAPI 契约与生成物 | MIT |
| docs | 文档站（Astro + Starlight）、ADR、部署产物 | 内容 CC BY-SA 4.0，站点代码 MIT |

## 如何贡献

1. Bug 与需求先在对应仓库提 issue，跨产品的问题提到 docs。安全漏洞走[安全策略](./security.md)的私密上报流程，不要开公开 issue。
2. 小改动可以直接发 Pull Request。涉及架构、数据模型或跨仓库契约的改动，先提 issue 或在 docs 补一份 ADR 再动手。
3. 参与即表示同意[行为准则](./code-of-conduct.md)。

## 提交规范

- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)，使用 feat、fix、docs、chore、refactor 等类型。web 仓库由 commitlint 和 lint-staged 强制检查。
- 一个提交只做一件事。换证、依赖升级这类杂务与功能改动分开提交。

## 代码风格

- Go（shared、mythic-mirror、mythic-hoard）：运行 gofmt；SQL 查询一律经 sqlc 生成，不手写扫描代码；CI 运行 govulncheck。
- TypeScript 前端（web、compass）：ESLint、Prettier、Stylelint；组件遵循仓库内现有模式（shadcn/ui）。
- API 契约（api）：先改 OpenAPI 再跑代码生成，不要手改生成物。

## 文档与语言约定

- 仓库根目录文档（README、CHANGELOG、LICENSE.history 等）默认英文，中文版加 .zh-CN.md 后缀，两个文件在顶部互相链接，单个文件不混排两种语言。
- 文档站内容默认 zh-CN（src/content/docs/ 根目录），英文放在 src/content/docs/en/。新页面尽量双语，未翻译页自动回退中文。
- 安全策略、行为准则、贡献指南的正本是本站「社区」栏目页面，各仓库只放指向本站的英文指针文件。

## 架构决策

影响多个仓库或有长期影响的决策，需要在 docs/src/content/docs/architecture/ 增加一篇 ADR，编号顺延，写清背景、决策、理由和后果。推翻旧决策时修订原 ADR 并注明修订日期，参考 ADR-0004。

## 许可证与贡献归属

向任何仓库提交贡献，即同意你的贡献按该仓库的现行许可证发布，见上表与各仓库 LICENSE。产品仓库属于 source-available（ELv2），不是 OSI 定义的开源项目，对外描述时注意措辞。换证历史见各仓库 LICENSE.history。
