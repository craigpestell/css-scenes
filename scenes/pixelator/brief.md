# Pixelator (pixelator)

Status: APPROVED. The owner asked for this scene on 2026-11-10 ("a css image 'pixelator' scene", with "a control for the user to upload their own photo, which can replace the default photo", and "a photo of Michelangelo's David statue" as the default). Claude picked everything else below, including the slug, and those choices have not been reviewed separately.

## Concept / mood / motion language
- **Concept:** A framed photo of Michelangelo's David breaks into square tiles. A slider sets how many tiles wide each pixel is; left alone, the scene grows and shrinks the pixels on a loop. On 2026-11-10 the owner first asked for step-at-a-time halving, then for this more granular control instead.
- **Mood:** A museum wall and a censor bar: calm, slightly cheeky.
- **Motion language:** Step, hold, step back. No easing: pixels snap.

## Palette & tokens
`--c-paper`, `--c-ink` and `--c-accent` for the wall, button and focus ring. The colours in the frame all come from the photo. One local colour, the frame's hairline (`light-dark()`).

## Layers (back to front)
1. Wall: the photo again, covering the stage, blurred (`.stage::before`).
2. `.photo`: the photo, sharp, in a frame with the photo's shape.
3. `.grid`: up to 3,456 square tiles (`<i>`), each showing one point of the photo.
4. Under the frame: a pixel size slider with a pixel count and Play loop, the photo button, a privacy line and the photo credit.

## Motion plan
| element | property | trigger | duration | compositor-safe? |
|---|---|---|---|---|
| `.grid` | `--k` (registered integer, the block size in tiles) 1 → `--size` → 1 | time, until the slider is moved | `--loop` 16s | paint-ok: it steps about twice a second and repaints the tiles |
| `.grid` | `opacity` 0 → 1 → 0 at the ends of the loop | time | `--loop` | yes |
| tile | `opacity` to 0 on hover, fading back | hover | `--t-slow` | yes |

Everything runs on the one `--loop` clock, so the shared Playback tab's loop-off ends on the sharp photo.

## Techniques (Baseline status and fallback)
- **Point sampling with `background-size`:** each tile paints the photo magnified until one point fills it. Widely available.
- **`sibling-index()`** gives each tile its number; `mod()` and `round()` turn it into a column and row. `sibling-index()` is newly available (2026-08); the script writes `--i` where it is missing.
- **`round()` to merge tiles into blocks**, with the block size as an `@property` integer. `round()`/`mod()` newly available (2024-05). Without them the frame shows the plain photo.
- **`sqrt()`** picks columns and rows from the photo's aspect ratio. Widely available.
- Baseline notes are from knowledge; `modern-web-guidance` is blocked in the cloud sandbox.

## Reduced-motion frame
No loop: a still mosaic at the slider's size. The hover wipe still works, without the fade.

## Exceptions
- **JavaScript (`scene.js`):** CSS can't open a file picker's result or read an image's shape. The script passes the slider's value in as `--pick`, sets `--photo` and `--ar` for a photo that is picked, dropped or pasted, and writes `--i` for browsers without `sibling-index()`. The photo never leaves the device.
- **Raster image (`assets/david.jpg`, 94 KB):** the default photo the owner asked for. George M. Groutas, CC BY 2.0, from Wikimedia Commons, resized to 800×1200; credited on the stage and in `meta.json`. It ships as a separate file, outside the 14 KiB page budget. The build now copies `scenes/<slug>/assets/`.

## Snippets reused / candidates to extract
`lib/stage`. Candidate: the tile-index rules (column and row from `sibling-index()`).

## Budget & targets
14 KiB Brotli for HTML, CSS and JS (5.5 KiB as built). CLS 0.

## Open questions for the human
- The point sample takes one pixel, not an average, so busy photos look grainier than a true mosaic. Fine for a CSS demo?
- Each block step restyles every tile (about 0.2 s of main-thread work in the slow cloud browser). Worth checking on a real machine.
- Italian law limits commercial use of images of David. This gallery is non-commercial; say if that changes.
