# Clockmaker's Observatory (clockmakers-observatory)

Status: APPROVED in the session plan. CSS-only pause and lamp controls and scene-local material colours were explicitly selected by the user.

## Concept / mood / motion language

A quiet clockmaker's attic observatory beneath an open copper dome: a brass telescope points into a midnight sky while a miniature solar system turns above a crowded walnut workbench.

Mood: meticulous, warm, nocturnal, gently fantastical.

Motion language: slow, interlocking, orbital, restrained.

Original artwork. The historical reference is the clockmaking origin of the [orrery](https://en.wikipedia.org/wiki/Orrery), not an illustration to reproduce.

## Palette and tokens

Reuse `--c-ink`, `--c-paper`, and `--c-accent` for controls; `--c-lamp` for warm highlights; `--t-base`, `--t-drift`, `--t-swing`, and `--ease-out` for timing.

Scene-local material colours are an approved exception. No shared token changes:

| Variable | Light | Dark |
|---|---|---|
| `--room` | #dbcdb5 | #171c27 |
| `--room-shadow` | #ad9679 | #0d111b |
| `--wood` | #956345 | #4c3028 |
| `--wood-edge` | #573c2b | #241a19 |
| `--brass` | #a97832 | #bf9450 |
| `--brass-light` | #f2d79c | #e9c987 |
| `--copper` | #a76145 | #704636 |
| `--paper` | #f1e4c7 | #c5b18b |
| `--paper-ink` | #30291f | #30291f |
| `--glass` | #82b3bd | #376274 |
| `--sky` | #101d38 | #080f22 |
| `--star` | #ecf1ff | #ecf1ff |

Light scheme means a brighter interior, not a daytime sky. Lamp state is independent of OS scheme. Use explicit light/dark media-query values before `light-dark()` enhancement. Control text contrast >= 4.5:1; control state and focus contrast >= 3:1 in both schemes and lamp states.

## Layers (back to front)

1. Room and sky: static material gradients; arched opening, moon, sparse star field.
2. Copper dome: ribs, rail, seams, rivets and hatch silhouette. Static clipped/gradient geometry.
3. Rear wall: shelves, books, specimen bottles, clock, astrolabe, framed chart and chalkboard.
4. Floor/furniture: perspective planks, bench apron, drawers, joinery, stool, contact shadows.
5. Telescope: lens rim, barrel, collars, focus wheel, fork mount, tripod and fasteners.
6. Orrery: scoped 3D orbital plane, four orbital carriers, shaded planets, central sun, shafts, pedestal, engraved base, paired drive gears, winding handle.
7. Workbench: compass, calipers, winding key, magnifier, notebook, loose drawing, ink, quill, mug, loose cogs, plant.
8. Lamp and controls: localized static gradient wash with opacity transition; opaque control panel, two native labelled checkboxes.

Use CSS as the primary illustration, with original inline SVG for fine chart/diagram lines. Estimate 70-100 decorative HTML elements plus compact SVG. Repeated small detail uses pseudo-elements or gradients, not one compositor layer per mark.

Keep clipping, masks, opacity, filters and paint containment off intermediate `preserve-3d` ancestors. They flatten 3D children. Apply these to leaf nodes or sibling overlays instead.

## Detail and responsive acceptance

At 1440 x 900, all five zones must read: dome/sky, telescope, orrery, shelves/wall instruments, workbench.

At least 30 recognizable object units must be visible, not counting stars, ribs, bolts or hidden objects. Both focal assemblies need at least five distinct construction details. Wood, brass, copper, glass, paper and ceramic must read differently.

Inventory target (34 object units):
- Telescope, orrery, desk lamp, workbench, stool, wall clock, star chart, chalkboard, shelf unit.
- Eight distinguishable books, three specimen bottles, three loose cogs.
- Astrolabe, compass, calipers, winding key, magnifier, notebook, loose drawing, ink bottle, quill, mug and plant.

Planet bodies, tripod legs and fasteners are construction detail, not additional counted props. Compare screenshots against existing illustrative scenes at matching viewports; a higher DOM count is not evidence of richer artwork.

Desktop places telescope left, orrery centre, shelves right, bench foreground. Portrait recomposes these instead of uniformly shrinking a wide image. At 390 x 844 and 320 x 568, preserve both focal assemblies, lamp, sky and controls, and at least 16 visible object units.

Reserve top chrome and bottom controls. Minimum 44 x 44 CSS-pixel label targets, visible keyboard focus, usable labels at 200% text zoom. No scrolling.

## Motion plan

Initial state: clockwork running, lamp on. Explicit orbital phases compose the first frame.

| Element | Property | Trigger | Duration | Compositor-safe? |
|---|---|---|---|---|
| Four orbital carriers | `transform: rotateZ()` | time | 24 / 36 / 48 / 72 s | candidate; measure actual compositor behaviour |
| Planet orientation correction | inverse `rotateZ()` and fixed `rotateX()` | same clock | matches carrier | compact child transforms |
| Two coupled gears | `rotate` | time | 12 / 18 s, opposing directions | yes; proportional tooth counts |
| Pendulum | `rotate` | time | `--t-swing` 3.6 s | yes |
| Lamp wash and bulb | `opacity` | checkbox | `--t-base` 400 ms | yes; no animated blur/gradient stops |
| All moving descendants | `animation-play-state` | pause checkbox | immediate | hold and resume current positions |

Target <= 12 animated elements. No blanket `will-change`. No continuous paint-cost animation; any deviation must be annotated `paint-ok` with bounded area and measurement.

Inputs precede the room wrapper. `:checked` sibling selectors are the functional baseline. Scoped `:has()` may decorate labels but cannot be required for controls to work.

## Techniques, support and fallback

Research: MDN, published `web-features@3.40.1` data, and `modern-web-guidance` CLI search/retrieve. The CLI became available after locating Node. Consulted CSS architecture, shaped cutouts, individual transforms, radial sibling positioning, child-state styling and dark-mode guides. No JavaScript fallback is needed because native checkbox sibling selectors are the baseline.

| Technique | Baseline in the dataset | Fallback |
|---|---|---|
| Layered/repeating linear and radial gradients | Widely available | opaque base material fills |
| Conic/repeating-conic gradients | Widely available | circular dial/ring geometry |
| CSS masks | Widely available (2023-12-07) | unpunched gear discs; guard mask enhancement |
| `clip-path: polygon()` | Widely available (2021-01-21) | basic border/rounded silhouettes |
| 3D transforms and perspective | Widely available | deliberately composed 2D ellipses with visible bodies |
| Individual transforms | Widely available (2022-08-05) | equivalent transform stack if needed |
| CSS `sin()` / `cos()` | Widely available (2023-03-13) | explicit per-fastener coordinates |
| Native checkbox state and sibling selectors | Long-established | no scene JavaScript |
| Scoped `:has()` | Widely available (2023-12-19) | functional state styling through sibling selectors |
| `light-dark()` | Newly available (2024-05-13) | explicit light values and dark media query |
| `prefers-reduced-motion` | Widely available | complete static base styles |
| Custom properties, pseudo-elements, layers, `clamp()` | Established | bounded base geometry |

Considered but not used: motion paths (nested carriers teach mechanical depth); `@property` (no gradient animation); `sibling-index()` (explicit indices support older project targets); `color-mix()` (fixed material art direction); container queries (viewport composition suffices); scroll-driven animation, pointer parallax, canvas and WebGL.

Support metadata describes the exact syntax used, not unsupported umbrella assumptions. Inspect the bundled output at Chrome 120+, Safari 17.4+, Firefox 128+ targets.

## Reduced-motion frame

Disable clockwork animation and nonessential transitions. Retain explicit, separated orbital phases and a resting pendulum. The lamp remains functional and changes immediately.

Controls stay visible. A short reduced-motion note explains that system settings keep the clockwork still; unchecking pause cannot override that preference.

## Exceptions

- Local material colours: explicitly approved; shared tokens unchanged.
- `extraBytes`: 0.
- No scene JavaScript, fonts, images, external runtime requests or dependency.
- Original inline SVG linework is permitted by the baseline contract.
- Existing generated site chrome/statistics scripts are not scene dependencies. Artwork and controls work with all scripts disabled.

## Snippets reused / candidates to extract

Reuse `lib/stage`, shared timing/UI tokens and native checkbox patterns. Do not import the blurred aurora.

Potential later extraction: gradient/mask gear recipe or nested orbital carrier. No extraction without separate approval.

## Budget and success

- Hard shipping budget: 14 KiB / 14,336 Brotli bytes; no extra allowance.
- Working target <= 10 KiB; measure actual output.
- Lighthouse performance >= 95, CLS 0, dropped frames < 2%.
- Measure rather than infer performance from size; state unverified metrics explicitly if tools are unavailable.
- Verify desktop/mobile, light/dark, reduced motion, no JavaScript, keyboard controls, fallback frame, pause/resume, gallery preview, generated source and stats.
- Preserve existing scenes and build architecture.

## Open questions

None; implement the approved scene and validate the visible-detail criteria.
