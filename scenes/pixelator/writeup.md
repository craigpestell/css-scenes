---
title: Pixelator
slug: pixelator
---
## The idea

A photo of Michelangelo's David hangs in a frame. A sheet of small square tiles lies over it. Halve merges the tiles into blocks twice as wide, which leaves a quarter as many pixels, and Double splits them again. Left alone, the scene steps through the halvings on a loop. Moving the pointer over the picture wipes the tiles away. A button swaps in a photo of your own.

CSS has no "average this region" and no way to read a pixel. `image-rendering: pixelated` only helps when the source is already small. So the scene does the sampling with a background.

## Techniques

### Point sampling: a background magnified until one point is left

Every tile paints the whole photo as its background, at 10,000,000% of the tile's size. At that size one source pixel is hundreds of tiles wide, so whatever point of the photo sits inside the tile fills it with a single colour.

`background-position` chooses the point. A percentage position of `p` pins the image's point `p` to the box's point `p`, so `30% 60%` puts the photo's 30%/60% point inside the tile:

```css
.grid i {
  background: var(--photo) no-repeat
    calc((0.5 + (var(--u) - 0.5) * var(--fx)) * 100%)
    calc((0.5 + (var(--v) - 0.5) * var(--fy)) * 100%) / 10000000% 10000000%;
}
```

`--u` and `--v` are where the tile sits on the sheet, from 0 to 1. `--fx` and `--fy` shrink that range when the photo is cropped to fit the frame.

A smaller magnification shows why the number is so big. At 100,000% each tile carries a visible gradient, and a block of identical tiles shows it as stripes.

This is a point sample, not an average. A busy photo comes out grainier than it would from a real mosaic filter.

### Column and row from sibling-index()

The tiles are 3,600 empty `<i>` elements with no classes and no inline styles. Each one works out its place from its position among its siblings:

```css
.grid i {
  --x: mod(var(--i) - 1, var(--cols));
  --y: round(down, (var(--i) - 1) / var(--cols));
}
@supports (order: sibling-index()) {
  .grid i { --i: sibling-index(); }
}
```

Where `sibling-index()` is missing, the script writes `--i` on each tile and the same rules carry on.

### round() merges tiles into blocks

The block's side `--k` is counted in tiles. Rounding a tile's column and row down to a multiple of `--k` gives the corner of its block, and half a block more gives the middle. Every tile in a block gets the same answer, so they all show the same colour:

```css
--u: calc(min(round(down, var(--x), var(--k)) + var(--k) / 2, var(--cols) - 0.5) / var(--cols));
```

The `min()` keeps the last, cut-off block sampling from inside the photo. The markup never changes: 3,456 tiles are always there, and only the arithmetic makes them look like 54.

### Halving: each step keeps a quarter of the pixels

`--step` counts halvings, and the block's side doubles with each one:

```css
@property --step { syntax: "<integer>"; inherits: false; initial-value: 0; }

.grid {
  --step: var(--level);
  --k: round(pow(2, var(--step)), 1);
}
```

Doubling the side on both axes leaves a quarter as many pixels: David goes 3,456, 864, 216, 54, 15, 6. The last two aren't exact quarters because the blocks at the edges are cut off.

The loop animates `--step` from 0 to `--depth` and back. It is registered as an integer, so it moves in whole steps and the tiles repaint only when it changes. A second animation fades the sheet out at the ends of the loop, which is where the sharp photo shows.

### Halve and Double without a script

The step is held by six radio buttons in a form. `:has()` reads the checked one into `--level`:

```css
.stage:has(#s2:checked) { --level: 2; }
```

Each radio has a `<label>`. From step 2, the label for step 3 is shown with the word Halve and the label for step 1 with the word Double; the rest stay hidden. Clicking a label checks its radio, which is all a button would do:

```css
#s2:checked ~ label[for="s3"] { display: block; order: 3; }   /* Halve */
#s2:checked ~ label[for="s1"] { display: block; order: 1; }   /* Double */
```

While nothing is checked, the loop plays. The first press of Halve checks step 1 and the loop's selector, `.stage:not(:has(.steps :checked))`, stops matching. Play loop is a plain `<button type="reset">`: resetting the form unchecks every radio, and the loop starts again. The arrow keys move through the radios too.

### Counting pixels with counter()

The readout between the buttons is a CSS counter. A registered integer takes the arithmetic, and `counter-reset` turns it into text:

```css
.steps output {
  --count: calc(round(up, var(--cols) / pow(2, var(--level)), 1) * round(up, var(--rows) / pow(2, var(--level)), 1));
  counter-reset: pixels var(--count);
}
.steps output::after { content: counter(pixels) " pixels"; }
```

### The sheet takes the photo's shape

The script tells CSS one thing about an uploaded photo: its aspect ratio, `--ar`. CSS turns that into columns and rows that keep the tiles square and their number close to `--cells`:

```css
--shape: clamp(0.34, var(--ar), 3);
--cols: round(sqrt(var(--cells) * var(--shape)), 1);
--rows: round(var(--cols) / var(--shape), 1);
```

David is 2:3, which gives 48 by 72. A 4:3 photo gets 68 by 51. Tiles left over land in rows below the frame and are clipped. The tile's side is rounded down to a whole pixel, so tiles meet without seams:

```css
--tile: max(2px, round(down, min((100cqw - 2rem) / var(--cols), (100cqh - var(--below)) / var(--rows)), 1px));
```

### The wipe

```css
.grid i { transition: opacity var(--t-slow) 0.3s; }
.grid i:hover { opacity: 0; transition: none; }
```

The transition is declared only on the way back. A tile under the pointer clears at once and fades in again after the pointer has left, so a stroke leaves a trail of sharp photo.

### Your own photo

The script is the one thing CSS can't do here. It makes an object URL for the file you pick, drop or paste, waits for it to decode, and sets two custom properties on the stage:

```js
stage.style.setProperty('--photo', `url("${next}")`);
stage.style.setProperty('--ar', (img.naturalWidth / img.naturalHeight || 1).toFixed(4));
```

The photo is read in place. Nothing is uploaded.

## Fallbacks

- No `sibling-index()`: the script supplies `--i`.
- No `round()` or `mod()`, or no script and no `sibling-index()`: the tile sheet stays hidden and the frame shows the photo.
- Reduced motion: no loop. The finest tiles show until a step is picked, and the wipe works without its fade.

## Numbers

- Page: 5.8 KiB Brotli of a 14 KiB budget (HTML, CSS and script).
- Default photo: 94 KB JPEG, loaded as a separate file.
- In software rendering, about one tile in 150 shows a faint two-tone split, because the renderer's interpolation is coarse at this magnification. A GPU should interpolate more finely; that is not checked yet.
- 3,600 tile elements. A step restyles all of them, which took about 0.2 s in the headless cloud browser used to build this (software rendering, slow CPU). It has not been measured on a real machine yet.

## Credit

The default photo is "Michelangelo's David, Florence 2019" by George M. Groutas, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/), from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Michelangelo%E2%80%99s_David,_Florence_2019_-_48170169936.jpg), resized to 800×1200.
