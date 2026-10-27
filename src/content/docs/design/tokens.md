---
title: 设计 Token 体系
---

## 分层模型

采用标准三层，值不直接写进组件：

```
Primitive（基础值）→ Semantic（语义角色，随主题变）→ Component（组件级，按需）
```

- Primitive 与 Semantic 放 `packages/ui/tokens/`（单一来源），生成 CSS 变量 + Tailwind theme + TS 类型。
- 组件里只允许用 Semantic token（`bg-surface`、`text-primary` 等），禁止裸 hex 和任意值。

## Primitive 基础色（蓝紫幻境之翼）

品牌蓝紫系：

| 名 | 值 | 名 | 值 |
|---|---|---|---|
| `blue-700` | `#4338CA` | `blue-500` | `#6366F1` |
| `blue-600` | `#4F46E5` | `blue-400` | `#818CF8` |
| `violet-600` | `#7C3AED` | `violet-400` | `#A78BFA` |
| `violet-500` | `#8B5CF6` | | |
| `sky-500` | `#0EA5E9` | `sky-300` | `#7DD3FC` |
| `sky-400` | `#38BDF8` | | |

中性色：

| 名（浅色主题） | 值 | 名（深色主题） | 值 |
|---|---|---|---|
| `white` | `#FFFFFF` | `night-900` | `#0B1026` |
| `gray-50` | `#F8FAFC` | `night-800` | `#1A1F3A` |
| `gray-200` | `#E2E8F0` | `night-700` | `#2A3150` |
| `gray-500` | `#64748B` | `night-400` | `#9AA0B8` |
| `gray-900` | `#0F172A` | `night-100` | `#E6E9F5` |

状态色：`green-500 #22C55E`、`amber-500 #F59E0B`、`rose-500 #F43F5E`。

## Semantic 语义色（角色对应深/浅两套）

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
| `success`、`warning`、`danger`、`info` | 见状态色 | 同左 |

品牌签名渐变：`linear-gradient(135deg, sky-400, blue-600, violet-500)`，只用于 logo、hero 和主 CTA。

## 颜色语义规则（哪里用什么）

| 颜色 | 用途 | 禁止 |
|---|---|---|
| `primary`（蓝紫） | 主按钮、链接、激活态、选中 | 大面积填充背景 |
| `accent`（紫） | 强调、徽章、会员/VIP、装饰 | 用作错误 |
| `highlight`（青） | 高光、进度条、hover 提示、新特性 | 大面积文字 |
| `danger`（红） | 错误、删除、封禁 | 用紫替代 |
| `warning`（琥珀） | 警告、待审核、限流 | 混入品牌渐变 |
| `success`（绿） | 成功、正版、已通过 | 无 |

规则：一个界面一主色加一高光加语义色；错误必须红（勿用紫避免与主色混淆）；琥珀是唯一暖色点缀。

## 字体 Token

| Token | 值 | 用途 |
|---|---|---|
| `font-sans` | Inter | 正文、UI |
| `font-display` | Space Grotesk | 标题、数字、品牌 |

字号（modular scale）：12、14、16、18、20、24、30、36、48、60。行高：正文 1.5，标题 1.2。正文行宽小于 80 字符。

## 间距 Token（4px 基准网格）

0、4、8、12、16、20、24、32、40、48、64、80。

## 形状 Token

| Token | 值 | 用在哪 |
|---|---|---|
| `radius-sm` | 6px | 输入框、小标签、tooltip |
| `radius-md` | 10px | 按钮、下拉 |
| `radius-lg` | 16px | 卡片、弹窗 |
| `radius-full` | 9999px | 头像、圆形徽章、chip |

边框统一 1px（`border` 色）。同一层级统一圆角，不混用（反 AI 味的"SaaS 卡片各元素不同圆角"）。

## 阴影与层级

| Token | 用途 |
|---|---|
| `shadow-sm` | 卡片 hover |
| `shadow-md` | 弹窗、下拉 |
| `shadow-lg` | 模态、抽屉 |

阴影用低透明度深蓝（`rgba(11,16,38,.08～.16)`），不用纯黑重影。

## 动效 Token

| Token | 值 |
|---|---|
| `motion-fast` | 150ms |
| `motion-base` | 250ms |
| `motion-slow` | 400ms |

缓动 `ease-out`；尊重 `prefers-reduced-motion`；动效只用于响应交互与单次进入，不堆叠。
