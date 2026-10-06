# Vertical Drive (vertical-drive)

Status: APPROVED. The owner asked for this scene to be built on 2026-10-03 ("build the first and third idea", from the landonorris.com review). Claude picked the defaults below and they have not been reviewed separately.

## Concept / mood / motion language
- **Concept:** A top-down race circuit on a contour map. Scrolling drives a lime car three laps around it, passing three rivals, while a HUD counts laps, position and race time.
- **Mood:** Sleek, graphic, motorsport-broadcast.
- **Motion language:** Scrubbed, precise, one car moving through a still world.

## Palette & tokens
Lime `#d2ff00` and near-black `#111112`, taken from the inspiration site, plus track greys. Each is a local custom property with a `light-dark()` pair (light: warm paper with a deeper `#9fbf00` lime edge; dark: near-black). There are no new tokens: this falls under the local-colours exception the user accepted on 2026-10-03, and `tokens.json` is unchanged. The HUD is lime on a near-black backing, about 17:1 in both schemes.

## Layers (back to front)
1. Stage background: two `repeating-radial-gradient` ring fields as contour lines, painted once.
2. Inline SVG track in a 100 × 160 viewBox: one `<path>` reused three times through `<use>` (lime edge, tarmac, dashed centreline), plus a start line.
3. Four `<i>` cars: three rivals and you, each drawn with gradients.
4. HUD `<p>` (counters) and the scroll hint.

## Motion plan
| element | property | trigger | compositor-safe? |
|---|---|---|---|
| cars | `offset-distance` 0 → 300% (three laps; rivals start ahead and run slower) | scroll(root), with a 30s time-loop fallback | yes (offset is a transform) |
| HUD | `--lap`, `--pos`, `--cs` integers into `counter()` | same | paint-ok: tiny text box |
| hint | opacity | same | yes |

## Techniques
- Motion path (`offset-path`, `offset-distance`, `offset-rotate: auto`): widely available.
- `shape()` as the offset path, in percentages of the board, so the route scales with it: newly available (2026-02-24). The fallback is `path()` on a fixed 250 × 400 px board.
- Scroll-driven animations: limited (no Firefox). The fallback plays the same keyframes on a time loop (Liftoff's pattern).
- `@property` integers, with `round()`/`mod()` splitting centiseconds into m:ss.cc.

## Phone portrait
The board keeps a 5:8 portrait aspect at `min(92vw, 52.5dvh)`, so on a phone the track fills most of the screen.

## Reduced-motion frame
All animation is off and the page doesn't scroll. You lead out of the last corner of lap 3 with the pack behind. The HUD reads LAP 3/3 P1 4:16.11.

## Exceptions
Only local colours (see above). No JS, fonts or images.

## Budget & targets
14 KB brotli. Lighthouse perf ≥ 95, CLS 0.

## Inspiration
landonorris.com, design by OFF+BRAND: lime on near-black and contour lines. The scene uses no names, numbers, logos, team branding or likenesses.
