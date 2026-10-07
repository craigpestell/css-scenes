---
name: project-architecture
description: Explains the css-scenes repository architecture, build pipeline, file contracts, and change boundaries. Use when onboarding, tracing generated output, deciding where a change belongs, or modifying cross-cutting scene, site, token, library, build, source-viewer, stats, or deployment behavior.
---

# Project architecture

## Quick start

This is a pnpm workspace and framework-free static-site generator. The single composition root is
`packages/build/src/cli.js`; run `pnpm build` after architectural changes and `pnpm dev` for the
rebuilding server at `http://localhost:4321/`.

Trace behavior from authored input in `scenes/`, `sites/`, or `packages/`, through
`packages/build/src/cli.js`, to ignored `dist/`, then deployment settings in `vercel.json`.
Do not edit `dist/`; every build regenerates it.

## Data flow

```text
packages/tokens/tokens.json -> packages/build/src/tokens.js -> generated token CSS
packages/lib/src/*.css ----\
scenes/<slug>/* ------------> packages/build/src/cli.js -> dist/scenes/<slug>/
sites/source/* -------------/                         \-> index.html + source.html
sites/stats/stats.js -> embedded per-scene JSON
sites/stats/panel.js -> dist/stats.js shared runtime panel
sites/index/* + all scene metadata -> dist/index.html
```

Lightning CSS inlines tokens and `@import "lib/<name>"`, lowers to Chrome 120+, Safari 17.4+,
and Firefox 128+, and minifies shipping CSS. Each scene page is measured as Brotli-compressed
HTML + CSS + optional scene JS against a 14 KiB budget plus `meta.exceptions.extraBytes`.

## Ownership map

- `scenes/<slug>/`: independently authored scene. Required: `index.html`, `scene.css`,
  `meta.json`. Optional: `scene.js`, `brief.md`, `writeup.md`.
- `packages/build/src/cli.js`: discovery, CSS bundling, page assembly, navigation, source pages,
  size enforcement, output writes, and the dev server.
- `packages/build/src/tokens.js`: converts token JSON into registered properties and root values.
- `packages/tokens/tokens.json`: shared colors, durations, easings, and registered angles.
- `packages/lib/src/`: reusable CSS snippets resolved only through `lib/<name>` imports.
- `sites/index/`: gallery shell, card renderer, and gallery styling.
- `sites/source/`: generated source viewer and syntax highlighting.
- `sites/stats/stats.js`: build-time stats and feature-test mapping.
- `sites/stats/panel.js`: browser-only performance, size, compatibility, and environment panel.
- `.claude/`: scene design/build/review/write-up workflow; `/new-scene` is the
  human-approval-gated orchestrator.
- `vercel.json`: static deployment of `dist/`; no framework runtime or serverless functions.

## File contracts

### Scene HTML

- Must contain `<!--css-->`; the build replaces it with bundled CSS and generated scene chrome.
- The `<main class="stage" aria-label="...">` label becomes the gallery description.
- Keep standard document metadata. Injected `#preview` hides chrome inside gallery iframes.

### Scene CSS

- Start with `@import "lib/stage";`; shared imports must use exact `lib/<name>` syntax.
- Imports are build-time directives, not browser imports.
- Respect layer order `reset, tokens, base, scene, utilities`, shared tokens, fallbacks, and
  reduced-motion behavior.

### Scene metadata

- `title` labels gallery, navigation, source, and stats surfaces.
- `tags`, `techniques`, and `features` render on gallery cards.
- `features[].name` is pattern-matched in `sites/stats/stats.js` for live support checks.
- `inspiration` renders credits; relative URLs are re-rooted from the scene directory.
- `exceptions.extraBytes` raises only that scene's size budget.

## Change workflows

- **One scene:** edit only its directory; add shared tokens only when genuinely reusable.
- **Reusable visual primitive:** add `packages/lib/src/<name>.css`, then import it from scenes.
- **Global design value:** update token JSON and, if introducing a new token group, its emitter.
- **Gallery presentation:** change `sites/index/`; card data still originates in scene HTML/meta.
- **Generated scene/source/stats markup:** change its renderer under `sites/`, not generated files.
- **Build semantics or budget:** change the CLI and check every generated scene.
- **New metadata field:** wire ingestion plus every intended renderer; metadata has no schema layer.

## Validation

1. Run `pnpm build`.
2. Require exit code 0 and every row in the size table to remain within budget.
3. For UI changes, run `pnpm dev` and inspect gallery, scene, source dialog/page, and stats panel.
4. Check light/dark, mobile/desktop, reduced motion, and feature fallback when relevant.
5. Confirm `git status` contains authored files only, never `dist/`, `.env.local`, or `.vercel/`.

## Common traps

- There are no package-level build scripts, test runner, linter, or metadata schema today.
- The dev server rebuilds on every request; concurrent requests share one pending build.
- Scene ordering from directory discovery also determines gallery and previous/next navigation.
- Stats data and the shared stats script are appended after measurement, so they do not consume
  scene budget.
- The token file's `phase` group is documented as not emitted; its scene-local copy must stay
  synchronized until an emitter is added.
