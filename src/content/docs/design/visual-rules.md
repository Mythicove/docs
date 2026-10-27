---
title: 视觉与文案规范
---

## 组件与形状应用

- 主题：深色优先，浅色可选，CSS 变量加 Tailwind 语义 token 驱动。
- 组件风格：极简扁平、卡片网格（`radius-lg` 加 `shadow-sm`）、大留白、无广告（对齐 Modrinth）。
- 关键组件（皮肤站与 Mod 站共用）：皮肤/模组卡片、skinview3d 3D 预览器、上传拖拽区、搜索 facets、下载按钮、个人中心、管理后台。
- 图标：统一 SVG（lucide-react 起步），线性 1.5px 描边，不用 emoji。

## 反「AI 味」设计规范

### 文案去 AI 味

- 禁用词（英文）：leverage、seamless、cutting-edge、empower、unleash、revolutionize、supercharge、harness、delve、robust、elevate。
- 禁用词（中文）：赋能、一站式、极致、闭环、沉淀、抓手、打通、颗粒度、心智、场景。
- 原则：直接说功能，例如「上传皮肤，离线服也能显示」「装 mod 一次配齐」。

### 视觉去 AI 味

- 避免：万能紫渐变、玻璃拟态、霓虹光晕堆砌、emoji 图标、「图标+标题+一句空话」三列 feature 卡片。
- 做：真实 Minecraft 视觉锚点，包括 skinview3d 实时 3D 预览、真实皮肤纹理、像素方块元素、真实数据和截图；克制动效。

### 排版与密度

真实层级（大标题加副标题加正文），不全居中；密度对齐 Modrinth，别学 CurseForge。

### 空状态与占位

用真实皮肤缩略图和玩家头像，不用通用插画。
