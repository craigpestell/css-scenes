---
title: Rainy Alley
slug: rainy-alley
---
## The idea

You are standing at the mouth of a narrow brick alley at night, in the rain. Two street lights stand at the intersection at the far end, and cars cross it in both directions, braking as they pass. Lit and blacked-out windows line both walls, a pink BAR sign and a cyan neon ring hang on them, and the wet asphalt mirrors everything as long, wavering streaks broken up by moving water. Rain falls in three layers at slightly different angles, rings open in the puddles, and the BAR sign stutters every few seconds, as does its reflection. The scene is one HTML file and one CSS file, with no JavaScript and no raster images.

The Controls tab has two kinds of control. The first five change the weather and the reflection. The ones marked "Performance" turn the costly effects up, down or off (with switches for the on/off ones), so you can watch the frame rate in the Stats tab and see which CSS the GPU is paying for.

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
  filter: blur(calc(var(--blur) * 1vmin)) saturate(1.4);
}
```

The `.glow` box ends exactly at the far ground line (51.4% down the stage), so a negative `scale` about its bottom edge flips it onto the ground. A stretch greater than 1 pulls each light into the long vertical streak you see on a real wet road. Because both elements read the same property, adding or moving a light in `--lights` moves its reflection too. There is nothing to keep in sync.

The neon signs come along because they are `::before` and `::after` of `.glow`, so the same rules draw them on both elements. So do the cars (below), which are the same markup inside both elements. That includes the flicker animation: the sign and its reflection run the same `flicker` keyframes from the same start time, so they stutter together. The text is mirrored in the puddle, as it should be.

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
  /* the floor plane below is seen from the same eye as the walls */
  perspective: 100vmin;
  perspective-origin: 50% 36%;
}
```

The mask and clip sit on the parent, not on the transformed `.reflect`, so they stay in stage coordinates instead of being flipped and stretched. Over the reflection, the `.floor` plane (below) adds moving, broken streaks, which is what makes the reflection waver. `mask-image` is widely available (2023-12-07).

### Perspective windows inside the light layer

A lit window on a side wall is a quadrilateral that points at the vanishing point, which a gradient can't draw. So the lit windows are paths in a small SVG, generated from the vanishing point, and that SVG is one more layer of `--lights`, as a data URI with `viewBox='0 0 100 51.4' preserveAspectRatio='none'` sized `100% 100%`. Its coordinates are the stage's own, so the windows land on the walls, and they reflect like every other light. The blacked-out windows, the light poles and the fire escape are dark, so they don't need reflections. They live in plain inline SVGs over the walls, and the fire escape's SVG sits after `.lights` so its railings cross in front of the window behind it.

Trade-off: anything below the mirror line (51.4%) can't be in `--lights`, so the lowest edge of a near ground-floor window is cut off at that line.

### Cars in both copies

Each car is a full-stage element moved with `translate`. Its body, lights and brake light are pseudo-elements and a `b` placed at the alley mouth, and `.cars` clips everything to the 38–62% opening, so a car appears from behind one wall and disappears behind the other. The markup sits inside both `.glow` elements, so the headlight, its beam on the road and the brake light all get a reflection that moves in step:

```css
.cars { inset: 0; clip-path: inset(0 38%); }
```

```css
@keyframes drive {
  0% { translate: 0; animation-timing-function: cubic-bezier(0.2, 0.6, 0.8, 0.4); } /* slows at the alley */
  34%, 100% { translate: var(--dx); }
}
```

The easing curve is steep at both ends and flat in the middle, so the car slows as it passes the alley, and the `brake` keyframes light the brake light over the same stretch. Each car's size and travel come from a few custom properties: `--w` (body length, 10.5% of the stage), and from it `--x0` (a start just hidden behind the left wall) and `--dx` (a travel distance that ends just hidden behind the right wall). Cars going left to right use the near lane. The other lane is the same car flipped with `scale: -1 1`, made shorter (`--w: 9%`), placed a little higher and farther, drawn behind the near lane (`z-index: -1`), and run on a 15s cycle against 12s, so the two rarely meet.

### A water plane at the alley's vanishing point

The water streaks are not drawn in screen space. `.wet` gets `perspective` with its origin at the vanishing point (50% 36%), and `.floor` is a real plane laid flat with `rotate: x 90deg`, starting at the far ground line:

```css
.floor {
  inset: 51.4% 38% auto;
  block-size: 80vmin;
  transform-origin: 50% 0;
  rotate: x 90deg;
  overflow: clip;
}
```

Because the perspective origin is the same vanishing point the walls use, the plane lines up with the alley: 24% wide at the far end, it widens to the full screen at the bottom. Its child `i` carries an SVG tile of broken, wavy dark streaks with a few faint glints, and moves one tile toward the viewer every 2.4s. On screen the streaks come out thin and crowded near the far end and wider and sparser near you, and that perspective is what keeps the road from looking flat. The animation is still a 2D `translate` inside the rotated plane, so it stays on the compositor. 3D transforms are widely available.

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

The mortar lines get wider away from the vanishing point, which reads as depth. Trade-off: on narrow screens the courses squeeze together and alias into moiré swirls, so below 600px `--course` doubles to 2.2deg. The window, pole and fire-escape SVGs use the same stage coordinates (`viewBox="0 0 100 100"`, `preserveAspectRatio="none"`, `vector-effect: non-scaling-stroke`), with every course computed toward the same vanishing point.

