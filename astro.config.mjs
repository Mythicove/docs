import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://starlight.astro.build/
export default defineConfig({
  site: "https://docs.gov.skin",
  // GitHub Pages 自定义域名（public/CNAME），根路径部署，无需 base
  integrations: [
    starlight({
      title: "Mythicove",
      description: "Mythicove 生态文档 —— 皮肤站、Mod 托管与启动器",
      logo: {
        // light 主题（浅色背景）用深色 logo，dark 主题（深色背景）用浅色 logo
        light: "./src/assets/logo-dark.png",
        dark: "./src/assets/logo-light.png",
        alt: "Mythicove",
        replacesTitle: true,
      },
      favicon: "/favicon.png",
      defaultLocale: "root",
      locales: {
        root: { label: "简体中文", lang: "zh-CN" },
        en: { label: "English", lang: "en" },
      },
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/Mythicove" },
      ],
      customCss: ["./src/styles/custom.css"],
      sidebar: [
        {
          label: "概览",
          translations: { en: "Overview" },
          items: [
            { slug: "getting-started/introduction", label: "简介", translations: { en: "Introduction" } },
            { slug: "getting-started/quickstart", label: "快速开始", translations: { en: "Quickstart" } },
          ],
        },
        {
          label: "产品",
          translations: { en: "Products" },
          items: [{ autogenerate: { directory: "products" } }],
        },
        {
          label: "指南",
          translations: { en: "Guides" },
          items: [{ autogenerate: { directory: "guides" } }],
        },
        {
          label: "架构决策",
          translations: { en: "Architecture" },
          items: [{ autogenerate: { directory: "architecture" } }],
        },
        {
          label: "部署",
          translations: { en: "Deploy" },
          items: [{ autogenerate: { directory: "deploy" } }],
        },
        {
          label: "社区",
          translations: { en: "Community" },
          items: [{ autogenerate: { directory: "community" } }],
        },
      ],
    }),
  ],
});
