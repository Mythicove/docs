---
title: Licensing
description: The licensing philosophy of the Mythicove ecosystem
---

This page is the canonical statement of the Mythicove licensing philosophy. The selection rationale and revision history live in [ADR-0004](/architecture/adr-0004-license/) (Chinese); the binding terms are the LICENSE file in each repository. Nothing here is legal advice.

## License matrix

| Asset | License | Notes |
|---|---|---|
| Products (mythic-mirror, mythic-hoard, web, compass, shared) | Elastic License 2.0 (ELv2) | Source-available, not OSI open source |
| Contracts (api) | MIT | Permissive, so third-party launchers and tools can integrate |
| Documentation content (text and images in docs) | CC BY-SA 4.0 | Standard documentation license |
| Documentation site code (Astro config, styles, components in docs) | MIT | CC licenses are discouraged for software |

## Why the products are neither MIT nor AGPL

The target users are server owners and community operators who self-host; every such use is fully free of charge. Source-available exists to prevent exactly one thing: a third party repackaging the software as a paid hosting service for profit (cloud free-riding or a competing site) without giving anything back. Modrinth's 2024 move from AGPL to source-available is the cautionary tale.

- Permissive licenses such as MIT offer no protection against this scenario.
- AGPL does, but its copyleft reaches every ecosystem integrator (launchers, plugins, corporate self-hosting) and raises the barrier to adoption; the intent here is anti-hosting-profiteering, not forcing derivatives open.
- ELv2 hits the target precisely: it restricts offering the software as a managed service, and nothing else.

## What ELv2 allows and restricts

ELv2 has three restrictions; everything not listed is allowed, including commercial use.

Allowed (common scenarios):

- Self-hosting for your own server, community or players, for profit or not
- Modifying, extending and private customization
- Internal corporate use
- Redistribution with license and copyright notices intact

Restricted:

- Offering the software itself to third parties as a hosted / managed service (for example, running a paid "skin-site SaaS" for the public)
- Circumventing or removing license key functionality
- Removing or obscuring copyright and licensing notices

## Intended-use FAQ

The licensor's intent on common edge cases:

| Scenario | Allowed | Notes |
|---|---|---|
| Non-profit self-hosting for a community | Yes | ELv2 has no non-commercial clause |
| Self-hosting and selling skins, capes, donations, server ranks or other perks | Yes | The software is your infrastructure, not the service being sold — same as a server owner selling ranks |
| Bundling with server panels or modpacks | Yes | Keep the license and notices |
| Internal deployment within a company or organization | Yes | Counts as own use |
| Public hosting where third parties pay to use the software itself | No | The one scenario ELv2 restricts |

## Honest labeling

ELv2 is source-available and does not meet the OSI open source definition. External descriptions of the product repositories say "source-available", not "open source". The api repository (MIT) and documentation content (CC BY-SA 4.0) are permissively licensed and may be described as open.

## Relicense history

The product repositories were originally released under AGPL-3.0 and relicensed to ELv2 on 2026-10-26. The relicense applies only to versions released after that date; earlier tags remain under AGPL-3.0 (the project has a single author and no external contributors, so relicensing is unilateral). Details live in each repository's LICENSE.history.
