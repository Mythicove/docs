# Mythicove Docs

[English](./README.md) | **简体中文**

Mythicove 生态的统一文档仓库。跨仓库的文档、需要随代码版本化的文档都放在这里。

文档站基于 Astro 和 Starlight 构建，Markdown 是唯一内容源。支持 zh-CN（默认）和 en 两种语言，有分类侧边栏和全文搜索（Pagefind）。

## 约定

| 放这里（docs） | 放产品仓库 | 放 api 仓库 | 不进仓库 |
|---|---|---|---|
| 产品计划、架构决策记录（ADR）、部署与运维文档、团队规范。安全策略、行为准则、贡献指南的正本是本站「社区」栏目页面 | 与代码绑定的 README、CHANGELOG 和代码注释；指向本站社区栏目的英文指针文件（SECURITY.md 等）；换证仓库的 LICENSE.history | API 契约（OpenAPI） | 一次性草稿、密钥、环境相关的本地文件 |

语言约定：仓库根目录文档（README、CHANGELOG、LICENSE.history 等）默认英文，中文版加 .zh-CN.md 后缀，两个文件在顶部互相链接，单个文件不混排两种语言。本站内容默认 zh-CN，英文放在 en/ 目录。

## 目录

```
docs/
├── astro.config.mjs          # Starlight 配置（logo、i18n、侧边栏、品牌色）
├── LICENSE                   # 内容许可证（CC BY-SA 4.0）
├── LICENSE-CODE              # 站点代码许可证（MIT）
├── SECURITY.md 等            # 指向本站社区栏目的英文指针文件
├── public/                   # favicon 等静态资源
├── src/
│   ├── assets/               # logo（深、浅两版，圆角）
│   ├── styles/custom.css     # 品牌蓝紫主题变量
│   └── content/docs/         # 文档内容（Markdown / MDX）
│       ├── index.mdx         # zh-CN 首页
│       ├── getting-started/  # 简介、快速开始
│       ├── products/         # Mirror / Hoard / Compass / 前端
│       ├── guides/           # authlib-injector、正版绑定
│       ├── architecture/     # ADR-0001 至 ADR-0012
│       ├── deploy/           # Docker Compose、存储分级、多实例
│       ├── community/        # 安全策略、行为准则、贡献指南（正本）
│       └── en/               # 英文内容（未翻译页回退到中文）
└── deploy/                   # 可直接使用的部署产物（docker-compose、Caddyfile）
```

## 本地开发

```bash
pnpm install
pnpm dev      # http://localhost:4321
pnpm build    # 产出 dist/
```

## 部署

GitHub Actions（.github/workflows/deploy.yml）构建并部署到 GitHub Pages，自定义域名为 docs.gov.skin，DNS 用 CNAME 指向 mythicove.github.io。

astro.config.mjs 的 site 设为 https://docs.gov.skin，根路径部署，不设 base。public/CNAME 固定域名绑定，避免 Actions 部署后丢失。如果回退到项目站点（<org>.github.io/docs/），需要重新设置 base: '/docs'，改回 site，并更新其他仓库指向本站的链接。

## 多语言

- 默认语言为 zh-CN，英文内容在 src/content/docs/en/。
- 没有英文版的页面会 404，因此新页面同时提供 en stub。
- 侧边栏分类标签的双语在 astro.config.mjs 的 sidebar translations 中配置。

## 许可证

本仓库按内容类型双重授权：

- 文档内容（src/content/docs/ 下的文字与图片）采用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)，见 [LICENSE](./LICENSE)。
- 站点代码（astro.config.mjs、src/styles/、组件、public/ 资源、构建脚本）采用 [MIT](https://opensource.org/license/mit)，见 [LICENSE-CODE](./LICENSE-CODE)。

CC 系列面向创作内容，不适合软件，所以站点代码单独用 MIT。文本继续用 CC BY-SA，保留署名和相同方式共享要求。详见 [ADR-0004](./src/content/docs/architecture/adr-0004-license.md)。
