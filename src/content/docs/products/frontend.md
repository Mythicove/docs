---
title: Mythicove 前端技术栈与设计方案
---

> 面向 Mythicove 生态（皮肤站 Mirror / Mod 托管 Hoard / 后续 Compass 启动器）的统一前端方案。

## 1. 竞品前端调研（简表）

| | Modrinth（确凿） | CurseForge（推断） | minecraft.net（推断） |
|---|---|---|---|
| 框架 | Nuxt 3 (Vue 3) | React SPA | React + 无头 CMS |
| 语言 | TypeScript | TypeScript | TypeScript |
| 样式 | Tailwind + Sass + 自研 `@modrinth/ui` | 自研设计系统 | 强定制 |
| 数据 | TanStack Vue Query + `@modrinth/api-client` | 自研 | Contentful |
| 3D | three.js | — | — |
| 部署 | Cloudflare Workers (edge) | 传统/CDN | Azure/Cloudflare |

**结论**：Modrinth 是体验标杆（干净、无广告、现代）；CurseForge 是反面教材（密集、广告重）。

## 2. 前端技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | **Next.js (App Router) + React 19 + TS** | SEO（公开 mod/皮肤页），SSR/SSG 对标 Modrinth |
| 样式 | **Tailwind CSS 4** | 工程化成熟 |
| 组件库 | **shadcn/ui**（Radix） | 现代默认、copy-paste 可控、天然极简 |
| 数据 | **TanStack Query** | 对标 Modrinth 的 Vue Query |
| 契约 | **openapi-typescript + Zod** | 与 Go 后端 OpenAPI 契约优先打通 |
| 3D | **skinview3d** | 皮肤预览 |
| i18n | **next-intl** | 路由级 locale |
| 部署 | **Cloudflare Pages**（edge）或 **Docker**（自托管） | 双轨，对齐部署分级 |

**为什么 React 而非 Modrinth 的 Vue**：React 生态更大（shadcn/ui、MC 工具链、招人/AI 支持）；skinview3d 框架无关；ADR-0001 已定 React，全生态（含 Compass 启动器的 Tauri+React）同一语言。

## 3. 设计 Token 体系

### 3.1 分层模型

采用标准三层，**值不直接写进组件**：

```
Primitive（基础值）→ Semantic（语义角色，随主题变）→ Component（组件级，按需）
```

- Primitive 与 Semantic 放 `packages/ui/tokens/`（单一来源），生成 CSS 变量 + Tailwind theme + TS 类型。
- 组件里只允许用 Semantic token（`bg-surface`、`text-primary` 等），禁止裸 hex / 任意值。

### 3.2 Primitive 基础色（蓝紫幻境之翼）

**品牌蓝紫系**

| 名 | 值 | 名 | 值 |
|---|---|---|---|
| `blue-700` | `#4338CA` | `blue-500` | `#6366F1` |
| `blue-600` | `#4F46E5` | `blue-400` | `#818CF8` |
| `violet-600` | `#7C3AED` | `violet-400` | `#A78BFA` |
| `violet-500` | `#8B5CF6` | | |
| `sky-500` | `#0EA5E9` | `sky-300` | `#7DD3FC` |
| `sky-400` | `#38BDF8` | | |

**中性色**

| 名（浅色主题） | 值 | 名（深色主题） | 值 |
|---|---|---|---|
| `white` | `#FFFFFF` | `night-900` | `#0B1026` |
| `gray-50` | `#F8FAFC` | `night-800` | `#1A1F3A` |
| `gray-200` | `#E2E8F0` | `night-700` | `#2A3150` |
| `gray-500` | `#64748B` | `night-400` | `#9AA0B8` |
| `gray-900` | `#0F172A` | `night-100` | `#E6E9F5` |

**状态色**：`green-500 #22C55E` · `amber-500 #F59E0B` · `rose-500 #F43F5E`。

### 3.3 Semantic 语义色（角色 → 深/浅两套）