### Rain layers from one rule

Every rain layer is an `i` in `.rain`, and one rule derives everything about it from its depth, `--z` (its index, capped at 4): tile height, streak size, opacity, speed and angle. Nearer layers have longer streaks, move faster and lean further with the wind:

```css
.rain i {
  --z: min(var(--i), 4);
  inset: -60%; /* overscan, so a tilted layer still covers a portrait phone */
  rotate: calc(var(--tilt) + (var(--z) - 2) * var(--spread));
}
```

```css
.rain i::before {
  --h: calc(14vmin + var(--z) * 9vmin);
  --w: calc((2vmin + var(--z) * 4vmin) / var(--density));
```

Each layer's streaks are tiles of thin `radial-gradient` ellipses, and every tile in a layer is `--h` tall. The layer moves down exactly `--h` per loop (`@keyframes fall { to { translate: 0 var(--h); } }`), so the last frame matches the first. "Rain amount" only narrows the tiles (`--w`), and "Rain speed" only shortens the duration, so neither can break the loop. Because nothing is written per layer, the "Performance: rain layers" control can add layers up to eight. Layers past the fourth keep the nearest style, with their tiles offset by `--i` and a slightly different speed, so they don't line up into rows. The rotation goes on the `i` and the fall on its `::before`, because `translate` applies before `rotate`, so a rotated element can't fall along its own tilt.

### Ripples placed by sin() and cos()

The eight ripple rings have no positions in the markup. Each ring's index goes through `sin()` and `cos()`, which scatters the rings over the ground. Rings nearer the viewer (lower on screen) come out wider:

```css
.ripples i {
  --r: var(--i);
  left: calc(50% + sin(var(--r) * 2.4rad) * 17%);
  top: calc(73% + cos(var(--r) * 1.9rad) * 11%);
  inline-size: calc(6vmin + cos(var(--r) * 1.9rad) * 2.4vmin);
```

```css
@supports (order: sibling-index()) {
  .ripples i { --r: sibling-index(); }
}
```

Where `sibling-index()` is supported it replaces the inline `--i`, so you can add a ring without numbering it. The index is called `--r`, not `--n`, because the Controls' count slider writes `--n` (the total) on every element it clones. Trig functions are widely available; `sibling-index()` is newly available (2026-08-18), with the inline `--i` as the fallback.

### Performance switches

"Off" should mean `display: none` or `filter: none`, not a zero value that still allocates a layer or a filter pass. Each Controls switch adds or removes a boolean `data-` attribute on `.stage`. All of them are in the markup, so the scene starts fully on, and `:not()` turns an effect off when its attribute is gone:

```css
.stage:not([data-reflection]) .reflect { display: none; }
.stage:not([data-blur]) .reflect { filter: none; }
.stage:not([data-masks]) .wet { mask-image: none; }
.stage:not([data-water]) .floor { display: none; }
```

Plain attribute selectors work in every browser. Rain layers and ripples use the panel's count control instead, which clones or removes elements, and the blur amount is an ordinary slider.

How to use it: open Stats and watch the fps while you switch things off one at a time. The likely suspects are the reflection blur (a filter on a large, stretched layer), the rain layers (each larger than the viewport), and the masked, perspective-transformed water plane.

## Performance notes

| raw | gzip | brotli | budget | ok |
|---|---|---|---|---|
| 23,595 B | 8,277 B | 7,064 B | 14,336 B | yes |

Every animation changes only `translate`, `scale` or `opacity`, so it can run on the compositor. The blur on `.reflect` is static, so it is painted once, until a car moves inside it: the cars and their lights animate inside the blurred, masked reflection, so that layer is re-filtered while a car is crossing. The rain layers are the other big cost, since each is larger than the viewport and promoted to its own layer. In a headless software-rendering check the scene ran at about 10 fps with the default settings, 6 fps with every performance control at maximum, 44 fps with them all off, and 60 fps under reduced motion. For comparison, ramen-counter ran at 46 fps in the same check. Software rendering doesn't predict GPU frame times, and real-hardware numbers are not yet measured; the Performance controls are there to find out (TODO: run `perf-triage` on a real device).

## Accessibility

- Under `prefers-reduced-motion: reduce` the rain, water and flicker stop, and the ripples hold as faint mid-size rings. One car waits at the alley mouth with its brake light on, and the other lane is empty. The frame still reads as a wet alley with reflections.
- The flicker is two quick dips in a 7s loop, well under three flashes per second, on a small part of the screen.
- Every layer is `aria-hidden`, and the stage's `aria-label` describes the scene. The scene has no text to read; the BAR lettering is decorative.

## Known limitations

- Checked only in headless Chromium (desktop and a 390px phone, light and dark, with reduced motion), not in Safari or Firefox.
- On phones, most of the BAR reflection falls below the bottom edge.

## Reuse

- `stage` (library): the contained scene root. The scene adds `.stage *, .stage ::before, .stage ::after { position: absolute; }` because its pseudo-elements are placed too.
- Candidate snippets: the custom-property reflection rig (`.glow` + `.reflect`: any light layout gets a matching wet reflection), the period-locked rain layer driven by one depth variable, and the vanishing-point water plane. None has been extracted to `packages/lib` yet.
- Scene colours are local `light-dark()` custom properties, the same accepted exception as earlier scenes (recorded in `meta.json`).
