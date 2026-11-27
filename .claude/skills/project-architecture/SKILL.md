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
scenes/<slug>/* ------------> packages/build/src/cli.js -> dist/scenes/<slug>/ (writeup.md -> source.html)
sites/source/* -------------/                         \-> index.html + source.html
sites/stats/stats.js -> embedded per-scene JSON
sites/stats/panel.js -> dist/stats.js shared runtime panel
sites/shared/site.css -> imported by index.css, techniques.css, source.css and 404.css (never by scenes)
sites/index/* + all scene metadata -> dist/index.html (player, reel, poster bento, techniques grid)
sites/techniques/* + scene meta features + scene.css -> dist/techniques/index.html + dist/techniques/<key>/index.html
scene list -> dist/scenes.json (read by the scene switcher in dist/stats.js)
sites/404/* + scene list -> dist/404.html (Vercel serves it for unknown paths)
sites/shared/head.js -> favicon + link-preview tags on every page; dist/favicon.svg
sites/og/*.jpg + sites/posters/*.jpg (made by `pnpm og`) -> dist/og/ link previews, dist/posters/ gallery stills
```

Lightning CSS inlines tokens, `@import "lib/<name>"` and (site pages only) `@import "site/<name>"`, lowers to Chrome 120+, Safari 17.4+,
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
- `sites/shared/`: the house palette and parts shared by every site page (site bar, buttons, segmented filters,
  Baseline status dots, the techniques grid, display headings, wordmark), and
  `head.js`: the site icon and Open Graph/Twitter tags (`headTags`), with `SITE` as the canonical origin.
- `sites/404/`: the not-found page; the build fills in a list of every scene.
- `sites/og/` and `sites/posters/`: committed stills. `pnpm og [slug…]` (`packages/build/src/og.js`) renders them
  from `dist/` with Playwright (not a project dependency): per scene a 960x600 poster, a 480x300 `-sm` thumbnail and a
  1200x630 link preview, all from one frame chosen by pausing every animation at `meta.poster.time` seconds (default
  4; `meta.poster.scheme` picks light or dark), plus `og/index.jpg` when run for everything. Rerun it after a scene's
  look changes or a scene lands. A page with no image simply gets no `og:image`.
- `sites/index/`: `index.html` (the home's words and layout; a comment names the first scene, `hero:`, and the
  bento's opening tiles, `bento:`), `home.js` (renderers and the shared site bar), `home.client.js` (inlined: the
  reel, auto-advance, hover-to-play posters), `index.css`, and `cards.js` (scene modes, descriptions, the 404 list and
  the scene toolbar, `sceneChrome`).
- `sites/techniques/`: `techniques.js` is the registry of CSS features (key, name, summary, `match` against meta
  feature names, `css` for the lines to quote, optional `CSS.supports()` test) plus the excerpt finder; `pages.js`
  renders the index and each technique page. A scene appears on a technique page when one of its `features` names
  matches; add a registry entry for a new feature.
- `sites/source/`: the generated How it's made page (what the scene is and its write-up beside the code), syntax highlighting, and a small
  Markdown renderer (`markdown.js`) for `writeup.md`. It supports only what write-ups use; extend it when one needs more.
- `sites/stats/stats.js`: build-time stats and feature-test mapping.
- `sites/stats/panel.js`: browser-only. `<scene-controls>`, a column on the window's right edge (a bottom sheet on
  phones) with two tabs: Controls, with playback (speed, loop, pause, restart, applied to `.stage` animations through
  the Web Animations API) and the scene settings (colour scheme, `params`), and Stats (performance, size,
  compatibility, environment). It wires the toolbar's Controls and fps buttons, which `sceneChrome` renders hidden up
  front. Scenes play on the clock, never on scroll. It also defines `<scene-switcher>`, the popover of every scene
  opened from the toolbar's `08 / 11` button or G, anchored under it with CSS anchor positioning where supported.
- Chrome never covers a scene: `sceneChrome` insets `.stage` by `--chrome-top` (the toolbar), `--chrome-right` (the
  Controls column) and `--chrome-bottom` (the phone sheet). Scenes should size from the stage (%), not the viewport,
  where they can. Only the How it's made dialog and the scene switcher float, and it stops at the Controls column too.
- `.claude/`: scene design/build/review/write-up workflow; `/new-scene` is the
  human-approval-gated orchestrator.
- `vercel.json`: static deployment of `dist/`; no framework runtime or serverless functions.

## File contracts

### Scene HTML

- Must contain `<!--css-->`; the build replaces it with bundled CSS and generated scene chrome.
- The `<main class="stage" aria-label="...">` label becomes the gallery description.
- Keep standard document metadata. The build injects the icon and link-preview tags. `#preview` (the live hero)
  hides the scene dock inside gallery iframes; `#card` (grid cards) also hides on-stage controls such as labels.

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
- `params` declares the stats panel's scene controls (`range`, `count`, `color`, `toggle`, `file`); shapes are documented
  at the top of the Controls block in `sites/stats/panel.js`. `count` sets `--i`/`--n` inline on each element.

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
3. For UI changes, run `pnpm dev` and inspect gallery, scene, the How it's made dialog/page, the scene switcher, the technique pages, and the Controls and Stats tabs.
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