| 角色 | 浅色主题 | 深色主题 |
|---|---|---|
| `bg` | `gray-50` | `night-900` |
| `surface` | `white` | `night-800` |
| `surface-raised` | `white` | `night-700` |
| `border` | `gray-200` | `night-700` |
| `text` | `gray-900` | `night-100` |
| `text-muted` | `gray-500` | `night-400` |
| `primary` | `blue-600` | `blue-500` |
| `primary-hover` | `blue-700` | `blue-400` |
| `primary-fg`（主色上文字） | `white` | `white` |
| `accent`（紫） | `violet-500` | `violet-400` |
| `highlight`（青） | `sky-400` | `sky-400` |
| `success` / `warning` / `danger` / `info` | 见状态色 | 同左 |

**品牌签名渐变**：`linear-gradient(135deg, sky-400, blue-600, violet-500)`（logo / hero / 主 CTA）。

### 3.4 颜色语义规则（哪里用什么）

| 颜色 | 用途 | 禁止 |
|---|---|---|
| `primary`（蓝紫） | 主按钮、链接、激活态、选中 | 大面积填充背景 |
| `accent`（紫） | 强调、徽章、会员/VIP、装饰 | 用作错误 |
| `highlight`（青） | 高光、进度条、hover 提示、新特性 | 大面积文字 |
| `danger`（红） | 错误、删除、封禁 | 用紫替代 |
| `warning`（琥珀） | 警告、待审核、限流 | 混入品牌渐变 |
| `success`（绿） | 成功、正版、已通过 | — |

**规则**：一个界面一主色 + 一高光 + 语义色；错误必须红（勿用紫避免与主色混淆）；琥珀是唯一暖色点缀。

### 3.5 字体 Token

| Token | 值 | 用途 |
|---|---|---|
| `font-sans` | Inter | 正文、UI |
| `font-display` | Space Grotesk | 标题、数字、品牌 |

字号（modular scale）：`12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 / 60`。
行高：正文 1.5，标题 1.2。正文行宽 < 80 字符。

### 3.6 间距 Token（4px 基准网格）

`0 / 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80`。

### 3.7 形状 Token

| Token | 值 | 用在哪 |
|---|---|---|
| `radius-sm` | `6px` | 输入框、小标签、tooltip |
| `radius-md` | `10px` | 按钮、下拉 |
| `radius-lg` | `16px` | 卡片、弹窗 |
| `radius-full` | `9999px` | 头像、圆形徽章、chip |

边框：统一 1px（`border` 色）。**同一层级统一圆角**，不混用（反 AI 味的"SaaS 卡片各元素不同圆角"）。

### 3.8 阴影 / 层级

| Token | 用途 |
|---|---|
| `shadow-sm` | 卡片 hover |
| `shadow-md` | 弹窗、下拉 |
| `shadow-lg` | 模态、抽屉 |

阴影用低透明度深蓝（`rgba(11,16,38,.08–.16)`），不用纯黑重影。

### 3.9 动效 Token

| Token | 值 |
|---|---|
| `motion-fast` | 150ms |
| `motion-base` | 250ms |
| `motion-slow` | 400ms |

缓动 `ease-out`；尊重 `prefers-reduced-motion`；动效只用于响应交互与**单次**进入，不堆叠。

## 4. 组件与形状应用

- **主题**：深色优先，浅色可选，CSS 变量 + Tailwind 语义 token 驱动。
- **组件风格**：极简扁平、卡片网格（`radius-lg` + `shadow-sm`）、大留白、无广告（对齐 Modrinth）。
- **关键组件**（皮肤站 + Mod 站共用）：皮肤/模组卡片、skinview3d 3D 预览器、上传拖拽区、搜索 facets、下载按钮、个人中心、管理后台。
- **图标**：统一 SVG（lucide-react 起步），线性 1.5px 描边，不用 emoji。

## 5. 反「AI 味」设计规范

**文案去 AI 味**

- 禁用词（英文）：leverage / seamless / cutting-edge / empower / unleash / revolutionize / supercharge / harness / delve / robust / elevate。
- 禁用词（中文）：赋能 / 一站式 / 极致 / 闭环 / 沉淀 / 抓手 / 打通 / 颗粒度 / 心智 / 场景。
- 原则：直接说功能（「上传皮肤，离线服也能显示」「装 mod 一次配齐」）。

**视觉去 AI 味**

