---
title: Liftoff
slug: liftoff
---
## The idea

Scroll down and a rocket launches. The countdown ticks from T−10, smoke billows off the pad, the ground drops away, clouds rush past, the booster separates and tumbles, and the upper stage lights its own engine as the sky turns to stars. No JavaScript: the scrollbar is the timeline.

## Techniques

### One keyframe script, two timelines

Every choreographed layer uses the same 0–100% script, written into keyframe percentages (0–12% countdown and ignition, 12–45% liftoff, 58–64% staging, 55–90% night falls). By default each layer runs it on a time loop:

```css
.booster {
  inset: 45% 0 0;
  border-radius: 0 0 0.6vmin 0.6vmin;
  background: linear-gradient(#0000 8%, var(--c-accent) 0 13%, #0000 0), var(--hull-grad);
  animation: separate var(--loop) linear infinite both;
}
@keyframes separate {
  0%, 58% { translate: 0 0; rotate: 0deg; opacity: 1; }
  80%, 100% { translate: -8vmin 70dvh; rotate: -35deg; opacity: 0; }
}
```

Where scroll timelines exist, one block swaps the clock for the scrollbar and makes the page scrollable:

```css
@supports (animation-timeline: scroll()) {
  body { overflow: auto; }
  .runway { display: block; block-size: 600dvh; }
  .hint { display: block; }
  .sky, .stars, .clouds i, .ground, .smoke i, .rocket, .booster, .hud, .hint {
    animation-duration: auto;
    animation-iteration-count: 1;
    animation-timeline: scroll(root);
  }
}
```

Trade-off: putting the script in keyframe percentages instead of `animation-range` means the fallback needs no second set of numbers. The cost is that each layer's keyframes hold its own hold-frames (`0%, 58%`), which is a little more verbose than ranges. The `animation-timeline` longhand has to come after the `animation` shorthand, because the shorthand resets it.

### Mixing a scroll timeline and a time timeline on one element

The flames grow with scroll but flicker on a clock. Animations are lists, so each one gets its own timeline:

```css
.flame {
  inset: 100% 10% auto;
  block-size: 18vmin;
  animation: ignite var(--loop) linear infinite both, flicker 90ms linear infinite alternate;
}
@supports (animation-timeline: scroll()) {
  .flame, .engine {
    animation-duration: auto, 90ms;
    animation-iteration-count: 1, infinite;
    animation-timeline: scroll(root), auto;
  }
}
@keyframes ignite { 0%, 5% { scale: 1 0; } 12%, 57% { scale: 1 1; } 59%, 100% { scale: 1 0; } }
@keyframes flicker { to { transform: scale(1.06, 0.86); } }
```

`ignite` animates the `scale` property and `flicker` animates `transform`. Individual transform properties compose with `transform`, so the two never fight.

### A countdown and altimeter from typed integers

```css
@property --t { syntax: "<integer>"; inherits: false; initial-value: 10; }
@property --alt { syntax: "<integer>"; inherits: false; initial-value: 0; }
.hud {
  inset: 4vmin auto auto 4vmin;
  padding: 0.4em 0.8em;
  border-radius: 0.5em;
  background: #000a; /* keeps white text above 4.5:1 on every sky state */
  counter-reset: t var(--t) alt var(--alt);
  animation: telemetry var(--loop) linear infinite both; /* paint-ok: counter text changes; tiny box */
}
.hud::before { content: "T\2212 " counter(t, decimal-leading-zero); display: block; }
.hud::after { content: "ALT " counter(alt) " KM"; display: block; }
@keyframes telemetry {
  0% { --t: 10; --alt: 0; }
  12% { --t: 0; --alt: 0; }
  100% { --t: 0; --alt: 420; }
}
```

Registered integers interpolate and round, so scrolling counts. The HUD is `aria-hidden`; the stage's `aria-label` describes the scene. A translucent black backing keeps the white text readable on the pale day sky as well as in space.

### shape() nose cone with a polygon fallback

```css
clip-path: polygon(50% 0, 85% 25%, 100% 45%, 100% 100%, 0 100%, 0 45%, 15% 25%);
clip-path: shape(from 50% 0%, curve to 100% 45% with 100% 12%, vline to 100%, hline to 0%, vline to 45%, curve to 50% 0% with 0% 12%, close);
```

A browser without `shape()` drops the second line and keeps the faceted polygon.

### sibling-index() smoke spread

Each puff drifts sideways by `--dx`. Because a custom property accepts anything at parse time, the `sibling-index()` version sits behind `@supports (order: sibling-index())`, with inline `--i` as the fallback.

## Performance notes

| raw | gzip | brotli | budget | ok |
|---|---|---|---|---|
| 9,140 B | 3,210 B | 2,788 B | 14,336 B | yes |

Every animated property is `translate`, `rotate`, `scale`, `transform` or `opacity`, apart from the HUD integers. Those change text, so each counter step costs a small layout and paint in the HUD box. The clouds have a static `filter: blur()` and only move, so they rasterise once. The sky is a 400%-tall gradient layer that is translated rather than having its `background-position` animated. Frame times and layer counts are not measured yet.

## Accessibility

- `prefers-reduced-motion: reduce` turns every animation off, hides the runway so the page doesn't scroll, and shows the composed on-pad frame at T−10 (checked in a headless Chromium screenshot).
- Scroll-driven motion is user-controlled, but the cloud parallax is large, which is why reduced motion also stops the scroll version.
- The "Scroll to launch" hint only appears where scrolling actually does something.

## Known limitations

- After liftoff the clock holds at T−00 rather than counting up as T+.
- On landscape screens the rocket rises only a little before the camera "follows" it. The sense of lift comes mostly from the ground falling away.
- Checked only in headless Chromium (desktop 1280×800 and phone 390×844), not in Safari or Firefox.

## Reuse

- `stage` (library): the contained scene root. The page gets a 600dvh `.runway` sibling so the root can scroll behind the fixed stage.
- Candidate snippets: `two-timelines` (time-based keyframes upgraded to `scroll(root)` in one `@supports` block) and `typed-counter` (an `@property` integer feeding `counter()`). Neither has been extracted to `packages/lib` yet.
- Colours are local custom properties apart from `--c-accent`. Nothing was added to `tokens.json`. This departs from the repo rule, and the user accepted it as an exception on 2026-10-03 (recorded in `meta.json`).
