# Site improvement notes

Things noticed while building the Pixelator scene (2026-11-10). None of these are done unless marked. Roughly in order of value.

## Build and tooling

1. **No check runs on a PR.** `pnpm build` is the only gate and nothing runs it automatically except Vercel's deploy. A small GitHub Action running `pnpm install --frozen-lockfile && pnpm build` would catch budget failures before review.
2. **Render checks are rewritten by hand for every scene.** Each scene thread writes throwaway Playwright scripts for the same shots: a frame at a chosen time, dark and light, phone width, reduced motion, the `#card` view. A `pnpm shots <slug>` script next to `og.js` would save that and make reviews comparable.
3. **`pnpm og` is all or nothing, and picks its frame by waiting 2.5 s.** It re-renders every scene, and a scene whose best frame comes later (a scene that builds up over ten seconds, say) gets a weak preview. Suggest an optional slug argument and a `meta.json` field for the frame time.
4. **The Controls tab shows in link-preview images.** A page opened at `#card` in its own tab hides the top bar but not the right-edge Controls tab, so every `sites/og/*.jpg` has a "Controls" strip down its right side. `panel.js` skips itself only inside iframes; it should also skip when `#card` or `#preview` is the target.
5. **The dev server and the `og.js` server are two copies of the same static server**, with different content-type tables (`og.js` served JPEGs as `text/html`; fixed here). Neither knows `.png`, `.webp` or `.avif`. Neither serves clean URLs, so `/scenes/x/source` works on Vercel and 404s locally.
6. **The dev server rebuilds every scene on every request.** Fine at eleven scenes; it will drag as the gallery grows. Rebuilding only scenes whose files changed is a small change.
7. **Scene assets.** Done here in the simplest way: `scenes/<slug>/assets/` is copied beside the page. Still open: assets are not counted or shown anywhere (the stats panel's size table says 5.2 KB for a page that also loads a 94 KB photo), and `vercel.json` sets no cache headers for them.
8. **Trailing slashes.** `cleanUrls` is on and `trailingSlash` is unset, so a scene answers at both `/scenes/x` and `/scenes/x/`. Relative URLs inside a scene break on the first form, which is why Pixelator uses a site-root path. Setting `trailingSlash: true` would make relative paths safe.

## Metadata

9. **`SITE` in `sites/shared/head.js` is still `https://css-scenes.vercel.app`.** The custom domain went live on 2026-11-05, so `og:url`, link-preview image URLs and now the CodePen asset URLs point at the old origin.
10. **`inspiration` is the only credit field, and it always reads "Inspired by".** Pixelator's photo credit shows as "Inspired by Michelangelo's David, Florence 2019 … by George M. Groutas", which is not quite what it is. A `credits` list with its own label would fit photos, sounds and fonts.
11. **A range param's `unit` is written into the CSS value.** That makes a label-only unit impossible: "8 tiles" would set `--size: 8 tiles`. A separate `suffix` for display would fix it. 
12. **Feature support tests are matched by regex on `features[].name`** (`sites/stats/stats.js`). A slightly different spelling silently drops the live check: "CSS round() / mod()" matched nothing, "CSS round() and mod()" matches. An explicit `test` field in `meta.json`, with the regex table as the fallback, would be sturdier. There are no tests yet for `sqrt()`, container query units or `:has()`.
13. **The Playback section shows for scenes with nothing to play.** Pixelator has no animation, but the Controls column still offers speed, pause and loop. The panel could hide Playback when `.stage` has no running animations.

## Source viewer

14. **Generated markup is shown raw.** Scenes that repeat an element many times show every copy in the HTML tab (Pixelator's 216 empty `<i>` tags, for one). Either the viewer could fold long runs of identical tags ("× 216"), or the build could expand a marker such as `<!--repeat 216 <i></i>-->` so the authored file stays readable.
15. **CodePen export assumed a scene is self-contained.** Fixed for site-root asset URLs in this PR. A scene's `scene.js` that fetched anything relative would still break there.

## Copy and docs

16. **"No images" was in the gallery's lede and description.** Changed here to "No images or JavaScript unless a scene needs them", since Pixelator ships a photo.
17. **`docs/team/project.md` says nine scenes (2026-10-29).** There are eleven with this one. It also does not mention `assets/` or `pnpm og`.
18. **`CHANGELOG.md` has one entry** and says "one line per merged change"; about twenty-five PRs have merged since. Either backfill it from the merge log or drop it.
19. **`.claude/skills/scene-implement` is out of date**: it makes `modern-web-guidance` a required step (it is blocked in cloud sessions), still waits on a lint step and `pnpm measure` that were never added, and does not mention `scene.js`, `assets/` or the Controls `params`.

## Design

20. **Portrait subjects look small in the gallery cards.** Cards are landscape, so Pixelator's 2:3 frame fills about a quarter of its card. A scene could offer a different composition at `#card` (Pixelator could crop to the statue's head and torso), or the grid could allow a tall card.
21. **Interactive scenes have no shared look for on-stage controls.** Day-Night Hillside, Clockmaker's Observatory and now Pixelator each style their own buttons and switches. A small `lib/control` snippet (pill button, switch, focus ring from the tokens) would keep them consistent and save bytes per scene.
