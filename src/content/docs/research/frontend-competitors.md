---
title: 前端竞品调研与长期优势
---

## 竞品前端调研（简表）

| | Modrinth（确凿） | CurseForge（推断） | minecraft.net（推断） |
|---|---|---|---|
| 框架 | Nuxt 3 (Vue 3) | React SPA | React + 无头 CMS |
| 语言 | TypeScript | TypeScript | TypeScript |
| 样式 | Tailwind + Sass + 自研 `@modrinth/ui` | 自研设计系统 | 强定制 |
| 数据 | TanStack Vue Query + `@modrinth/api-client` | 自研 | Contentful |
| 3D | three.js | 无 | 无 |
| 部署 | Cloudflare Workers (edge) | 传统/CDN | Azure/Cloudflare |

结论：Modrinth 是体验标杆（干净、无广告、现代）；CurseForge 是反面教材（密集、广告重）。

## 长期优势

1. 契约优先端到端：OpenAPI 生成 TS client 和 Zod schema，Go 后端与前端类型零漂移。
2. 一套语言吃全生态：皮肤站、Mod 站、启动器（Tauri+React）全用 React+TS，复用设计系统与组件。
3. 体验对齐标杆：SSR/SSG 加 TanStack Query 加 shadcn/ui，对齐 Modrinth 的现代 UX，规避 CurseForge 缺点。
4. token 驱动：单一来源生成 CSS, Tailwind, TS，换肤和换主题只改 token，治理靠 stylelint 和 ESLint 强制。
5. 双部署：edge 或 Docker 自托管，覆盖 10 到 10k 分级。
6. 品牌辨识度：蓝紫渐变与 Modrinth 绿、CurseForge 橙、MC 官方绿明显区分。
