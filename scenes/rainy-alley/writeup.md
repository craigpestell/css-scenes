---
title: Rainy Alley
slug: rainy-alley
---
## The idea

You are standing at the mouth of a narrow brick alley at night, in the rain. A sodium lamp and a few lit windows glow at the far end, a pink BAR sign and a cyan neon ring hang on the walls, and the wet asphalt mirrors all of it as long, wavering streaks. Rain falls in two layers, rings open in the puddles, and the BAR sign stutters every few seconds. The reflection stutters with it. The scene is one HTML file and one CSS file, with no JavaScript and no images.

## Techniques

### One background, painted twice

The reflection is not a copy of anything. Every light in the scene, from the lamp halos to the lit windows, is one background stack stored in a custom property, `--lights`, on `.stage`. Two elements share the class `.glow`, and both paint it:

```css
.glow {
  inset: 0 0 48.6%;
  background: var(--lights);
}
.reflect {
  transform-origin: 50% 100%;
  scale: 1 calc(var(--stretch) * -1);
  filter: blur(0.4vmin) saturate(1.4);
}
```

The `.glow` box ends exactly at the far ground line (51.4% down the stage), so a negative `scale` about its bottom edge flips it onto the ground. A stretch greater than 1 pulls each light into the long vertical streak you see on a real wet road. Because both elements read the same property, adding or moving a light in `--lights` moves its reflection too. There is nothing to keep in sync.

The neon signs come along because they are `::before` and `::after` of `.glow`, so the same rules draw them on both elements. That includes the flicker animation: the sign and its reflection run the same `flicker` keyframes from the same start time, so they stutter together. The text is mirrored in the puddle, as it should be.

Why not `-webkit-box-reflect` or `element()`? The first isn't in Firefox, and the second is only in Firefox. Custom properties and individual transforms are widely available.

Trade-off: physically, a light reflects about the point where it meets the ground, not about one shared line. Using the far ground line as the mirror is right for things at the far end and only approximate for things on the near walls. The "Reflection stretch" control (`--stretch`) lets you tune how far the near reflections reach.

### Masks for where the ground is wet

`.wet` holds the reflection. Its `clip-path` keeps it inside the ground's trapezoid, and a stack of radial masks decides how wet each part is: puddles reflect fully, and the rest of the asphalt gets a sheen that fades toward the viewer.

```css
.wet {
  inset: 0;
  clip-path: polygon(38% 51.4%, 62% 51.4%, 100% 100%, 0 100%);
  mask-image:
    radial-gradient(ellipse 22% 6% at 45% 69%, #000 45%, #0000),
    radial-gradient(ellipse 12% 3% at 57% 58%, #000 35%, #0000),
    radial-gradient(ellipse 28% 8% at 38% 90%, #000 45%, #0000),
    radial-gradient(ellipse 16% 5% at 72% 82%, #000 40%, #0000),
    linear-gradient(#000 52%, #0007 62%, #0004);
}
```

The mask and clip sit on the parent, not on the transformed `.reflect`, so they stay in stage coordinates instead of being flipped and stretched. Over the reflection, `.shimmer` slides a stack of thin dark bands down by one period every 6s, which is what makes the streaks waver. `mask-image` is widely available (2023-12-07).

### Perspective bricks from one conic gradient

On a wall seen in perspective, the mortar courses all point at the vanishing point. A `repeating-conic-gradient` centred on that point draws exactly that, and each wall's `clip-path` cuts it to shape:

```css
.alley::before, .alley::after {
  content: "";
  inset: 0;
  background:
    linear-gradient(var(--dir), #000a, #0000 30%),
    repeating-conic-gradient(from 0deg at 50% 36%, var(--wall) 0 var(--course), var(--mortar) 0 calc(var(--course) + 0.2deg));
}
```

