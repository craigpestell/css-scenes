---
description: Design, build, review and document a new CSS scene from an idea
argument-hint: <scene idea>
---

Run the scene pipeline for: $ARGUMENTS

1. Pick a kebab-case slug. Spawn the `scene-designer` agent to write `scenes/<slug>/brief.md`.
2. **Stop and show the brief to the user; wait for explicit approval or edits.** Do not continue without it.
3. Spawn `scene-builder` with the approved brief.
4. Spawn `scene-reviewer`. If it reports Blocking items, send them back to `scene-builder` and re-review (max 2 rounds, then ask the user).
5. Spawn `doc-writer` to produce `writeup.md` and finalize `meta.json`.
6. Evaluate snippet candidates reported by the builder using the `snippet-extract` skill, and ask the user before extracting.
7. Summarize: files created, build size vs budget, review result, and any open items. Don't commit unless asked.
