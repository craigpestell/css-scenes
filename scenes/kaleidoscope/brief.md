# Kaleidoscope (kaleidoscope)

Status: APPROVED. The owner asked for a kaleidoscope scene on 2026-10-06. Claude picked the defaults below, including the slug, and they have not been reviewed separately.

## Concept / mood / motion language
- **Concept:** Looking down a brass kaleidoscope. Twelve fixed mirror slices fold the coloured glass beads and shards in the object cell into a six-fold pattern. Scrolling turns the barrel, which turns the cell and tumbles the loose glass, so the pattern changes the way it does in a real kaleidoscope. Nothing moves until you scroll.
- **Mood:** Jewel-box, hypnotic, a little Victorian.
- **Motion language:** Input-driven tumble: pieces catch, lag, then slip. The mirrors never move.

## Palette & tokens
Six glass colours (ruby, amber, teal, cobalt, violet, lime), a field colour and a brass ramp, all local custom properties using `light-dark()`. No new tokens; this asks for the same local-colours exception earlier scenes have used.
- Dark: opaque jewel colours on near-black, the second glass layer blended with `screen` so overlaps glow like lit glass.
- Light: translucent colours on a pale daylight field, the second layer blended with `multiply` so overlaps darken like stained glass held up to a window.

## Layers (back to front)
1. Stage background: dark/paper with a soft violet bloom behind the eyepiece.
2. Brass barrel `.tube`: drop shadow; its `::before` is the conic-gradient brass ring, which turns with the barrel.
3. `.scope`: the round eyepiece (`overflow: clip` + `border-radius`). Fixed.
4. Twelve `b` wedges (the mirrors), each a `clip-path` triangle; even ones mirrored with `scaleY(-1)`. Fixed.
5. Inside each wedge an identical object cell: `i` (beads, rings, conic shards), its `::before` (second glass layer, blended) and `::after` (small loose beads).
6. `.tube::after`: static eyepiece glint and inner shadow, so the light doesn't turn with the view.
7. Scroll hint.

## Motion plan
| element | property | trigger | duration | compositor-safe? |
|---|---|---|---|---|
| brass ring `.tube::before` | `transform: rotate`, 1 turn | scroll(root); time fallback | 90s | yes |
| object cell `i` | `transform: rotate`, 1 turn | scroll(root); time fallback | 90s | yes |
| glass `i::before` | `transform: rotate() translate()`, against the cell, uneven hold-and-slip steps | scroll(root); time fallback | 90s | yes |
| beads `i::after` | `transform: rotate() translate()`, with the cell, uneven steps | scroll(root); time fallback | 90s | yes |
| hint | `opacity` | scroll(root), first 4% | — | yes |

With scroll timelines nothing moves until the page scrolls, and scrolling back turns the barrel back. Without them (Firefox) the same keyframes run slowly on time.

## Techniques
- **Mirror wedges from `clip-path` + `scaleY(-1)`.** Widely available.
- **`sibling-count()` / `sibling-index()`** derive wedge angle and rotation from the markup. Newly available (2026-08-18); `:nth-child` fallback hardcodes 12 wedges.
- **`tan()`** sizes each wedge from its angle. Widely available.
- **Scroll-driven animation** turns the barrel and tumbles the glass. Limited availability (not Firefox); fallback is a slow automatic turn.
- **`mix-blend-mode` switched by colour scheme** through a custom property.

## Reduced-motion frame
A composed still pattern: glass layers at their resting angles (35deg / -80deg / 140deg), barrel unturned, no hint, page doesn't scroll.

## Exceptions
Only local colours. No JS, fonts or images.

## Snippets reused / candidates to extract
Uses `lib/stage`. Candidate: the mirrored-wedge kaleidoscope rig (any content dropped into `i` becomes symmetric).

## Budget & targets
14 KB brotli. Lighthouse perf ≥ 95, CLS 0, dropped frames < 2%.

## Open questions for the human
- OK to use local colours rather than adding the glass palette to `tokens.json`?