- 避免：万能紫渐变 + 玻璃拟态 + 霓虹光晕堆砌 + emoji 图标 + 「图标+标题+一句空话」三列 feature 卡片。
- 做：真实 Minecraft 视觉锚点——skinview3d 实时 3D 预览、真实皮肤纹理、像素方块元素、真实数据/截图；克制动效。

**排版与密度**：真实层级（大标题 + 副标题 + 正文），不全居中；密度对齐 Modrinth，别学 CurseForge。

**空状态与占位**：用真实皮肤缩略图 / 玩家头像，不用通用插画。

## 6. 前端架构（monorepo）

前端独立成 monorepo（pnpm + **turborepo**，与 Go 后端仓库分离）：

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

- **tokens 单一来源**：`packages/ui/tokens/*.json` → 生成 CSS 变量 + Tailwind theme + TS 类型（用 style-dictionary 或脚本）。
- **组件**：shadcn/ui 以"复制进 `packages/ui`"方式沉淀，跨两个 app 复用。
- 启动器 Compass 后续作为 `apps/launcher`（Tauri + React）加入，复用 `packages/ui`。

## 7. 前端治理

### 7.1 代码风格

| 工具 | 作用 |
|---|---|
| **ESLint** | `@typescript-eslint` strict + React hooks 规则 |
| **Prettier** | 统一格式化 + `prettier-plugin-tailwindcss`（class 排序） |
| **stylelint** | 见下 |
| **TypeScript** | `strict: true`（含 `noUncheckedIndexedAccess`） |
| **commitlint** | Conventional Commits |
| **husky + lint-staged** | pre-commit 跑 lint/format |

### 7.2 stylelint（样式治理重点）

`stylelint-config-standard-scss` + `stylelint-order`，关键规则：

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

**配合 Tailwind**：禁止任意颜色值 `bg-[#…]`（靠约定 + ESLint 规则或 review 把关），颜色一律走 token 对应的 Tailwind 类。

### 7.3 治理清单（CI 强制）

1. `typecheck`（tsc --noEmit）
2. `lint`（eslint + stylelint）
3. `build`（next build）
4. **契约漂移检查**：`api-client` 从 `api` 仓库 spec 生成后 `git diff --exit-code`
5. （可选，后期）视觉回归：Playwright 截图 + 基线段

---

## 7.4 落地状态注（2026-10-24）

- **已落地**：Tailwind 4 + shadcn/ui(base-ui) + next-intl + openapi-typescript 契约生成 + skinview3d；token 三层中的 Semantic/Component 层（CSS 变量 + Tailwind 语义类 + 阴影/圆角/字体 token）；stylelint/ESLint/Prettier(tailwindcss 插件)/commitlint/husky 门禁；图标统一 lucide；反 AI 味规范执行（无渐变文字、无非等宽三列卡片、像素网格锚点）。
- **未落地（仍为规划）**：§2 的 TanStack Query 与 Zod（当前以 `lib/api.ts` 边界归一化 + `lib/errors.ts` 映射替代运行时校验）；§6 的 monorepo/`packages/ui`/style-dictionary token 生成（当前 token 单文件 `globals.css` + `lib/themes.ts`）；§7.2 的 `custom-property-pattern`（语义 token 命名与该 pattern 冲突，已在 stylelint 配置注释说明）。
- 取舍理由：单仓单 app 阶段引入 monorepo 与 token 代码生成属于提前抽象；待第二个 app（Compass 复用设计系统）启动时再执行 §6。

## 8. 长期优势

1. **契约优先端到端**：OpenAPI → 生成 TS client + Zod，Go 后端与前端类型零漂移。
2. **一套语言吃全生态**：皮肤站 / Mod 站 / 启动器（Tauri+React）全用 React+TS，复用设计系统与组件。
3. **体验对齐标杆**：SSR/SSG + TanStack Query + shadcn/ui，对齐 Modrinth 的现代 UX，规避 CurseForge 缺点。
4. **token 驱动**：单一来源生成 CSS/Tailwind/TS，换肤/换主题只改 token，治理靠 stylelint/ESLint 强制。
5. **双部署**：edge 或 Docker 自托管，覆盖 10→10k 分级。
6. **品牌辨识度**：蓝紫渐变与 Modrinth 绿、CurseForge 橙、MC 官方绿明显区分。
