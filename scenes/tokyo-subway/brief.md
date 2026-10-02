# Tokyo Subway (tokyo-subway)

Status: APPROVED by the user in chat on 2026-10-02, with the drafted defaults for Q1-Q7 (inside the car, no commuters, Ginza orange, periodic station stop, OS-rendered kanji sign, bright light scheme, path css-scenes/scenes/tokyo-subway/).

## Concept / Mood / Motion language
- **Concept:** Standing inside a late-night Tokyo metro car, looking across at the windows while tunnel lights stream past and, every so often, the train glides into a lit station.
- **Mood:** Quiet, hypnotic, a little lonely; the clean, orderly calm of a 23:40 Ginza-line ride.
- **Motion language:** Steady, rhythmic, swaying, layered parallax.

## Palette & new tokens
Reuse (from `packages/tokens/tokens.json`):
- `--c-ink`, `--c-paper`: car interior wall and text. `--c-accent` (violet): station-sign glow and window reflection tint, so the scene sits with the gallery.
- `--t-drift` (24s): one full station cycle (rush, brake, dwell, depart).
- `--e-out` easing: station deceleration.

New tokens (all `light-dark(light, dark)`; light scheme = brightly lit car, dark = dimmed night-service lighting). The tunnel seen through the windows is dark in both schemes, so those values are fixed.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--c-car-wall` | #e9e6dc | #1a1826 | interior wall / pillar panels |
| `--c-seat` | #c9c4b4 | #2a2638 | bench strip |
| `--c-line` | #ff9500 | #ff9f1a | line-colour stripe (Ginza orange); also the Marunouchi red swap is a possible variant |
| `--c-tunnel` | #05050a | #05050a | outside the glass (fixed) |
| `--c-lamp` | #ffe9b0 | #ffe9b0 | tunnel lamp streaks (fixed) |
| `--c-platform` | #dfe9ff | #9fb4e8 | station flash through glass |
| `--t-rush` | 1.6s | | near-lamp loop period (new duration token) |

Contrast checks to confirm at build time: sign text on sign panel >= 4.5:1 in both schemes (sign panel uses `--c-ink` on `--c-line`, check light and dark); lamp streaks vs `--c-tunnel` is far above 3:1; bench vs wall only needs to read as a shape (>= 1.5:1 is acceptable, decorative).

## Layers (back -> front)
Target: 8 elements, 4 animated (4 promoted compositor layers).
1. `.stage` (reuse): car-wall flat gradient background (gradient).
2. `.windows`: three window openings as one element with a `mask-image` (repeating-linear-gradient) cutting holes, filled with `--c-tunnel`. Static. Justification: one element instead of three.
3. `.far`: far tunnel lamps. `repeating-linear-gradient` of small dots/dashes, wide (200% inline size), translated one period. Animated.
4. `.near`: near lamps and cable runs, bigger streaks, same technique, 1/3 the period of `.far` (parallax). Animated.
5. `.station`: platform wash plus a few inline-SVG pillars and a tiny sign (駅 name, system font). Sits behind the glass, translates in/out once per cycle. Animated (transform + opacity).
6. `.frames`: window frames and pillars between windows (gradient, `::before`/`::after` of `.windows` where possible, so no extra element). Static.
7. `.interior`: bench strip with line-colour stripe, handrail, hanging straps (one inline SVG, about 8 straps). Straps animated (sway).
8. `.glass`: faint reflection gradient with `--c-accent` tint and vignette, `pointer-events: none`. Static, opacity only.

## Motion plan
| Element | Property | Trigger | Duration | Compositor-safe? |
|---|---|---|---|---|
| `.far` | `transform: translate` by exactly one tile period | time, infinite, linear | `calc(var(--t-rush) * 3)` (4.8s) | yes |
| `.near` | `transform: translate` by exactly one tile period | time, infinite, linear | `var(--t-rush)` (1.6s) | yes |
| `.far` / `.near` speed | `animation-play-state` is not used; speed ramp is done by a keyframe `animation-timing-function` on `.station` instead (see below) | n/a | n/a | n/a |
| `.station` | `translate` (slide in), `opacity` (0 -> 1 -> 0) | time, infinite | `var(--t-drift)` (24s), station visible about 18% of the cycle | yes |
| tunnel lamps vs station | `.near`/`.far` `opacity` dips to 0.25 while station visible (they "slow" visually by fading, avoiding real speed changes) | time, synced to `.station` via same 24s duration | 24s | yes |
| straps | `rotate` +/- 1.5 deg, per-strap `animation-delay` from `--i` | time, infinite, ease-in-out | 3.2s | yes |
| `.glass` | none | static | n/a | n/a |

Notes: loops are seamless because the translation distance equals exactly one repeat of the gradient tile (tile size defined once in a custom property so period and distance cannot drift apart). Durations are integer multiples (1.6s, 4.8s) so parallax layers re-align. No paint-cost animations; nothing flagged `paint-ok`. Zero blur filters (lamp glow done with gradient falloff in the tile) to keep GPU cost low.

## Techniques (Baseline status + fallback)
Searched with `modern-web-guidance`:
- **Seamless parallax via repeating-gradient tiles + `transform`/`translate`**: widely supported, no fallback needed. This is the teachable core of the write-up (period-locked tiling, ratio-locked durations).
- **`light-dark()` + `color-scheme`**: `color-scheme` Widely available (2022-02-03); `light-dark()` Newly available (Baseline 2024-05-13; Chrome 123, Firefox 120, Safari 17.5). Fallback: `@supports not (color: light-dark(white, black))` supplies the dark values via `prefers-color-scheme` media query.
- **CSS masks (`mask-image` for window holes)**: Widely available (Baseline 2023-12-07). Fallback: not needed; if desired, plain opaque frames drawn with gradients.
- **`sibling-index()` / `sibling-count()` for strap sway stagger**: Newly available (Baseline 2026-08-18; Chrome 138, Safari 26.2, Firefox 154). Fallback: inline `style="--i:n"` per strap, selected via `@supports not (order: sibling-index())`-style feature check (`@supports (animation-delay: calc(sibling-index() * 1s))`). Cost: about 8 short attributes.
- **Registered custom properties (`@property`)**: Newly available (Baseline 2024-07-09). Considered only for typed tile-size; not required, so not used (avoids paint-cost animation and keeps size down).
- **Scroll-driven animations (`animation-timeline`)**: Considered and rejected. Limited availability (Chrome 115, Safari 26, no Firefox); the scene is a full-window fixed stage with no scroll, so time-based is the honest trigger. Guidance says decorative uses should progressively enhance without a fallback, which is moot here.
- **View transitions**: considered and rejected, no navigation or state change.
- **`clip-path`**: search returned masks for shaped cutouts; masks chosen as above.

## Reduced-motion frame
`prefers-reduced-motion: reduce`: all animation off. Composed still frame: tunnel lamps frozen at a pleasing offset showing soft horizontal streaks across all three windows, station layer hidden (opacity 0) so the frame is the "in tunnel" look, straps hang at rest. Never blank; the car interior, line stripe and glass reflection are fully static.

## Exceptions
None. No JS, system fonts only (station sign uses `system-ui`; the kanji glyph relies on the OS CJK fallback, which is acceptable because it is decorative and `aria-hidden`), CSS plus inline SVG only. If CJK glyph rendering is unreliable on a target OS, draw the sign as inline SVG path instead (small byte cost, would be declared).

## Snippets reused / candidates to extract
- Reused: `lib/stage` (`.stage`, layers, `contain: strict`), `lib/aurora` only for the `@media (prefers-reduced-motion)` pattern (the aurora layer itself is not used).
- Candidates to extract: `@snippet tile-loop` (period-locked repeating-gradient translate loop with ratio-locked parallax layers); `@snippet sway` (staggered rotate pendulum with `sibling-index()` plus fallback).

## Budget & targets
- Budget: 14 KB brotli (default) for `index.html` + CSS combined; exceptions 0 KB. Expected about 6-8 KB (gradients are compact; the SVG straps are the largest part).
- Targets: Lighthouse perf >= 95, CLS 0, dropped frames < 2%, at most 4 promoted layers, no `filter: blur`.

## Open questions for the human
1. Viewpoint: inside the car looking at the windows (as drafted) or on the platform watching a train pass? Interior is cheaper and has fewer silhouettes.
2. Include commuters (a couple of simple SVG silhouettes) or keep the car empty (calmer, smaller, cheaper)? Draft assumes empty.
3. Line identity: Ginza orange (drafted), or another Tokyo Metro line colour? Accent violet stays only in glass tint and station sign glow.
4. Is the visible station stop each 24s cycle wanted, or just a constant tunnel rush? Dropping it removes layer 5 and about 1 KB.
5. Is an OS-dependent kanji sign acceptable, or do you want it as inline SVG paths (declared exception, roughly 0.3 KB)?
6. Light scheme as a brightly lit car (drafted), or should the scene stay night-toned in both schemes with only the interior trim shifting?
7. Path note: you asked for `/Users/craig/work/scenes/tokyo-subway/`, but the repo convention is `/Users/craig/work/css-scenes/scenes/<slug>/`. The brief was written to the latter. Confirm or move.
