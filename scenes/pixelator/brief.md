# Pixelator (pixelator)

Status: APPROVED. The owner asked for this scene on 2026-11-10 ("a css image 'pixelator' scene", with "a control for the user to upload their own photo, which can replace the default photo", and "a photo of Michelangelo's David statue" as the default). Claude picked everything else below, including the slug, and those choices have not been reviewed separately.

## Concept / mood / motion language
- **Concept:** A photo of Michelangelo's David behind a wall of glass blocks. Each block is a lens with its own view of the photo; a Lens slider takes the blocks from a wide, repeating view, through clear glass, to flat pixels.
- **History (2026-11-10):** the owner asked for a pixelator with a photo upload, then David as the default, then step-at-a-time halving, then a granular slider instead, then no loop, and then set the real goal: CSS effects on each tile, such as a wall of glass blocks or tiles that bend the image.
- **Mood:** A bathroom window in a museum: calm, slightly cheeky.
- **Motion language:** None of its own. A pressed block eases back to its lens.

## Palette & tokens
`--c-paper`, `--c-ink` and `--c-accent` for the wall, button and focus ring. Local colours: the frame's hairline and the mortar (`light-dark()`). The colours in the frame come from the photo.

## Layers (back to front)
1. Wall: the photo again, covering the stage, blurred (`.stage::before`).
2. `.photo`: the photo, sharp, in a frame with the photo's shape.
3. `.grid`: 24 to 3,456 square blocks (`<i>`), 216 by default, each painting its own copy of the photo.
4. Under the frame: the photo credit only. Block size and Lens sliders, a Glass blocks switch and the photo button are in the site's Controls panel (owner's request, 2026-11-10), which shows no Playback section for this scene.

## Motion plan
| element | property | trigger | duration | compositor-safe? |
|---|---|---|---|---|
| block | `--press` (registered number) 1 → 0, which eases its magnification back | hover ends | `--t-slow` | paint-ok: one block repaints |

## Techniques (Baseline status and fallback)
- **A background copy per block**, sized by the magnification and positioned so the block's middle shows what is behind it. Widely available.
- **`sibling-index()`** gives each block its number; `mod()` and `round()` turn it into a column and row. Newly available (2026-08); the script writes `--i` where it is missing.
- **`pow()` and `sqrt()`** for the lens curve and the wall's columns and rows. Widely available.
- **`@property`** numbers so each block's arithmetic is done once, and for the press transition. Newly available (2024-07).
- Without `round()`/`mod()` the frame shows the plain photo. Baseline notes are from knowledge; `modern-web-guidance` is blocked in the cloud sandbox.

## Reduced-motion frame
The same still wall. A pressed block snaps back instead of easing.

## Exceptions
- **JavaScript (`scene.js`):** CSS can't open a file or read an image's shape. The script keeps the number of block elements equal to the columns times rows the CSS computes, sets `--photo` and `--ar` for a photo that is picked, dropped or pasted, and writes `--i` for browsers without `sibling-index()`. The photo never leaves the device.
- **Raster image (`assets/david.jpg`, 94 KB):** the default photo the owner asked for. George M. Groutas, CC BY 2.0, from Wikimedia Commons, resized to 800×1200; credited on the stage and in `meta.json`. It ships as a separate file, outside the 14 KiB page budget. The build now copies `scenes/<slug>/assets/`.

## Snippets reused / candidates to extract
`lib/stage`. Candidates: the block-index rules (column and row from `sibling-index()`), and the lens background (size and position from a magnification).

## Budget & targets
14 KiB Brotli for HTML, CSS and JS (6.0 KiB as built). CLS 0.

## Open questions for the human
- The scene is still called Pixelator, though pixels are now one end of the Lens slider. Rename it?
- Curved or bending blocks are not built. Options: an SVG displacement filter per block (true curve, heavy), or a few strips per block at different magnifications (fluted glass, cheap).
- Nothing is measured on a real machine, in Safari or in Firefox.
- Italian law limits commercial use of images of David. This gallery is non-commercial; say if that changes.
