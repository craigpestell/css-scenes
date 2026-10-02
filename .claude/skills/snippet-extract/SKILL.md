---
name: snippet-extract
description: Extract a reusable pattern from a finished scene into packages/lib as a documented, individually downloadable snippet. Use after a scene is reviewed, when a pattern appears (or will appear) in more than one scene.
---

# Snippet extract

## Extract when
The pattern is used in 2+ scenes, or is clearly generic (full-window stage, easing curve, starfield tile). Don't extract one-off art.

## Steps
1. Create `packages/lib/src/<name>.css`: first line `/* @snippet <name> — one-line purpose */`, rules inside `@layer` (base/scene/utilities), parameters exposed as custom properties with defaults (e.g. `--aurora-blur`), reduced-motion handled inside the snippet.
2. Keep it self-contained: depends only on tokens, never on another scene. Namespace classes (`.aurora`, `.starfield`).
3. Create `packages/lib/src/<name>.json` with: `name`, `description`, `features[]` with Baseline status, `fallback`, `requires` (tokens used), and `usage` (minimal HTML).
4. Replace the scene's local copy with `@import "lib/<name>";` and rebuild; the scene's output must be visually identical and no larger than before (compare the build report).
5. Record the snippet's brotli size in its JSON once the bundle step supports per-snippet output.
6. Update any scene write-up that quotes the old inline CSS.

Don't change snippet behavior in a way that breaks existing scenes; if you must, bump and update every consumer in the same change.
