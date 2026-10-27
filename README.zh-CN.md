# Mythicove Docs

[English](./README.md) | **简体中文**

Mythicove 生态的统一文档仓库。所有跨仓库、或"开发过程中需要版本化"的文档统一放这里，不散落到各产品仓库的随机子目录。

文档站基于 **Astro + Starlight** 构建（Markdown 为唯一内容源），支持 zh-CN（默认）/ en 双语、深浅色 logo、按分类的侧边栏与全文搜索（Pagefind）。

## 约定

| 放这里（`docs`） | 放产品仓库 | 放 `api` 仓库 | 不进仓库 |
|---|---|---|---|
| 产品计划、架构决策记录（ADR）、部署/运维文档、团队规范（安全策略 / 行为准则 / 贡献指南正本为本站「社区」栏目页面） | 与代码强绑定的 `README`、`CHANGELOG`、代码内注释，指向本站社区栏目的英文指针文件（`SECURITY.md` 等），换证仓库的 `LICENSE.history` | API 契约（OpenAPI） | 一次性草稿、密钥、环境相关本地文件 |

语言约定：仓库根目录文档（`README`、`CHANGELOG`、`LICENSE.history` 等）**默认英文**，中文版加 `.zh-CN.md` 后缀，文件顶部互相提供切换链接，单文件内不混排两种语言；本站内容则以 zh-CN 为默认语言、英文在 `en/` 目录。

## 目录

```
docs/
├── astro.config.mjs          # Starlight 配置（logo / i18n / 侧边栏 / 品牌色）
├── LICENSE                   # 内容许可证（CC BY-SA 4.0）
├── LICENSE-CODE              # 站点代码许可证（MIT）
├── SECURITY.md 等            # 指向本站社区栏目的英文指针文件
├── public/                   # favicon 等静态资源
├── src/
│   ├── assets/               # logo（深/浅，圆角）
│   ├── styles/custom.css     # 品牌蓝紫主题变量
│   └── content/docs/         # 文档内容（Markdown / MDX）
│       ├── index.mdx         # zh-CN 首页
│       ├── getting-started/  # 简介、快速开始
│       ├── products/         # Mirror / Hoard / Compass / 前端
│       ├── guides/           # authlib-injector、正版绑定
│       ├── architecture/     # ADR-0001..0012
│       ├── deploy/           # Docker Compose、存储分级、多实例
│       ├── community/        # 安全策略、行为准则、贡献指南（正本）
│       └── en/               # 英文内容（未翻译页回退到中文）
└── deploy/                   # 可直接使用的部署产物（docker-compose / Caddyfile）
```

## 本地开发

```bash
pnpm install
pnpm dev      # http://localhost:4321
pnpm build    # 产出 dist/
```

## 部署

GitHub Actions（`.github/workflows/deploy.yml`）构建并部署到 GitHub Pages。

- 自定义域名（如 `docs.mythicove.com`）：保持 `astro.config.mjs` 的 `site` 与默认 `base: '/'`。
- 项目站点（`<org>.github.io/docs/`）：在 `astro.config.mjs` 增加 `base: '/docs/'`。

## 多语言

- 默认（root）= zh-CN，英文在 `src/content/docs/en/`。
- 未翻译的页面自动回退到中文，避免死链。
- 侧边栏分类标签在 `astro.config.mjs` 的 `sidebar` 中通过 `translations` 提供双语。

## 许可证

本仓库按内容类型双重授权：

- **文档内容**（`src/content/docs/` 下的 Markdown / MDX 等文字与图片）：[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)，见 [LICENSE](./LICENSE)。
- **站点代码**（`astro.config.mjs`、`src/styles/`、组件、`public/` 资源、构建脚本等）：[MIT](https://opensource.org/license/mit)，见 [LICENSE-CODE](./LICENSE-CODE)。

理由：CC 系列面向创作内容、不适合软件；代码走 MIT 便于复用与工具接入，文本继续用 CC BY-SA 保留署名与相同方式共享要求。详见 [ADR-0004](./src/content/docs/architecture/adr-0004-license.md)。
