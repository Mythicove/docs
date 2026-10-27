---
title: Mythic Compass
description: The Mythicove launcher (Tauri 2 + React)
---

Mythic Compass is the Mythicove ecosystem launcher (Tauri 2 + React). It takes players from login to in-game.

- Yggdrasil login with the player name and that player's launcher password (ADR-0012): the site password is never used on protocol endpoints, so the site can drop password login while launchers keep working. Independent passwords are created on the site account page; a player may have several, and revocation takes effect immediately.
- 3D skin preview via skinview3d.
- Mod and modpack browsing from Hoard. Download and install land with the development plan.

The Rust modules for native launching (version parsing, downloads, Java detection, argument construction, process management, instances) are implemented and tested; wiring them up as Tauri commands and UI is in progress. Prism delegation and .mrpack download were removed in P0. See the [launcher plan](../../plans/compass-launcher.md) (Chinese) for phases and acceptance criteria.
