---
name: scene-implement
description: Implement an approved scene brief as index.html + scene.css + meta.json, using library snippets, and iterate lint/build/budget checks until green. Use when a brief.md is approved and the scene needs building.
---

# Scene implement

Inputs: approved `scenes/<slug>/brief.md`. Reference scene: `scenes/aurora/`.

## Steps
1. **Scaffold** `scenes/<slug>/` by copying `scenes/aurora/` (`index.html` with the `<!--css-->` placeholder, `scene.css`, `meta.json`). There is no `scenes new` command yet.
2. **Guidance first** — before writing CSS run `npx -y modern-web-guidance@latest search "<what you need>"` then `retrieve <id>` for each feature in the brief; follow its fallback rules for non-Baseline features.
3. **Compose** `scene.css` starting with `@import "lib/stage";` plus other `lib/<name>` snippets. Only `lib/<name>` imports are resolved by the build; everything else is inline in `scene.css`.
4. **Rules**
   - Put scene rules in `@layer scene`; layer order is `reset, tokens, base, scene, utilities`.
   - Use tokens (`--c-*`, `--t-*`, `--ease-*`, `--a-*`) instead of literals; new tokens go in `packages/tokens/tokens.json`, not the scene.
   - Animate compositor props (`transform`, `opacity`, `filter`, individual transforms). Anything else needs a `/* paint-ok: reason */` comment.
   - No `will-change` unless measured to help. Keep layer count low; `contain: strict` is already on `.stage`.
   - Gate non-Baseline features with `@supports`; fallback must still look intentional.
   - Always include `@media (prefers-reduced-motion: reduce)` giving a composed static frame.
   - Semantics: `lang`, `<title>`, an `aria-label` on the stage, `<meta viewport/color-scheme>`, decorative layers `aria-hidden`.
   - Exceptions (JS, fonts, raster images) only if the brief declares them; mirror them in `meta.json` `exceptions` including `extraBytes`.
5. **meta.json** — title, techniques[], features[] (with Baseline status), exceptions.
6. **Loop**: `pnpm build` → fix size/budget failures → view in the browser pane at desktop and mobile widths, with reduced-motion and with the `@supports` feature disabled. Run lint and `pnpm measure` once those exist.
7. Note reusable patterns for `snippet-extract`; don't extract during implementation.

Done when: build passes budget, visual matches the brief in both color schemes, fallback and reduced-motion frames verified.
