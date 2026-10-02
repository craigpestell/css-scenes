---
name: scene-writeup
description: Write the technique write-up (writeup.md) and finalize meta.json for a built scene, using real code excerpts and measured numbers. Use after a scene builds and has been measured.
---

# Scene write-up

Audience: front-end developers who want to learn the novel techniques and copy them.

## Rules
- Every code excerpt must be copied from the shipped `scenes/<slug>/scene.css` or `packages/lib/src/*.css`, never retyped from memory. Re-check after any scene change.
- Every number (bytes, Lighthouse, frame stats) comes from the build report or `reports/<slug>.json`. If measurements don't exist yet, say so in the doc and leave a clearly marked TODO; never invent figures.
- Support claims come from `modern-web-guidance` or MDN/Baseline, with the fallback behavior stated.
- Explain *why* a technique is cheap or expensive (compositor vs paint), not just what it does. Honest trade-offs.
- Short. Aim for 400–800 words plus code.

## writeup.md template
```
---
title: <Title>
slug: <slug>
---
## The idea
One paragraph + what the viewer sees.

## Techniques
### <Technique name>
What it does, the minimal excerpt, why it works, browser support + fallback.
(one section per entry in meta.json techniques[])

## Performance notes
Bytes (raw/gzip/brotli), Lighthouse, frame stats, layers/paint; what costs the most and why; exceptions declared and their cost.

## Accessibility
Reduced-motion frame, contrast, semantics.

## Reuse
Library snippets used (link by name) and how to adapt them.
```

Also update `meta.json`: `techniques[]` (short names matching the section headings), `features[]` with Baseline status, `tags`. Finish by running the build to confirm nothing broke.
