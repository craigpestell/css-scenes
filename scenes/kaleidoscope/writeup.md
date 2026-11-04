---
title: Kaleidoscope
slug: kaleidoscope
---
## The idea

You look down the eyepiece of a brass kaleidoscope. Twelve fixed mirror slices fold the glass beads, rings and shards in the object cell into a six-fold pattern. The barrel turns on its own, forever: the cell turns, the loose glass inside tumbles and shakes, and the pattern keeps changing without ever repeating. Where CSS `random()` is supported, every visit also starts from a different pattern. In dark mode the glass glows like jewels under a lamp; in light mode it filters daylight like stained glass. No JavaScript, no images, no web fonts.

## Techniques

### Mirrored clip-path wedges (rotate + scaleY(-1))

A real kaleidoscope is two mirrors at an angle. Here each wedge is a box from the centre, `r` wide and `r · tan(a)` tall, so its diagonal sits at exactly `a` degrees. A `clip-path` triangle keeps the slice between 0 and `a`:

```css
.scope b {
  --a: calc(360deg / var(--n));
  --k: 0;
  position: absolute;
  inset: 50% auto auto 50%;
  inline-size: var(--r);
  block-size: calc(var(--r) * tan(var(--a)));
  transform-origin: 0 0;
  transform: rotate(calc(var(--k) * 2 * var(--a)));
  clip-path: polygon(0 0, 100% -1%, 100% 101%); /* a hair wider than the wedge hides anti-aliased seams */
}
.scope b:nth-child(even) { transform: rotate(calc((var(--k) * 2 + 2) * var(--a))) scaleY(-1); }
```

Wedges come in pairs. The odd one sits at `2ka`. The even one is flipped with `scaleY(-1)`, which maps the slice to `−a…0`, then rotated one pair further, so it lands at `2ka + a … 2ka + 2a`. Every seam therefore meets its own reflection, which is why the joins are invisible. The polygon is a hair wider than the wedge so anti-aliased edges overlap instead of showing a dark hairline.

### sibling-count() and sibling-index() fold count with :nth-child fallback

The fold count comes from the markup. Where `sibling-index()` is supported, `--n` is the number of wedges and `--k` (the pair index) is computed per wedge:

```css
@supports (order: sibling-index()) {
  .scope b { --n: sibling-count(); --k: round(down, (sibling-index() - 1) / 2); }
}
```

Delete four `<b>` elements and you get four-fold symmetry with no CSS change (checked in Chrome). Keep the count even and at least 6, since `tan(90deg)` is infinite. `sibling-index()` is newly available (2026-08-18). Without it, `--n: 12` and five `:nth-child(n + 3)`… rules set `--k`, so the shipped markup looks the same everywhere.

### Fixed mirrors over a turning object cell with tumbling glass layers

In a real kaleidoscope the mirrors never move. Turning the barrel turns the object cell at the far end, and the loose glass in it tumbles: pieces catch, ride along, then slip and fall over each other. That is why the pattern changes instead of the whole picture spinning. The scene copies that. The wedges (the mirrors) and `.scope` have no animation at all; only the glass moves.

CSS has no way to render one element in twelve places, so every wedge holds its own copy of the cell. The copies stay perfectly symmetric because they share the same styles and the same timeline.

```css
.scope i,
.scope i::before,
.scope i::after {
  position: absolute;
  inset: calc(var(--r) * -0.5) auto auto calc(var(--r) * -0.18);
  inline-size: calc(var(--r) * 1.45);
  aspect-ratio: 1;
  animation: cell var(--turn, 80s) linear infinite, wander-a 23s ease-in-out infinite alternate;
}
```

There are three layers, each with its own resting `rotate` and its own off-centre `transform-origin`:

- `i`, the cell, turns one steady turn (`cell`).
- `::before`, the large glass, turns a full turn against the cell (`tumble`).
- `::after`, the small loose beads, turns with the cell but further, in uneven steps (`rattle`).

The loose layers wander with a small `translate` at each step, and their timing function applies per keyframe segment, so each step holds and then slips:

```css
.scope i::before {
  animation-name: tumble;
  animation-timing-function: cubic-bezier(0.7, 0, 0.3, 1); /* per segment: hold, then slip */
}
@keyframes cell { to { transform: rotate(1turn); } }
@keyframes tumble {
  9% { transform: rotate(-30deg) translate(4%, -2%); }
  17% { transform: rotate(-45deg) translate(1%, 3%); }
  /* …uneven steps… */
  100% { transform: rotate(-360deg); }
}
```

Because the three layers move at different, uneven rates, they slide past each other relative to the fixed mirrors, and the folded pattern keeps re-forming. The resting angle lives in the `rotate` property and the animation adds to it through `transform`; both apply, so turning animation off leaves a composed still frame.

The brass ring is a `.tube::before` that runs the same `cell` keyframes on the same `--turn` period, so its highlights turn with the barrel. The eyepiece glint on `.tube::after` stays put.

Everything that moves is a transform, so it runs on the compositor. The gradients paint once per layer and are then only moved.

### mix-blend-mode switched by colour scheme

`mix-blend-mode` can't take `light-dark()`, but it can take a custom property:

```css
--blend: screen; /* overlapping glass adds light on black... */
```

```css
@media (prefers-color-scheme: light) {
  .stage { --blend: multiply; } /* ...and filters it like stained glass held up to a window */
}
```

The second glass layer uses `mix-blend-mode: var(--blend)`. On black, `screen` makes overlaps brighter; on the pale daylight field, `multiply` makes them deeper, and the light palette uses translucent colours so the effect reads.

### Endless barrel turn with coprime animation periods

Every layer runs two infinite animations: a turn on `transform` and an irregular wander on the separate `translate` property, which composes with it. The six periods are 80s, 47s, 31s, 13s, 19s and 23s. They share no common factor, so the layers only line up the same way again after their least common multiple, about 6.6 × 10⁸ seconds (around twenty years, counting the alternating wanders). In practice the pattern never repeats.

```css
.scope i::before {
  animation-name: tumble, wander-b;
  animation-duration: 47s, 13s;
  animation-timing-function: cubic-bezier(0.7, 0, 0.3, 1), ease-in-out;
}
@keyframes wander-b {
  17% { translate: -4% 2%; }
  39% { translate: 3% 5%; }
  /* …irregular steps… */
}
```

The wander runs `alternate`, so it never jumps at the loop point, and its steps are uneven so it reads as glass shaking loose rather than an orbit. An earlier version turned the barrel from a `scroll(root)` timeline; it stopped when you stopped scrolling and ended at the bottom of the page, so the scene now always runs on time. The gallery's playback controls (speed, pause) act on these animations.

### Per-visit random() with element-shared, keeping the mirrors symmetric

Random positions per wedge would break the kaleidoscope: every mirror has to show the same glass. CSS `random()` handles this with `element-shared`, which gives every element the same value, while a named key keeps each layer's value independent:

```css
@supports (rotate: random(--k element-shared, 0deg, 1turn)) {
  .stage { --turn: random(--turn element-shared, 60s, 100s, 1s); }
  .scope i::before {
    rotate: random(--tumble element-shared, 0deg, 1turn);
    animation-delay: random(--tumble-t element-shared, -47s, 0s), random(--tumble-w element-shared, -13s, 0s);
  }
}
```

Each layer starts at a random resting angle and a random point in each of its cycles (negative delays), and the barrel's speed is picked between 60s and 100s a turn. `random()` is limited availability (Safari 26.2 as far as we know; not in Chrome 153, checked with `CSS.supports`). Without it, the scene starts from the same pattern on every visit and then never repeats.

### Optional adaptive size: a small script fits the eyepiece to the frame rate

The scene is CSS only until you turn on **Fit size to frame rate** in Controls. The switch sets `data-adaptive` on the stage, and a small `scene.js` starts counting frames. Once a second it compares the frame rate with the display's refresh rate. Below 90% of that rate, the eyepiece shrinks by 12% at once. After two smooth seconds in a row (at least 95%), it grows by 4%. It doesn't grow straight back to a size that dropped frames, but it tries again after thirty smooth seconds. Its size stays between 30% and 92% of the shorter side of the stage.

