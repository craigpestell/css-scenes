# Project profile

Both roles read this file first. It holds everything specific to css-scenes, so the shared Lite agents from [company-kit](https://github.com/craigpestell/company-kit) stay generic. `engineering-lead` keeps it current.

## Product

- **Name:** css-scenes.
- **What it is:** a gallery of animated scenes built with modern CSS only, each with its source viewer, size stats and a technique write-up.
- **Owner:** the founder's own project, unbilled, on the Lite team.
- **Stage:** live on Vercel, nine scenes (2026-10-29).

## Stack

- A framework-free static site generator in a pnpm workspace. Lightning CSS bundles and lowers CSS (Chrome 120+, Safari 17.4+, Firefox 128+). Output goes to `dist/`, which is never edited.
- Code map: `scenes/<slug>/` (each scene: `index.html`, `scene.css`, `meta.json`, optional `scene.js`, `brief.md`, `writeup.md`), `packages/build/src/cli.js` (the whole build and dev server), `packages/tokens/` (design tokens), `packages/lib/src/` (shared CSS snippets), `sites/` (gallery index, source viewer, stats panel), `ideas/`.
- The `project-architecture` skill in `.claude/skills/` is the full map; read it before cross-cutting changes.

## Project specialists

The scene pipeline has its own agents and skills in `.claude/`, run by `/new-scene`: `scene-designer` (brief), `scene-builder` (implementation), `scene-reviewer` (independent review), `doc-writer` (write-up), plus the `scene-design`, `scene-implement`, `scene-writeup`, `snippet-extract` and `perf-triage` skills. They own scene work. `engineering-lead` owns the build, site, tokens, library and deploys; `qa-engineer` checks the whole site.

## Commands

| What | Command |
| --- | --- |
| Install | `pnpm install --frozen-lockfile` |
| Build (enforces each scene's size budget) | `pnpm build` |
| Dev server | `pnpm dev` (http://localhost:4321/) |
| Tests | none; `pnpm build` is the check |

## Hosting and deploys

- **Host:** Vercel (`vercel.json`: pnpm install, `pnpm run build`, `dist/`, clean URLs). Company skill: `vercel-hosting`.
- **How a change reaches production:** merge to `main`; Vercel deploys it. PRs get preview URLs.
- **Rollback:** promote the previous deployment in the Vercel dashboard, then revert the commit on `main`.
- **Where secrets live:** none needed.

## Rules every role keeps

- CSS only for the visuals; `scene.js` only where a scene's brief allows it.
- Every scene page stays within its budget: 14 KiB Brotli for HTML, CSS and JS, plus any declared `meta.exceptions.extraBytes`.
- Reduced motion is respected, and non-Baseline features have `@supports` fallbacks.
- A scene's brief is approved by the founder before it is built (`/new-scene` stops for this).
- No third-party scripts, fonts or analytics.

## Deploy gate

- `pnpm build` passes on the exact commit (there is no CI yet; Vercel's build is the automatic check).
- For a new or changed scene, `scene-reviewer` has no blocking findings. For build or site changes, `qa-engineer` has checked the Vercel preview.
- No role approves its own work.

## What only the founder approves

- Scene briefs, before building
- Extracting a snippet into `packages/lib`
- Spending money, and publishing or sharing the gallery anywhere new

## Analytics

None, and none may be added without the founder's approval.
