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
.grid { --sx: min(var(--cols) * var(--m) / var(--fx), 100000); }
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

The Lens slider, in the Controls panel, runs 0 to 100 and is squared on the way to an exponent, so most of its travel is spent near 1 where the looks change fastest:

```css
--m: pow(10, 5.5 * pow(var(--lens) / 100, 2) - 0.5);
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

### Keeping a slider move cheap

Every slider move restyles every block, so the cost per block decides how the scene feels. Four things brought a Lens move on the finest wall (3,456 blocks) from about 650 ms of style work to about 100 ms, and a Block size move from about 3.8 s to 0.3 s with Frosted on, in the headless browser used to build this:

- **Register the numbers.** An unregistered custom property is pasted as text wherever it is used, so a formula is worked out again at each use. `--tile` was the worst: its container-query formula was pasted into every length of every block's bevel.
- **Work shared numbers out once.** `--sx`, `--sy` and the limits `--lx` and `--ly` are the same for every block, so they are set on `.grid` and inherited. A block works out only its column, its row and the point `--u`, `--v` behind it.
- **One sheet for the glass.** The sheen and bevel were four inset shadows and a gradient on every block. They are now one pseudo-element over the wall, with a background pattern one block wide. Frosted is one `backdrop-filter` on the same sheet; a blur per block cost a compositing layer each, over a second of layer work on the finest wall.
- **Change the blocks before the restyle.** The script used to read `--cols` and `--rows` back from the computed style, which forced a restyle, then added blocks, which forced another. It now works the two numbers out itself.

The photo's file format is not part of this: the JPEG is decoded once (about 10 ms) and every block draws from the same decoded bitmap.

### The glass

The Glass blocks switch in the Controls panel sets a `data-glass` attribute on the stage, which the markup carries by default. Blocks are rounded and shrunk a little to show mortar. The sheen and bevel are a pattern on a sheet over the wall:

```css
[data-glass] .grid i { scale: 0.94; border-radius: 14%; }
[data-glass] .grid::after {
  background:
    linear-gradient(135deg, #fff4 3%, #fff0 38%, #0000 60%, #0002 97%),
    linear-gradient(#fff0 3%, #fff6 3%, #fff2 9%, #fff0 17%),
    /* and the left, bottom and right edges */;
  background-size: var(--tile) var(--tile);
}
```

### Press a block flat

```css
.grid i:hover {
  --sx: calc(var(--cols) / var(--fx));
  position: relative; z-index: 1;
}
.grid:hover i:not(:hover) { transition: --sx var(--t-slow) 0.3s, --sy var(--t-slow) 0.3s; }
```

A block under the pointer takes a magnification of 1 and lifts above the glass sheet. The ease back is declared only while the pointer is on the wall. `--sx` is inherited, and a transition declared all the time would start on every block each time a slider moved; that mistake cost about 3 s a move when first made.

### The wall takes the photo's shape

The script tells CSS a photo's aspect ratio, `--ar`. CSS turns that and the Block size slider into columns and rows that keep the blocks square:

```css
--cells: calc(3456 * pow(144, var(--block) / -100));
--cols: round(sqrt(var(--cells) * var(--shape)), 1);
--rows: round(var(--cols) / var(--shape), 1);
```

A block's side is rounded down to a whole pixel, so blocks meet without seams.

### Frosted

The Frosted switch sets `data-frost`, which adds a `backdrop-filter: blur()` to the glass sheet. The blur is sized from the block, so the frost keeps its look at every block size. It softens the mortar a little, which a blur per block did not, and costs one layer and not thousands. A pressed block sits above the sheet and is clear. Safari's own Liquid Glass is not available here: its only CSS hook, `-apple-visual-effect: -apple-system-glass-material`, is private and works in apps' web views, not in pages Safari loads.

```css
[data-frost] .grid::after {
  background-color: #fff2;
  backdrop-filter: blur(calc(var(--tile) * 0.07));
}
```

### The controls

Nothing sits on the stage but the wall and the photo credit. The sliders, the glass switch and the photo button are `params` in `meta.json`, drawn by the site's Controls panel, which writes `--block` and `--lens` onto the stage. The photo button is a new `file` param: the panel hands the chosen file to the scene's script in a `scene:photo` event. The panel's Playback section now shows only for scenes that animate, so it is absent here.

### What the script does

Two things CSS can't:

- It keeps the number of `<i>` elements equal to columns times rows whenever the stage's inline style changes, so the browser never styles blocks nobody can see. It works the two numbers out with the same formula as the CSS and sets `--cols` and `--rows`, so the two can't disagree.
- It points `--photo` at a photo you pick, drop or paste, and sets `--ar`. The photo is read in place; nothing is uploaded.

## Fallbacks

- No `sibling-index()`: the script writes `--i` on each block.
- No `round()`, `mod()`, `sqrt()` or `pow()`, or no script and no `sibling-index()`: the wall stays hidden and the frame shows the photo.
- No script: the default wall of 216 glass blocks, with no controls.
- Reduced motion: a pressed block snaps back instead of easing. Nothing else moves.

## Numbers

- Page: 5.8 KiB Brotli of a 14 KiB budget (HTML, CSS and script).
- Default photo: 94 KB JPEG, loaded as a separate file.
- Timings above are from a headless cloud browser with software rendering. Nothing has been measured on a real machine, in Safari or in Firefox yet. Dragging Block size to its finest end builds 3,456 blocks and was slow there (about 3 s).

## Credit

The default photo is "Michelangelo's David, Florence 2019" by George M. Groutas, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/), from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Michelangelo%E2%80%99s_David,_Florence_2019_-_48170169936.jpg), resized to 800×1200.