The mortar lines get wider away from the vanishing point, which reads as depth. Trade-off: on narrow screens the courses squeeze together and alias into moiré swirls, so below 600px `--course` doubles to 2.2deg. The fire escape is a small inline SVG in the same stage coordinates (`viewBox="0 0 100 100"`, `preserveAspectRatio="none"`, `vector-effect: non-scaling-stroke`). Its rails were computed to run toward the same vanishing point.

### Period-locked rain tiles

Each rain layer is a pseudo-element covered with tiles of tiny, thin `radial-gradient` ellipses. Every gradient in a layer has the same tile height, `--h`, and the layer moves down by exactly `--h` per loop, so the last frame matches the first:

```css
.rain::before, .rain::after {
  content: "";
  inset: calc(var(--h) * -1) 0 0;
  animation: fall var(--d) linear infinite;
}
@keyframes fall { to { translate: 0 var(--h); } }
```

Tile widths of 5, 7 and 11vmin (far layer) and 13 and 19vmin (near layer) don't share small common multiples, so the streaks don't line up into a visible grid. The near layer has longer streaks and moves 40vmin in 0.45s against the far layer's 24vmin in 0.9s, which gives parallax. The whole `.rain` box is rotated by `--tilt` (the "Rain angle" control) and overscanned by 36%, enough for a 20deg tilt on a portrait phone.

### Ripples placed by sin() and cos()

The eight ripple rings have no positions in the markup. Each ring's index goes through `sin()` and `cos()`, which scatters the rings over the ground. Rings nearer the viewer (lower on screen) come out wider:

```css
.ripples i {
  --n: var(--i);
  left: calc(50% + sin(var(--n) * 2.4rad) * 17%);
  top: calc(73% + cos(var(--n) * 1.9rad) * 11%);
  inline-size: calc(6vmin + cos(var(--n) * 1.9rad) * 2.4vmin);
```

```css
@supports (order: sibling-index()) {
  .ripples i { --n: sibling-index(); }
}
```

Where `sibling-index()` is supported it replaces the inline `--i`, so you can add a ring without numbering it. Trig functions are widely available; `sibling-index()` is newly available (2026-08-18), with the inline `--i` as the fallback.

## Performance notes

| raw | gzip | brotli | budget | ok |
|---|---|---|---|---|
| 15,137 B | 5,480 B | 4,716 B | 14,336 B | yes |

Every animation changes only `translate`, `scale` or `opacity`, so it can run on the compositor. The blur on `.reflect` is static and painted once. The largest costs are the two rain layers: each is bigger than the viewport and is promoted to its own layer. In a headless software-rendering check the scene ran at about 18 fps against ramen-counter's 46 fps, and stopping the rain raised it to about 30 fps. Software rendering doesn't predict GPU frame times, so real-hardware numbers are not yet measured (TODO: run `perf-triage` on a real device).

## Accessibility

- Under `prefers-reduced-motion: reduce` the rain, shimmer and flicker stop, and the ripples hold as faint mid-size rings. The frame still reads as a wet alley with reflections.
- The flicker is two quick dips in a 7s loop, well under three flashes per second, on a small part of the screen.
- Every layer is `aria-hidden`, and the stage's `aria-label` describes the scene. The scene has no text to read; the BAR lettering is decorative.

## Known limitations

- Checked only in headless Chromium (desktop and a 390px phone, light and dark, with reduced motion), not in Safari or Firefox.
- On phones, most of the BAR reflection falls below the bottom edge.

## Reuse

- `stage` (library): the contained scene root. The scene adds `.stage *, .stage ::before, .stage ::after { position: absolute; }` because its pseudo-elements are placed too.
- Candidate snippets: the custom-property reflection rig (`.glow` + `.reflect`: any light layout gets a matching wet reflection) and the period-locked rain layer. Neither has been extracted to `packages/lib` yet.
- Scene colours are local `light-dark()` custom properties, the same accepted exception as earlier scenes (recorded in `meta.json`).
