---
title: Security Policy
description: How to report vulnerabilities and which versions receive security support
---

This page is the canonical security policy for all Mythicove repositories; `SECURITY.md` files in individual repositories are pointers to this page.

## Supported Versions

Only the latest release of each repository receives security support. Older versions (including the AGPL-era v0.1.x to v0.3.x tags) no longer get dedicated security patches; please upgrade.

## Reporting a Vulnerability

**Do not disclose security vulnerabilities in public issues.** Use "Private vulnerability reporting" under the Security tab of the affected repository to submit a private security advisory, or email the maintainer at <team@tsinbei.com>. We will triage confirmed reports and publish a fix release with an advisory.

## Dependency Baseline

- **Go**: CI enforces `govulncheck`; dependency upgrades are automated by Dependabot.
- **Frontend (Node/TS)**: CI runs `npm/pnpm audit`.
- **Known items under watch** (as of 2026-10-22):
  - `undici` (Node built-in fetch dependency) must be ≥ 6.29.1 / 7.30.1 / 8.12.2; track upstream Node patches.
  - `klauspost/compress` (if pulled in transitively) must be ≥ v1.18.7.

Repository-specific baselines (e.g. the zero-third-party-dependency rule in `shared`) are noted in that repository's `SECURITY.md` pointer file.

## Out of Scope

The stack is a Go backend + TypeScript frontend and contains no PHP. PHP2Shell-style (PHP core RCE) findings do not apply.
