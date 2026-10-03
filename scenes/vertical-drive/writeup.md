---
title: Vertical Drive
slug: vertical-drive
---
## The idea

A race circuit seen from above, laid over faint contour lines. Scroll down and a lime car drives three laps, slipping past three grey rivals one by one, while the HUD ticks through LAP 1/3 → 3/3, P4 → P1 and a race clock. The track is portrait-shaped, so on a phone it fills the screen. No JavaScript: the scrollbar is the accelerator.

## Techniques

### offset-path car on a scroll(root) timeline

Each car is an `<i>` drawn nose-right, because `offset-rotate: auto` points the element's +x axis along the direction of travel. The track is a closed path, so `offset-distance` past 100% wraps into the next lap. One keyframe from 0% to 300% is three laps:

```css
@keyframes drive { from { offset-distance: var(--s, 0%); } to { offset-distance: var(--e); } } /* closed path: past 100% it wraps into the next lap */
```

Rivals reuse the same keyframes. Each starts a little ahead (`--s`) and covers a little less distance (`--e`), so the player passes them in turn:

```css
.rival { /* each starts ahead and runs a little slower; you pass them at 27%, 43% and 64% of the race */
  --body: var(--rival);
  --s: calc(var(--i) * var(--i) * 1.5% + 2.5%);
  --e: calc(var(--s) + 290% - var(--i) * 5%);
  transform: translateY(1.8cqi);
}
```

`transform` applies after the offset transform, so `translateY` here is relative to the car's heading: rivals keep to one side of the racing line and you to the other, so a pass never overlaps. Motion path is widely available (2025-03-12), and `offset-distance` is composited like any transform.

### shape() motion path that scales with the board

`path()` only takes pixels, so a `path()` route can't grow with the viewport. `shape()` takes percentages of the reference box, which for a positioned car is its containing block (the board). The board keeps the SVG's 100 × 160 aspect, so the SVG's x maps to x% and y maps to y / 160 %. The drawn track and the motion path line up at any size:

```css
@supports (offset-path: shape(from 0 0, line to 1px 1px)) {
  .board { inline-size: min(92vw, 52.5dvh); }
  /* the same path in percentages of the board (y / 160), so it scales with it */
  .car {
    offset-path: shape(from 82% 81.25%, line to 82% 21.25%,
      curve to 56% 20% with 82% 8.75% / 56% 8.75%,
```

`shape()` is newly available (2026-02-24). Without it, the board stays a fixed 250 × 400 px and the cars use the same route as `path()` at 2.5 px per unit. That is still readable on a 320 px phone.

### One keyframe script on two timelines

As in Liftoff, everything plays on a 30s time loop by default, and one block hands the same keyframes to the scrollbar where scroll timelines exist (not Firefox, per web-features 3.40.1):

```css
@supports (animation-timeline: scroll()) {
  body { overflow: auto; }
  .runway { display: block; block-size: 900dvh; }
  .hint { display: block; }
  .car, .hud, .hint {
    animation-duration: auto;
    animation-iteration-count: 1;
    animation-timeline: scroll(root);
  }
}
```

### @property integer race clock split into counter()

A registered `<integer>` interpolates and rounds, so animating `--cs` from 0 to 26400 is a centisecond clock. `round()` and `mod()` (newly available 2024-05-17) split it into minutes, seconds and hundredths inside `counter-reset`:

```css
counter-reset: lap var(--lap) pos var(--pos)
  min calc(round(down, var(--cs) / 6000)) sec calc(mod(round(down, var(--cs) / 100), 60)) cs calc(mod(var(--cs), 100));
```

Lap and position are integers too. Their keyframes hold a value, then step 0.2% later, so rounding can't flip them early. Without `round()`/`mod()` the clock reads 0:00.00, and lap and position still work.

### SVG <use> layers from one path

The track is one `<path>`, used three times: a 10-unit lime stroke, a 9-unit tarmac stroke on top (leaving a thin lime edge on each side) and a dashed centreline. The kerbs can never drift from the tarmac.

## Performance notes

| raw | gzip | brotli | budget | ok |
|---|---|---|---|---|
| 7,332 B | 2,966 B | 2,562 B | 14,336 B | yes |

The cars animate only `offset-distance`, which is a transform. The contour background and SVG track paint once. The HUD integers change text, so each step costs a small layout and paint in the HUD box (paint-ok). Each car has a small static `drop-shadow` that moves with it. Frame times and layer counts are not measured yet.

## Accessibility

- `prefers-reduced-motion: reduce` turns every animation off and stops the page scrolling. It shows a composed frame: you lead out of the last corner of lap 3, and the HUD reads LAP 3/3 P1 4:16.11. Checked in headless Chromium at 1280 and 390 px wide, light and dark.
- HUD text is lime on a near-black backing, about 17:1 in both schemes. The HUD is `aria-hidden`; the stage's `aria-label` describes the scene.
- Colours are local custom properties under the local-colours exception (no token changes). The light scheme uses a deeper lime (`#9fbf00`) for the track edges so they read on paper.

## Reuse

Uses `lib/stage`. Two patterns are candidates for extraction: the "SVG path, then `shape()` in percentages of an aspect-locked box" route, and the `round()`/`mod()` clock.
