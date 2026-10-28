---
title: Contributing
description: How to contribute across the Mythicove repositories
---

This page is the canonical contributing guide for all Mythicove repositories. The CONTRIBUTING.md file in each repository points here; repo-specific build and test commands live in that repository's README.

## Repository map

| Repository | Contents | License |
|---|---|---|
| mythic-mirror, mythic-hoard | Go backend products | Elastic License 2.0 |
| web, mythic-compass | Frontend products (Next.js, Vite) | Elastic License 2.0 |
| shared | Shared Go module (capability interfaces and domain types) | Elastic License 2.0 |
| api | OpenAPI contracts and generated artifacts | MIT |
| docs | Documentation site (Astro + Starlight), ADRs, deploy artifacts | Content CC BY-SA 4.0, site code MIT |

## How to contribute

1. Open an issue in the relevant repository for bugs and feature requests; cross-product topics belong in docs. Report security vulnerabilities through the private flow in the [security policy](/en/community/security/), never in a public issue.
2. Small changes can go straight into a pull request. For changes that touch architecture, data models or cross-repo contracts, open an issue or add an ADR to docs first.
3. Taking part means you agree to the [code of conduct](/en/community/code-of-conduct/).

## Commit conventions

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/), with types such as feat, fix, docs, chore and refactor. The web repository enforces this with commitlint and lint-staged.
- One logical change per commit. Keep chores such as relicensing and dependency bumps separate from features.

## Code style

- Go (shared, mythic-mirror, mythic-hoard): run gofmt; write all SQL through sqlc instead of hand-written scan code; CI runs govulncheck.
- TypeScript frontend (web, compass): ESLint, Prettier and Stylelint; components follow the existing in-repo patterns (shadcn/ui).
- API contracts (api): edit the OpenAPI spec first and regenerate; never hand-edit generated artifacts.

## Documentation and language conventions

- Root-level repo documents (README, CHANGELOG, LICENSE.history and friends) are English by default, with Chinese variants suffixed .zh-CN.md. The two files link to each other at the top, and no file mixes two languages.
- Site content defaults to zh-CN (the src/content/docs/ root), with English under src/content/docs/en/. Ship new pages with an en stub: a page without an English version returns 404.
- The canonical security policy, code of conduct and contributing guide are the pages in this Community section. Individual repositories only keep English pointer files.

## Architecture decisions

A decision that spans repositories or has long-term impact needs an ADR under docs/src/content/docs/architecture/, with the next sequential number, covering context, decision, rationale and consequences. When you overturn an old decision, revise the original ADR and add a dated revision note; see ADR-0004.

## Licensing and contribution ownership

Submitting a contribution to a repository means it is released under that repository's current license; see the table above and each repo's LICENSE. The product repositories are source-available (ELv2) rather than OSI-approved open source, so word external descriptions accordingly. The licensing philosophy, ELv2 boundaries and an intended-use FAQ live in the [licensing policy](/en/community/licensing/); relicense history lives in each repo's LICENSE.history.