A page can't read the refresh rate, and the rate changes: a Mac on battery drops from 60 Hz to 30 Hz. So the script works it out:

- **A faster display shows up in the frame gaps.** The shortest gaps in each second (the 10th percentile, rounded to a common rate such as 30, 60 or 120 Hz) reveal it.
- **A slower display shows up when shrinking stops helping.** After two shrinks the frame rate hasn't risen and sits on a display rate, so that rate becomes the target and the size goes back to where it was.
- **While the target is under 60 Hz, it sometimes checks for a faster display.** It runs one second at a smaller size, and if the frames get faster it switches. These checks get rarer each time they find nothing.

I checked the logic with a simulated display and frame cost (60 Hz → 30 Hz → 60 Hz). It settles near the largest size that keeps up at 60 Hz, grows to full size at 30 Hz, and comes back down when plugged in again.

The script writes the size to `--fit-d`, which the stage reads in place of its default size:

```css
--d: var(--fit-d, min(84vmin, 42rem));
```

Turn the switch off and the property is removed, so the eyepiece goes back to `min(84vmin, 42rem)`.

### Extra glass layers and mirrors from Controls

Controls can add mirrors and glass layers by cloning elements. A clone's CSS animations start when it is inserted, so before this fix added wedges ran behind the originals, and part of the circle stopped matching the rest. The panel now gives each clone's animations the start time of the matching animation on an existing sibling, so every wedge stays on the same clock. Each added glass layer is only loose beads (no rings or shards) turned to a new angle, so more layers add sparkle instead of clutter. The mirror count goes from 6 (4 mirrors would need `tan(90deg)`) to 24, and glass layers go up to 4. Every wedge holds its own composited, animated copy of each layer, and the browser rasters each layer in full even though `clip-path` shows only a sliver. At high counts the GPU tile budget runs out, and some wedges or the Controls sheet simply don't draw, while the frame rate stays the same. A Chromium memory dump at 1400×900 and 2× shows the tile memory: 85 MB at 12 mirrors and 1 layer, and 319 MB at 32 mirrors and 4 layers in the earlier version. Two changes bring that down:

- The loose beads (`i::after`) sit on a box only as big as they need, 48% of the old side, so about a quarter of the area. Their gradients use absolute radii in `--r`, and their keyframe offsets are scaled up to match, so the look and motion don't change. Extra glass layers are only these beads. This brings tile memory to 65 MB at 12/1 and 180 MB at 32/4.
- The mirror maximum is 24, which brings the worst case (24/4) to 145 MB.

A rectangular `overflow: clip` on each wedge does not reduce raster memory (checked with the same dump), so the wedges keep `clip-path` alone.

While the Controls sheet is open on a window at least 48rem wide, the panel sets `data-sheet-open` on `<html>`. The scene pads the stage by the sheet's width and caps the eyepiece to the room left (`--room`), so the sheet never sits over the glass. That also spares its `backdrop-filter` blur from re-reading every layer each frame. The glow behind the eyepiece uses `background-origin: content-box`, so it stays centred on the eyepiece.

## Performance notes

| raw | gzip | brotli | budget | ok |
|---|---|---|---|---|
| 15,355 B | 5,222 B | 4,468 B | 14,336 B | yes |

All motion is `transform` or `opacity`. The costliest part is 36 clipped, composited glass layers plus one blend per wedge. An earlier requestAnimationFrame sample in Chrome, with the barrel scroll-driven, held 61 fps; the extra `translate` animations are compositor-only too, but the endless version has not been re-measured. Lighthouse and dropped-frame stats are not measured yet (TODO: `pnpm measure` once it exists).

The eyepiece is capped at `min(84vmin, 42rem)` (672px) rather than filling the window, which keeps every wedge's layer small.

## Accessibility

- `prefers-reduced-motion: reduce` stops every animation and shows the glass at its resting angles. Checked with headless Chrome `--force-prefers-reduced-motion`.
- The barrel and glass are `aria-hidden`; the stage's `aria-label` describes the view.
- There is no text in the scene.

## Reuse

Uses `lib/stage`. Candidate snippet: the mirrored-wedge rig. Anything placed inside `.scope i` becomes kaleidoscopic.
