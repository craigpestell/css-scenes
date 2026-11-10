---
title: Pixelator
slug: pixelator
---
## The idea

A photo of Michelangelo's David stands behind a wall of glass blocks. Each block is a small lens: it squeezes a wider view of the statue into itself, so the figure breaks up and repeats from block to block the way it does through real glass brick. A Lens slider takes the blocks from that wide view, through clear glass, through magnifying, to flat pixels. A second slider sets how big the blocks are. Pointing at a block presses it flat, and a button swaps in a photo of your own.

Every block is a real element, so anything CSS can do to a box (shadows, rounding, tilt, blur, hover) can be done per block.

## How others do it

- **SVG filter pixelators** (`feFlood`, `feTile`, `feMorphology`) work on one image with no script, but there are no blocks to style and the output differs between browsers.
- **Canvas and WebGL shaders** are the usual choice on production sites. They are all script, and again have no elements for CSS to reach.
- **"Liquid glass"** refraction puts an SVG displacement map in `backdrop-filter`. It bends the backdrop for real, but only Chromium supports SVG filters there.
- **A background copy per element**, sized and shifted, is plain CSS and works everywhere. This scene uses that.

## Techniques

### One background copy per block, lined up with the photo

`.photo` shows the photo once. Each block in `.grid` paints the same photo again as its own background. `--sx` is the copy's width measured in blocks:

```css
.grid i {
  --mag: pow(var(--m), 1 - var(--press));
  --sx: min(var(--cols) * var(--mag) / var(--fx), 100000);
}
```

At a magnification of 1, the copy is as wide as the wall (`--cols` blocks), exactly like the photo behind. `--fx` allows for a photo cropped to fit the frame.

`--u` is the point of the photo behind the block's middle. A `background-position` of `p%` puts the copy's left edge `p%` of the way across the room left over, which is `(1 - sx)` blocks, so solving for the `p` that lands `u` on the middle gives:

```css
background-position: calc((0.5 - var(--u) * var(--sx)) / (1 - var(--sx)) * 100%) …;
background-size: calc(var(--sx) * 100%) calc(var(--sy) * 100%);
```

With `--m` at 1 the wall is invisible: every block shows exactly what is behind it.

### The magnification is the lens

Only `--m` changes between the looks:

- **Below 1** the copy is smaller than the photo, so each block holds a wider view than its own patch of wall. Neighbouring blocks overlap in what they show, which is the repeated, broken-up figure of glass brick.
- **1** is clear glass.
- **Above 1** each block magnifies its middle.
- **At 100,000** one point of the photo fills the block: a flat colour, a pixel. This is a point sample, not an average, so busy photos look grainier than a true mosaic.

The Lens slider runs 0 to 1 and is squared on the way to an exponent, so most of its travel is spent near 1 where the looks change fastest:

```css
--m: pow(10, 5.5 * var(--lens) * var(--lens) - 0.5);
```

A wide view near the wall's edge would run off the photo, so `--u` is clamped to keep the view inside it:

```css
--u: clamp(0.5 - var(--fx) / 2 + 0.5 / var(--sx), …, 0.5 + var(--fx) / 2 - 0.5 / var(--sx));
```

### Column and row from sibling-index()

The blocks are empty `<i>` elements with no classes and no inline styles. Each works out its place from its position among its siblings:

```css
.grid i {
  --x: mod(var(--i) - 1, var(--cols));
  --y: round(down, (var(--i) - 1) / var(--cols));
}
@supports (order: sibling-index()) {
  .grid i { --i: sibling-index(); }
}
```

### Registered properties keep the arithmetic cheap

An unregistered custom property is pasted as text wherever it is used. `--u` uses `--sx` twice, and the background uses both several times, so the formula for one block grew to pages. Registering the per-block numbers makes the browser work each out once:

```css
@property --sx { syntax: "<number>"; inherits: false; initial-value: 1; }
@property --u { syntax: "<number>"; inherits: false; initial-value: 0; }
```

In the headless browser used to build this, a move of the Lens slider went from about 1.7 s of style work to 0.65 s with the properties registered (both with 3,600 blocks in the page).

### The glass

The Glass blocks checkbox is read with `:has()`, with no script. It rounds the blocks, shrinks them a little to show mortar, and adds a bevel of inset shadows and a sheen as a second background layer. The bevel is sized from the block, so it scales with the Block size slider:

```css
.stage:has(#glass:checked) .grid i {
  --edge: calc(var(--tile) * 0.07);
  scale: 0.94;
  border-radius: 14%;
  box-shadow:
    inset 0 0 0 1px #fff6,
    inset var(--edge) var(--edge) calc(var(--edge) * 2) #fff8,
    inset calc(var(--edge) * -1) calc(var(--edge) * -1) calc(var(--edge) * 2.4) #0008,
    inset 0 0 calc(var(--edge) * 4) #fff3;
}
```

### Press a block flat

```css
@property --press { syntax: "<number>"; inherits: false; initial-value: 0; }

.grid i { transition: --press var(--t-slow) 0.3s; }
.grid i:hover { --press: 1; transition: none; }
```

`--press` takes the block's magnification to 1 through `pow(var(--m), 1 - var(--press))`. The transition is declared only on the way back, so a block under the pointer goes clear at once and eases back to its lens after the pointer has left. Transitioning `--m` itself was a mistake worth recording: it is inherited, so every block started its own transition each time the slider moved.

### The wall takes the photo's shape

The script tells CSS a photo's aspect ratio, `--ar`. CSS turns that and the Block size slider into columns and rows that keep the blocks square:

```css
--cells: calc(3456 * pow(144, -1 * var(--block)));
--cols: round(sqrt(var(--cells) * var(--shape)), 1);
--rows: round(var(--cols) / var(--shape), 1);
```

A block's side is rounded down to a whole pixel, so blocks meet without seams. The count beside the slider is a CSS counter fed by a registered integer:

```css
.dials output { --count: calc(var(--cols) * var(--rows)); counter-reset: blocks var(--count); }
.dials output::after { content: counter(blocks) " blocks"; }
```

### What the script does

Three things CSS can't:

- It copies each slider's value into the custom property the slider names.
- It keeps the number of `<i>` elements equal to `--cols` times `--rows`, read back from the computed style, so the browser never styles blocks nobody can see. With 216 blocks instead of 3,600 in the page, a Lens move dropped from 0.65 s to about 0.06 s in the same headless browser.
- It points `--photo` at a photo you pick, drop or paste, and sets `--ar`. The photo is read in place; nothing is uploaded.

## Fallbacks

- No `sibling-index()`: the script writes `--i` on each block.
- No `round()`, `mod()`, `sqrt()` or `pow()`, or no script and no `sibling-index()`: the wall stays hidden and the frame shows the photo.
- No script: the default wall of 216 glass blocks, and the Glass blocks checkbox still works; the sliders and the photo button stay hidden.
- Reduced motion: a pressed block snaps back instead of easing. Nothing else moves.

## Numbers

- Page: 6.0 KiB Brotli of a 14 KiB budget (HTML, CSS and script).
- Default photo: 94 KB JPEG, loaded as a separate file.
- Timings above are from a headless cloud browser with software rendering. Nothing has been measured on a real machine, in Safari or in Firefox yet. Dragging Block size to its finest end builds 3,456 blocks and was slow there (about 3 s).

## Credit

The default photo is "Michelangelo's David, Florence 2019" by George M. Groutas, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/), from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Michelangelo%E2%80%99s_David,_Florence_2019_-_48170169936.jpg), resized to 800×1200.
