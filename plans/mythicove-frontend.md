# Mythicove 前端技术栈与设计方案

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

## 3. 品牌色卡（蓝紫幻境之翼）

> 依据徽章「藍紫幻境之翼」主色提取，锚定 **蓝 → 紫** 渐变。

**核心色**

| Token | 色值 | 用途 |
|---|---|---|
| `brand` | `#4F46E5` | 主品牌、主按钮、链接、激活态 |
| `brand-strong` | `#4338CA` | hover / active |
| `violet` | `#8B5CF6` | 渐变另一极、强调、徽章 |
| `sky` | `#38BDF8` | 高光、进度条、浅色点缀 |

**品牌签名渐变**：`#38BDF8 → #4F46E5 → #8B5CF6`（logo / hero / 主 CTA）。

**深色主题（默认，呼应「幻境夜空」）**

| Token | 值 |
|---|---|
| `bg` | `#0B1026` |
| `surface` | `#1A1F3A` |
| `border` | `#2A3150` |
| `text` | `#E6E9F5` |
| `text-muted` | `#9AA0B8` |

**浅色主题（对应徽章白底）**

| Token | 值 |
|---|---|
| `bg` | `#F8FAFC` |
| `surface` | `#FFFFFF` |
| `border` | `#E2E8F0` |
| `text` | `#0F172A` |
| `text-muted` | `#64748B` |

**语义色**：成功 `#22C55E`（绿）· 错误 `#F43F5E`（红，勿用紫避免混淆）· 警告 `#F59E0B`（琥珀，唯一暖色点缀）。

## 4. 设计方案

- **主题**：深色优先，浅色可选，CSS 变量 + Tailwind 语义 token。
- **字体**：Inter（正文）+ Space Grotesk（标题，几何现代感）。
- **组件风格**：极简扁平、`rounded-xl` 卡片网格、大留白、无广告（对齐 Modrinth）。
- **关键组件**（皮肤站 + Mod 站共用）：皮肤/模组卡片、skinview3d 3D 预览器、上传拖拽区、搜索 facets、下载按钮、个人中心、管理后台。

## 5. 反「AI 味」设计规范

**文案去 AI 味**

- 禁用词（英文）：leverage / seamless / cutting-edge / empower / unleash / revolutionize / supercharge / harness / delve / robust / elevate。
- 禁用词（中文）：赋能 / 一站式 / 极致 / 闭环 / 沉淀 / 抓手 / 打通 / 颗粒度 / 心智 / 场景。
- 原则：直接说功能（「上传皮肤，离线服也能显示」「装 mod 一次配齐」），不用套话和空话。

**视觉去 AI 味**

- 避免：万能紫渐变 + 玻璃拟态 + 霓虹光晕堆砌 + emoji 图标 + 「图标+标题+一句空话」三列 feature 卡片。
- 做：用真实 Minecraft 视觉锚点——skinview3d 实时 3D 预览、真实皮肤纹理、像素方块元素、真实数据/截图；克制动效。

**排版与密度**

- 真实层级（大标题 + 副标题 + 正文），不全居中；密度对齐 Modrinth 的干净留白，别学 CurseForge 的密集广告。

**颜色纪律**

- 只用 §3 色卡：一主色（蓝紫）+ 一高光（青）+ 语义色，避免彩虹式用色。

**空状态与占位**

- 用真实皮肤缩略图 / 玩家头像，不用通用插画或抽象图标。

## 6. 长期优势

1. **契约优先端到端**：OpenAPI → 生成 TS client + Zod，Go 后端与前端类型零漂移。
2. **一套语言吃全生态**：皮肤站 / Mod 站 / 启动器（Tauri+React）全用 React+TS，复用设计系统与组件。
3. **体验对齐标杆**：SSR/SSG + TanStack Query + shadcn/ui，对齐 Modrinth 的现代 UX，规避 CurseForge 缺点。
4. **双部署**：edge 或 Docker 自托管，覆盖 10→10k 分级。
5. **品牌辨识度**：蓝紫渐变与 Modrinth 绿、CurseForge 橙、MC 官方绿明显区分。
