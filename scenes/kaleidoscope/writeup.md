---
title: Kaleidoscope
slug: kaleidoscope
---
## The idea

You look down the eyepiece of a brass kaleidoscope. Twelve fixed mirror slices fold the glass beads, rings and shards in the object cell into a six-fold pattern. Scrolling turns the barrel: the cell turns, the loose glass inside tumbles, and the pattern changes. Nothing moves until you scroll, and scrolling back turns it back. In dark mode the glass glows like jewels under a lamp; in light mode it filters daylight like stained glass. No JavaScript, no images, no web fonts.

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
  animation: cell 90s linear infinite;
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

The brass ring is a `.tube::before` that runs the same `cell` keyframes, so its highlights turn with the barrel. The eyepiece glint on `.tube::after` stays put.

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

### scroll(root) barrel turn with longhand-only timeline

With scroll timelines, scrolling the 800dvh runway turns the barrel one full turn and runs every glass layer through its keyframes once. At the top of the page everything is at rest, and nothing moves without input. Without scroll timelines (Firefox) the same keyframes run on time, one turn every 90s.

```css
@supports (animation-timeline: scroll()) {
  .tube::before, .scope i, .scope i::before, .scope i::after {
    animation-duration: auto;
    animation-iteration-count: 1;
    animation-fill-mode: both;
    animation-timeline: scroll(root);
  }
}
```

The longhands keep each layer's own `animation-name` and timing function from the base rules and only swap the clock.

A build gotcha: written as `animation: turn linear both; animation-timeline: scroll(root);`, Lightning CSS merged the two into `animation: linear both turn scroll(root)`. `animation-timeline` is reset-only in the shorthand, so Chrome dropped the whole declaration and the animation silently went back to the time loop. Setting longhands only avoids the merge.

## Performance notes

| raw | gzip | brotli | budget | ok |
|---|---|---|---|---|
| 9,171 B | 3,117 B | 2,691 B | 14,336 B | yes |

All motion is `transform` or `opacity`. The costliest part is 36 clipped, composited glass layers plus one blend per wedge. A requestAnimationFrame sample in Chrome on the dev machine, scrolling the whole runway in 3s, held 61 fps with no frames over 25 ms. Lighthouse and dropped-frame stats are not measured yet (TODO: `pnpm measure` once it exists).

The eyepiece is capped at `min(88vmin, 62rem)` rather than filling the window, which keeps every wedge's layer small.

## Accessibility

- `prefers-reduced-motion: reduce` stops every animation and shows the glass at its resting angles, with no hint and no scrolling. Checked with headless Chrome `--force-prefers-reduced-motion`.
- The barrel and glass are `aria-hidden`; the stage's `aria-label` describes the view.
- The only text is the scroll hint, at 70% ink on paper in both schemes.

## Reuse

Uses `lib/stage`. Candidate snippet: the mirrored-wedge rig. Anything placed inside `.scope i` becomes kaleidoscopic.
