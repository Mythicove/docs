# Mythicove Docs

**English** | [简体中文](./README.zh-CN.md)

Unified documentation repository for the Mythicove ecosystem. Everything cross-repo, or anything that "needs versioning during development", lives here — not scattered across random subdirectories of the product repos.

The docs site is built with **Astro + Starlight** (Markdown as the single source of truth), supporting zh-CN (default) / en, light & dark logos, a categorized sidebar, and full-text search (Pagefind).

## Conventions

| Lives here (`docs`) | Lives in product repos | Lives in `api` | Never committed |
|---|---|---|---|
| Product plans, architecture decision records (ADRs), deploy/ops docs, team standards (the canonical security policy / code of conduct / contributing guide are pages in this site's "Community" section) | Code-bound `README`, `CHANGELOG`, in-code comments; English pointer files (`SECURITY.md` etc.) linking to this site's Community section; `LICENSE.history` in relicensed repos | API contracts (OpenAPI) | One-off drafts, secrets, environment-specific local files |

Language convention: root-level repo documents (`README`, `CHANGELOG`, `LICENSE.history`, etc.) are **English by default**, with Chinese variants suffixed `.zh-CN.md`; each file links to the other at the top and no file mixes two languages. Site content defaults to zh-CN with English under `en/`.

## Layout

```
docs/
├── astro.config.mjs          # Starlight config (logo / i18n / sidebar / brand colors)
├── LICENSE                   # content license (CC BY-SA 4.0)
├── LICENSE-CODE              # site code license (MIT)
├── SECURITY.md etc.          # English pointer files to this site's Community section
├── public/                   # favicon and other static assets
├── src/
│   ├── assets/               # logos (dark/light, rounded)
│   ├── styles/custom.css     # brand blue-purple theme variables
│   └── content/docs/         # documentation content (Markdown / MDX)
│       ├── index.mdx         # zh-CN homepage
│       ├── getting-started/  # introduction, quickstart
│       ├── products/         # Mirror / Hoard / Compass / frontend
│       ├── guides/           # authlib-injector, premium linking
│       ├── architecture/     # ADR-0001..0012
│       ├── deploy/           # Docker Compose, storage tiers, multi-instance
│       ├── community/        # security policy, code of conduct, contributing (canonical)
│       └── en/               # English content (untranslated pages fall back to Chinese)
└── deploy/                   # ready-to-use deploy artifacts (docker-compose / Caddyfile)
```

## Local development

```bash
pnpm install
pnpm dev      # http://localhost:4321
pnpm build    # outputs dist/
```

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages under the custom domain **docs.gov.skin** (DNS CNAME → `mythicove.github.io`).

- `astro.config.mjs` uses `site: "https://docs.gov.skin"` with a root deployment (no `base`); `public/CNAME` persists the domain binding so Actions deploys don't drop it.
- Falling back to a project site (`<org>.github.io/docs/`): re-add `base: '/docs/'`, change `site` back, and update the external links to this site in the other repositories.

## Internationalization

- Default (root) = zh-CN; English lives in `src/content/docs/en/`.
- Untranslated pages automatically fall back to Chinese — no dead links.
- Sidebar group labels are bilingual via `translations` in the `sidebar` config of `astro.config.mjs`.

## License

This repository is dual-licensed by content type:

- **Documentation content** (Markdown / MDX text and images under `src/content/docs/`): [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), see [LICENSE](./LICENSE).
- **Site code** (`astro.config.mjs`, `src/styles/`, components, `public/` assets, build scripts, etc.): [MIT](https://opensource.org/license/mit), see [LICENSE-CODE](./LICENSE-CODE).

Rationale: CC licenses are designed for creative content and explicitly discouraged for software; MIT keeps the code reusable and tool-friendly, while the text stays CC BY-SA to preserve attribution and share-alike requirements. See [ADR-0004](./src/content/docs/architecture/adr-0004-license.md).
