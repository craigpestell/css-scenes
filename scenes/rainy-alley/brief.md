# Rainy Alley (rainy-alley)

Status: APPROVED by the owner on 2026-11-03 with the defaults below ("go for it"). Requested 2026-11-03 ("a cobblestone alley on a dark and rainy night, showing city lights in the reflection"). The owner then let Claude choose the ground; Claude chose wet asphalt with puddles, because a smooth wet surface mirrors the lights as long streaks, where cobbles would break them into specks.

## Concept / mood / motion language
- **Concept:** Standing at the mouth of a narrow city alley at night in the rain. Brick walls close in on both sides, a street lamp and a few neon signs glow at the far end, and the wet asphalt and its puddles mirror every light as long, wavering streaks.
- **Mood:** Moody, quiet, a little noir. Cold blue-grey rain against warm sodium and neon colour.
- **Motion language:** Steady fall, soft shimmer, the odd flicker.

## Palette & tokens
All local `light-dark()` custom properties (same local-colours exception the other scenes use). No new tokens.
- Night base: wall `#1a1c26`, far wall `#232636`, asphalt `#0d0e14`, sky gap `#2b3350`.
- Lights: sodium lamp `#ffb347`, warm windows `#ffd88a`, neon pink `#ff3d8b`, neon cyan `#3de0ff`.
- Rain: `#b8c6e0` at low alpha.
- **Light scheme:** still a rainy alley, but at blue hour (dusk): sky gap `#6f86b0`, walls lifted to `#3b4054` (as built), lights a little dimmer. Both schemes stay dark enough for the reflections to read; there is no daylight version.
- Text: none in the scene except one neon sign word (see Open questions), which is decorative and `aria-hidden`.

## Layers (back to front)
About 10 elements, 6 animated.
1. `.stage` (reuse `lib/stage`): sky gap at the top, gradient.
2. `.alley`: the two brick side walls in one-point perspective, built from `clip-path` polygons with a brick `repeating-linear-gradient`, darkening toward the viewer. The far wall closes the vanishing point. Static.
3. `.lights`: everything that glows, as ONE element whose background is a stack of radial and linear gradients held in a custom property `--lights` (lamp halo, lit windows, two neon sign panels). Static, except the neon flicker (below).
4. `.ground`: the asphalt plane from the horizon line down, a dark gradient plus a subtle grain gradient.
5. `.reflect`: the reflection. It paints the **same** `--lights` background, flipped with `scale: 1 calc(var(--stretch) * -1)` (default 1.6 as built) from the horizon line (the stretch gives the long road-streak look), softened with `filter: blur()`, and limited to wet areas with `mask-image` (a broad wet sheen plus three puddle ellipses where the reflection is strongest).
6. `.shimmer`: thin horizontal dark bands (`repeating-linear-gradient`) over the reflection only, translated slowly downward so the streaks seem to waver. Period-locked loop.
7. `.ripples`: 6 to 8 `i` rings in the puddles (radial-gradient rings), each scaling up and fading, staggered with `sibling-index()`.
8. `.rain`: two layers (`::before` far, `::after` near) of thin slanted streaks drawn with `repeating-linear-gradient`, each translated one tile per loop; near layer faster and brighter (parallax).
9. `.mist`: a low haze gradient around the lamp and over the far end. Static.
10. `.vignette`: dark edges, `pointer-events: none`. Static.

## Motion plan
| element | property | trigger | duration | compositor-safe? |
|---|---|---|---|---|
| `.rain::before` (far) | `translate` by exactly one tile | time, infinite, linear | 0.9s | yes |
| `.rain::after` (near) | `translate` by exactly one tile | time, infinite, linear | 0.45s | yes |
| `.shimmer` | `translate` by one band period | time, infinite, linear | 6s | yes |
| ripples `i` | `scale` 0.15 to 1, `opacity` 0.8 to 0 | time, infinite, ease-out, delays from `sibling-index()` | 1.6s | yes |
| neon sign `.lights::after` and its reflection `.reflect::after` | `opacity` steps (two quick flickers, then steady) | time, infinite, same keyframes so the puddle flickers with the sign | 7s | yes |
| everything else | none | static | n/a | n/a |

The blur on `.reflect` is static (not animated), so it is painted once. Nothing is flagged `paint-ok`.

## Techniques (Baseline status + fallback)
Baseline status below is from my own knowledge of web-features; the `modern-web-guidance` lookup could not run in this session (the environment blocked the npx download). The builder re-checks it before shipping.
- **One background painted twice (the teachable core).** The lights live in a custom property; the reflection reuses it, flipped and stretched, so moving a light moves its reflection with no extra markup. Custom properties and transforms: widely available. This avoids `-webkit-box-reflect` (not in Firefox) and `element()` (Firefox only).
- **`mask-image` with radial gradients** for the puddles: widely available (2023-12-07).
- **Period-locked rain and shimmer loops** with `repeating-linear-gradient` + `translate`: widely available (same rig as Tokyo Subway).
- **`sibling-index()`** for ripple delays and positions: newly available (2026-08-18); `--i` inline fallback.
- **`clip-path: polygon()`** for the perspective walls: widely available.
- **`light-dark()`**: newly available (2024-05-13).
- **`filter: blur()`** (static) on the reflection: widely available.
- `random()` was considered for ripple positions but is not Baseline, so positions use `sibling-index()` arithmetic (`sin()`/`mod()`), widely available.

## Reduced-motion frame
Rain streaks stay visible but still, ripples hold at mid-size as faint rings, the shimmer stops, and the neon stays steadily lit. The frame still reads as a rainy alley with reflections.

## Exceptions
Only local colours (as above). No JS, no fonts, no images.

## Snippets reused / candidates to extract
Uses `lib/stage`. Candidates: the "reflect a custom-property background" rig (any light layout gets a matching wet reflection), and the period-locked rain layer (reusable in other weather scenes).

## Params (scene dock controls)
- Rain angle (`--tilt`, range -20deg to 20deg).
- Reflection stretch (`--stretch`, range 1 to 4).

## Budget & targets
14 KB Brotli. Lighthouse perf ≥ 95, CLS 0, dropped frames < 2%.

## Open questions for the human
1. Neon sign wording: a plain word like "HOTEL" or "BAR", a Japanese sign to sit with Tokyo Subway and Ramen Counter, or no lettering (just glowing shapes)? Default (built): "BAR" plus one lit, shape-only neon ring.
2. Is the blue-hour light scheme right, or should both schemes be full night? Default: blue hour.
3. Anything in the alley (fire escape, bins, a parked bicycle) or keep it empty? Default: a fire escape silhouette on the right wall, otherwise empty.
