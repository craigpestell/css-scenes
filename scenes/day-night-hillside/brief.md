# Day / Night Hillside (day-night-hillside)

Status: DRAFT, awaiting human approval. Note: `ideas/gallery-inspiration.md` and scenes `ramen-counter` / `liftoff` do not exist in this worktree, so format and budgets follow `scenes/tokyo-subway/brief.md`, `scenes/aurora/meta.json`, `packages/tokens/tokens.json` and `packages/lib/src/` only.

## Concept / Mood / Motion language
- **Concept:** A small terraced hill town in flat, paper-cut vector style. One checkbox swings the sun below the ridge, the moon climbs up the other side, the windows light one by one, and the whole palette crossfades instead of snapping.
- **Mood:** Gentle, cosy, storybook; the held breath between "last light" and "lamps on".
- **Motion language:** Slow, arcing, crossfading, candle-by-candle.
- **Distinct from existing scenes:** aurora is a dark conic-gradient field; tokyo-subway is a symmetrical interior with linear parallax. This is an exterior, warm-lit, stepped-silhouette scene with arc motion, and it is state-driven (toggle) rather than looping.

## Palette & new tokens
Reuse from `tokens.json`: `--c-ink`, `--c-paper`, `--c-accent` (UI chrome: toggle pill, focus ring), `--c-lamp` (#ffe9b0, window glow, fixed), `--t-slow` (1.2s, window fade), `--e-out` / `--e-spring` (orbit settle). New duration `--t-swing` 3.6s (orbit and sky crossfade).

Day/night is a scene *state*, not the OS colour scheme, so the scene palette is two-phase. Proposed token shape: a `phase` group with `day` and `night` values (all `syntax: <color>`, registered with `@property`). `light-dark()` is used only for UI chrome.

| Token | Day | Night | Use |
|---|---|---|---|
| `--c-sky-top` | #5aa9e6 | #0e1230 | upper sky |
| `--c-sky-low` | #ffd9a0 | #3a2a5c | horizon band |
| `--c-glow` | #fff1c9 | #6b5aa8 | horizon haze (low alpha) |
| `--c-far-hill` | #8fb8a0 | #1d2748 | far ridge |
| `--c-mid-hill` | #5f9a7a | #131a36 | mid slope |
| `--c-near-hill` | #3f7a5c | #0b1026 | foreground terrace |
| `--c-wall` | #f2e3c8 | #4a4466 | house walls |
| `--c-roof` | #c4553a | #5a2f3f | terracotta roofs |
| `--c-window` | #5f87a8 | #ffcf6b | panes (dark glass by day, lit by night, plus `--c-lamp` glow) |

Sun (#ffb23e) and moon (#f4f1ff) are fixed single-use colours, not tokens.

Contrast checks at build time: toggle label vs pill >= 4.5:1 in both schemes (pill uses `--c-ink`/`--c-paper` via `light-dark()`); lit window #ffcf6b vs night wall #4a4466 >= 3:1 (about 5:1 expected); night near-hill vs mid-hill is decorative (>= 1.3:1 acceptable); focus ring `--c-accent` vs sky >= 3:1 at both extremes and mid-transition.

## Layers (back -> front)
Target: about 9 structural elements plus 12 window children; 5 animated groups.
1. `.stage` (reuse `lib/stage`): holds the state; contains `<input type="checkbox" id="night">` (visually hidden, still focusable) and its `<label>`. Sky = two stacked gradients using the registered colours.
2. `.stars`: one element, several small `radial-gradient` dots in `background`; opacity 0 -> 1 at night. Animated (opacity).
3. `.orbit`: pivot box centred on the horizon with children `.sun` and `.moon` (gradient circles; crescent via an offset second gradient or `mask`). Pivot `rotate` swings the sun down and the moon up from one pivot. Animated (individual `rotate`).
4. `.far`: far ridge, `clip-path: polygon()` or inline SVG path. Static shape, colour transitions.
5. `.mid`: mid slope with 2 cypress shapes in the same path. Same technique.
6. `.town`: one inline SVG (about 6 houses on terraces, a bell tower); the 12 windows are siblings in one `<g>` so `sibling-index()` works. Walls/roofs transition colour; windows stagger-light.
7. `.near`: foreground terrace with a path, 1 tree, 1 lamp post; silhouette only.
8. `.haze`: horizon glow, one `radial-gradient` using `--c-glow` and `--glow-angle`; peaks mid-transition (golden hour).
9. `label.toggle` (UI chrome): small pill bottom-centre, sun/moon glyph in CSS; `light-dark()` colours; the only interactive element.

Justification: sky, stars, orbit, haze are separate because they animate different properties; hills share one technique and only change colour.

## Motion plan
Trigger for everything: the checkbox `:checked` state flipping custom properties on `.stage` via `:has()`. All motion is CSS `transition`; no keyframes (except possibly the haze peak), no JS.

| Element | Property | Trigger | Duration | Compositor-safe? |
|---|---|---|---|---|
| `.orbit` pivot | `rotate` 0deg -> 180deg | checkbox | `--t-swing` 3.6s, `--e-out` | yes |
| `.stars` | `opacity` (delay 1.4s so they appear after the sky darkens) | checkbox | 2s | yes |
| `.haze` | `opacity` 0 -> 0.9 -> 0 (keyframe or mid-stop) | checkbox | `--t-swing` | yes |
| Windows (12) | `opacity` of a lit `::after` glow overlay (not colour, so it stays compositor-safe); `transition-delay: calc(sibling-index() * 140ms + 1.6s)` going to night, `calc((sibling-count() - sibling-index()) * 60ms)` going to day | checkbox | `--t-slow` 1.2s | yes |
| Sky, hills, walls, roofs | registered `<color>` custom properties (`--c-sky-top`, etc.) | checkbox | `--t-swing` | **paint-ok**: typed colour transitions repaint their consumers each frame. About 8 consumers, flat fills, no blur; only the sky is large. Verify in Performance panel |
| Haze angle | registered `<angle>` `--glow-angle` 0deg -> 180deg (glow follows the sun) | checkbox | `--t-swing` | **paint-ok**: one small radial gradient; drop to opacity-only if profiling shows jank |
| Toggle thumb | `translate` | checkbox | `--t-base` 400ms | yes |

Notes: transitions between two stable endpoints reverse smoothly mid-flight (the browser interpolates from the current value). No `filter: blur`; glows are gradient falloff.

## Techniques (Baseline status + fallback)
Searched with `modern-web-guidance` (`search` then `retrieve`):
- **`:has()` driving scene state** (guide `child-state-based-styling`): Widely available (Baseline 2023-12-19; Chrome 105, Firefox 121, Safari 15.4). Define day values on `.stage`, override in `.stage:has(#night:checked)`. Scope to `.stage`, never `body`. The toggle is critical, so the guide mandates a fallback behind `@supports not selector(:has(*))`. We use the pure-CSS sibling-combinator version (put the checkbox before the scene layers as a preceding sibling, `#night:checked ~ .layer`) instead of the guide's JS shim, to stay no-JS. Cost about 0.4 KB.
- **`@property` registered custom properties** (search returned only related use cases, no dedicated guide): Newly available (Baseline 2024-07-09; Chrome 85, Safari 16.4, Firefox 128). Why: an unregistered `--c-sky-top` flips instantly; registered `<color>`/`<angle>` values interpolate, so one state switch crossfades the whole scene. Fallback: without support the palette snaps between states, while `rotate` and window opacity still animate (they are real properties). Acceptable graceful degradation.
- **`sibling-index()` / `sibling-count()` stagger** (guide `dynamic-sibling-animations`): Newly available (Baseline 2026-08-18; Chrome 138, Safari 26.2, Firefox 154). Guard with `@supports (animation-delay: calc(sibling-index() * 0.1s))`. Fallback: inline `style="--i:n"` on the 12 windows (about 100 bytes) with `transition-delay: calc(var(--i) * 140ms)`. Same recipe as tokyo-subway straps, here driving transitions rather than animations.
- **`light-dark()` + `color-scheme: light dark`** (guides `dark-mode`, `component-specific-light-dark-theme`): `color-scheme` Widely available (2022-02-03); `light-dark()` Newly available (2024-05-13; Chrome 123, Firefox 120, Safari 17.5). UI chrome only (pill, label, focus ring, page background). Fallback: `@supports not (color: light-dark(white, black))` with a `prefers-color-scheme` media query.
- **`prefers-reduced-motion`**: Widely available; required by the stagger guide.
- **`clip-path: polygon()` / inline SVG hills**: Widely available; no fallback.
- **Considered and rejected:** scroll-driven animations (no scroll on a fixed stage; limited availability); view transitions (double snapshot of the full window, heavier and less teachable than typed properties); `color-mix()` for derived shades (Widely available but optional; could cut about 8 tokens, decide at build).

## Reduced-motion frame
`prefers-reduced-motion: reduce`: all transition durations and delays set to 0. The toggle still works and swaps states instantly (a legitimate state change, not decoration). Unchecked shows a fully composed day: sun high, soft haze, windows dark, stars off. Checked shows a fully composed night: moon high, stars on, all 12 windows lit at once (no stagger). Never blank in either state.

## Exceptions
None. No JS (both fallbacks are CSS or inline attributes), system fonts only (the only text is the toggle label, e.g. "Night"), CSS plus inline SVG.

## Snippets reused / candidates to extract
- Reused: `lib/stage` (`.stage`, `contain: strict`, `@layer` order); reduced-motion pattern from `lib/aurora`.
- Candidates: `@snippet state-toggle` (checkbox with `:has()` and sibling-combinator dual path, custom-property switch, no JS); `@snippet typed-tokens` (emit `@property` blocks from `tokens.json` `syntax` fields, which already carry `<color>`/`<angle>`); `@snippet stagger-delay` (shared with tokyo-subway: `sibling-index()` with `--i` fallback).
- Token build note: `tokens.json` models light/dark only; a day/night group needs a small schema extension (Q1).

## Budget & targets
- Budget: 14 KB brotli (default) for `index.html` + CSS; exceptions 0 KB. Expected about 6-8 KB (town SVG 2-3 KB, `@property` blocks about 0.6 KB, fallbacks about 0.8 KB).
- Targets: Lighthouse perf >= 95, CLS 0, dropped frames < 2% during the 3.6s transition, at most 5 promoted layers, no `filter: blur`.
- A11y: real `<input type="checkbox">` with visible `<label>`, keyboard focus ring (>= 3:1), touch target >= 44px, `aria-hidden` on decorative layers, no flashing, transition under 5s.

## Open questions for the human
1. Tokens: extend `tokens.json` with a day/night `phase` group (drafted), or keep these scene-local in `scene.css`?
2. Initial state: always day (drafted), or start at night when `prefers-color-scheme: dark`?
3. Town size: about 6 houses and a bell tower (drafted), or denser 10+ houses (more bytes and windows)?
4. Window lighting order: DOM order, bottom-to-top (drafted), or a scattered order via authored `--i`?
5. Extras (shooting star, chimney smoke, clouds)? Draft has none, to keep the scene state-driven and layer count low; each would be an infinite animation needing review.
6. Timing: 3.6s swing (drafted), or snappier (2s) or slower?
7. Is graceful snap-without-`@property` acceptable, or is a stricter fallback required?
8. `ideas/gallery-inspiration.md`, `ramen-counter` and `liftoff` are absent from this worktree. Is there another branch whose conventions I should check before approval?
