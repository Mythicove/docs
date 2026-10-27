---
title: Mythicove 前端技术栈与治理
---

> 面向 Mythicove 生态（皮肤站 Mirror、Mod 托管 Hoard、后续 Compass 启动器）的统一前端方案。设计 token 与视觉规范见「设计」栏目，竞品调研见「调研与计划」栏目。

## 前端技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | Next.js (App Router) + React 19 + TS | SEO（公开 mod/皮肤页），SSR/SSG 对标 Modrinth |
| 样式 | Tailwind CSS 4 | 工程化成熟 |
| 组件库 | shadcn/ui（Radix） | 现代默认、copy-paste 可控、天然极简 |
| 数据 | TanStack Query | 对标 Modrinth 的 Vue Query |
| 契约 | openapi-typescript + Zod | 与 Go 后端 OpenAPI 契约优先打通 |
| 3D | skinview3d | 皮肤预览 |
| i18n | next-intl | 路由级 locale |
| 部署 | Cloudflare Pages（edge）或 Docker（自托管） | 双轨，对齐部署分级 |

为什么 React 而非 Modrinth 的 Vue：React 生态更大（shadcn/ui、MC 工具链、招人和 AI 支持）；skinview3d 框架无关；ADR-0001 已定 React，全生态（含 Compass 启动器的 Tauri+React）同一语言。

## 前端架构（monorepo）

前端独立成 monorepo（pnpm 加 turborepo，与 Go 后端仓库分离）：

```
web/
├── apps/
│   ├── skin/                 # 皮肤站（Mirror）
│   └── mods/                 # Mod 托管（Hoard）
├── packages/
│   ├── ui/                   # 设计系统：tokens + shadcn/ui 组件 + skinview3d 封装
│   ├── api-client/           # openapi-typescript 生成的 TS client + Zod schema
│   ├── tailwind-config/      # 共享 Tailwind preset（挂接 token）
│   ├── eslint-config/        # 共享 ESLint
│   └── tsconfig/             # 共享 TS 配置
└── tooling/                  # stylelint 配置、脚本
```

- tokens 单一来源：`packages/ui/tokens/*.json` 生成 CSS 变量、Tailwind theme、TS 类型（用 style-dictionary 或脚本）。
- 组件：shadcn/ui 以"复制进 `packages/ui`"方式沉淀，跨两个 app 复用。
- 启动器 Compass 后续作为 `apps/launcher`（Tauri + React）加入，复用 `packages/ui`。

## 前端治理

### 代码风格

| 工具 | 作用 |
|---|---|
| ESLint | `@typescript-eslint` strict + React hooks 规则 |
| Prettier | 统一格式化 + `prettier-plugin-tailwindcss`（class 排序） |
| stylelint | 见下 |
| TypeScript | `strict: true`（含 `noUncheckedIndexedAccess`） |
| commitlint | Conventional Commits |
| husky + lint-staged | pre-commit 跑 lint/format |

### stylelint（样式治理重点）

`stylelint-config-standard-scss` 加 `stylelint-order`，关键规则：

```js
export default {
  extends: ['stylelint-config-standard-scss'],
  plugins: ['stylelint-order'],
  rules: {
    'order/properties-alphabetical-order': true,
    'color-no-hex': true,                        // 禁止裸 hex，强制 var(--color-*)
    'function-disallowed-list': ['rgb', 'rgba', 'hsl'], // 颜色走 token，不用函数
    'declaration-no-important': true,            // 禁止 !important
    'selector-max-id': 0,                        // 禁止 #id 选择器
    'max-nesting-depth': 2,
    'unit-allowed-list': ['px', 'rem', '%', 'em', 's', 'deg', 'fr', 'vh', 'vw'],
    'custom-property-pattern': '^(color|space|radius|font|shadow|motion)-',
  },
}
```

配合 Tailwind：禁止任意颜色值 `bg-[#…]`（靠约定加 ESLint 规则或 review 把关），颜色一律走 token 对应的 Tailwind 类。

### 治理清单（CI 强制）

1. `typecheck`（tsc --noEmit）
2. `lint`（eslint + stylelint）
3. `build`（next build）
4. 契约漂移检查：`api-client` 从 `api` 仓库 spec 生成后 `git diff --exit-code`
5. 可选（后期）视觉回归：Playwright 截图加基线段

### 落地状态注（2026-10-24）

- 已落地：Tailwind 4 + shadcn/ui(base-ui) + next-intl + openapi-typescript 契约生成 + skinview3d；token 三层中的 Semantic 和 Component 层（CSS 变量 + Tailwind 语义类 + 阴影/圆角/字体 token）；stylelint、ESLint、Prettier(tailwindcss 插件)、commitlint、husky 门禁；图标统一 lucide；反 AI 味规范执行（无渐变文字、无非等宽三列卡片、像素网格锚点）。
- 未落地（仍为规划）：TanStack Query 与 Zod（当前以 `lib/api.ts` 边界归一化加 `lib/errors.ts` 映射替代运行时校验）；monorepo、`packages/ui`、style-dictionary token 生成（当前 token 单文件 `globals.css` 加 `lib/themes.ts`）；stylelint 的 `custom-property-pattern`（语义 token 命名与该 pattern 冲突，已在 stylelint 配置注释说明）。
- 取舍理由：单仓单 app 阶段引入 monorepo 与 token 代码生成属于提前抽象；待第二个 app（Compass 复用设计系统）启动时再执行 monorepo 一节。

## 相关文档

- 设计：[设计 Token 体系](../design/tokens.md)、[视觉与文案规范](../design/visual-rules.md)
- 调研：[前端竞品调研与长期优势](../research/frontend-competitors.md)
- 架构决策：[ADR-0001 语言选型](../architecture/adr-0001-language.md)
