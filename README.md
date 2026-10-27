# Mythicove Docs

**English** | [简体中文](./README.zh-CN.md)

The documentation repository for the Mythicove ecosystem. Cross-repo documents and anything that must be versioned with the code live here.

The site is built with Astro and Starlight, with Markdown as the only content source. It ships in zh-CN (default) and en, with a categorized sidebar and full-text search (Pagefind).

## Conventions

| Lives here (docs) | Lives in product repos | Lives in api | Never committed |
|---|---|---|---|
| Product plans, architecture decision records (ADRs), deploy and ops docs, team standards. The canonical security policy, code of conduct and contributing guide are pages in the site's Community section | Code-bound README, CHANGELOG and code comments; English pointer files to the Community section (SECURITY.md and friends); LICENSE.history in relicensed repos | API contracts (OpenAPI) | One-off drafts, secrets, environment-specific local files |

Language convention: root-level repo documents (README, CHANGELOG, LICENSE.history and friends) are English by default, with Chinese variants suffixed .zh-CN.md. The two files link to each other at the top, and no file mixes two languages. Site content defaults to zh-CN; English lives under en/.

## Layout

```
docs/
├── astro.config.mjs          # Starlight config (logo, i18n, sidebar, brand colors)
├── LICENSE                   # content license (CC BY-SA 4.0)
├── LICENSE-CODE              # site code license (MIT)
├── SECURITY.md etc.          # English pointer files to the site's Community section
├── public/                   # favicon and other static assets
├── src/
│   ├── assets/               # logos (dark and light, rounded)
│   ├── styles/custom.css     # brand blue-violet theme variables
│   └── content/docs/         # documentation content (Markdown / MDX)
│       ├── index.mdx         # zh-CN homepage
│       ├── getting-started/  # introduction, quickstart
│       ├── products/         # Mirror / Hoard / Compass / frontend
│       ├── guides/           # authlib-injector, premium linking
│       ├── architecture/     # ADR-0001 to ADR-0012
│       ├── deploy/           # Docker Compose, storage tiers, multi-instance
│       ├── community/        # security policy, code of conduct, contributing (canonical)
│       └── en/               # English content (untranslated pages fall back to Chinese)
└── deploy/                   # ready-to-use deploy artifacts (docker-compose, Caddyfile)
```

## Local development

```bash
pnpm install
pnpm dev      # http://localhost:4321
pnpm build    # outputs dist/
```

## Deployment

GitHub Actions (.github/workflows/deploy.yml) builds and deploys to GitHub Pages under the custom domain docs.gov.skin, with a DNS CNAME to mythicove.github.io.

astro.config.mjs sets site to https://docs.gov.skin and deploys at the root path, with no base. public/CNAME keeps the domain binding across Actions deploys. Falling back to a project site (<org>.github.io/docs/) means re-adding base: '/docs', changing site back, and updating the links to this site in the other repositories.

## Internationalization

- The default locale is zh-CN; English content lives in src/content/docs/en/.
- Pages without an English version return 404, so new pages ship with an en stub.
- Sidebar group labels get their English translations from the sidebar translations entry in astro.config.mjs.

## License

The repository is dual-licensed by content type:

- Documentation content (text and images under src/content/docs/) is [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), see [LICENSE](./LICENSE).
- Site code (astro.config.mjs, src/styles/, components, public/ assets, build scripts) is [MIT](https://opensource.org/license/mit), see [LICENSE-CODE](./LICENSE-CODE).

CC licenses target creative work and are a poor fit for software, so the site code carries its own MIT license. The text stays CC BY-SA to keep attribution and share-alike. See [ADR-0004](./src/content/docs/architecture/adr-0004-license.md).
