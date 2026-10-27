---
title: Contributing
description: How to contribute across the Mythicove repositories
---

This page is the canonical contributing guide for all Mythicove repositories; `CONTRIBUTING.md` files in individual repositories are pointers to this page. Repo-specific build/test commands live in each repository's `README`.

## Repository Map

| Repository | Contents | License |
|---|---|---|
| `mythic-mirror` / `mythic-hoard` | Go backend products | Elastic License 2.0 |
| `web` / `compass` | Frontend products (Next.js / Vite) | Elastic License 2.0 |
| `shared` | Shared Go module (capability interfaces + domain types) | Elastic License 2.0 |
| `api` | OpenAPI contracts and generated artifacts | MIT |
| `docs` | Documentation site (Astro + Starlight), ADRs, deploy artifacts | Content CC BY-SA 4.0 / site code MIT |

## How to Contribute

1. **Bugs & feature requests**: open an issue in the relevant repository; cross-product topics belong in `docs`. For security vulnerabilities use the private reporting flow in the [security policy](./security.md) — never a public issue.
2. **Pull requests**: small changes can go straight to a PR; changes touching architecture, data models, or cross-repo contracts should start with an issue or an ADR in `docs`.
3. **Participation = agreement**: all interactions follow the [Code of Conduct](./code-of-conduct.md).

## Commit Conventions

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:` / `fix:` / `docs:` / `chore:` / `refactor:` etc. (enforced by commitlint + lint-staged in `web`).
- One logical change per commit; keep chores (relicensing, dependency bumps) separate from features.

## Code Style

- **Go** (`shared` / `mythic-mirror` / `mythic-hoard`): `gofmt`; all SQL goes through `sqlc` — no hand-written scan code; CI runs `govulncheck`.
- **TypeScript/frontend** (`web` / `compass`): ESLint + Prettier + Stylelint; components follow existing in-repo patterns (shadcn/ui).
- **API contracts** (`api`): edit the OpenAPI spec first, then regenerate; never hand-edit generated artifacts.

## Documentation & Language Conventions

- Root-level repo documents (`README`, `CHANGELOG`, `LICENSE.history`, etc.) are **English by default** (e.g. `README.md`), with Chinese variants suffixed `.zh-CN.md` (e.g. `README.zh-CN.md`); each file links to the other at the top, and no file mixes two languages.
- Docs-site content defaults to zh-CN (`src/content/docs/` root) with English under `src/content/docs/en/`; new pages should ideally ship in both languages — untranslated pages fall back to Chinese.
- The canonical security policy / code of conduct / contributing guide are the pages in this "Community" section; individual repositories only keep English pointer files linking here.

## Architecture Decisions

Decisions that span repositories or have long-term impact require an ADR under `docs/src/content/docs/architecture/` (next sequential number) covering context, decision, rationale, and consequences; when overturning an old decision, revise the original ADR with a dated revision note (see ADR-0004).

## Licensing & Contribution Ownership

By submitting a contribution to any repository, you agree that it is released under that repository's current license (see table above and each repo's LICENSE). Product repositories are source-available (ELv2), not OSI-approved open source — please word external descriptions accordingly; relicense history lives in each repo's `LICENSE.history`.
