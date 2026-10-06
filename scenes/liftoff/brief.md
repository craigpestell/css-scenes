# Liftoff (liftoff)

Status: APPROVED by the user on 2026-10-03, after the build and review. Built on 2026-10-02 from the shortlist in `ideas/gallery-inspiration.md`, using the defaults below, which Claude picked.

## Concept / mood / motion language
- **Concept:** A rocket on a pad. Scrolling the page counts it down, ignites it, lifts it off, drops the booster and carries the upper stage through cloud layers into a starfield.
- **Mood:** Clean, optimistic, a little toy-like.
- **Motion language:** User-scrubbed, cinematic, camera follows the rocket (the world moves, the rocket stays near centre).

## Defaults picked
1. Scroll drives the scene where `animation-timeline: scroll()` exists; elsewhere the same keyframes play as a 16s time loop.
2. HUD shows a countdown and an altimeter driven by typed `@property` integers.
3. Sky is physical (day to space), so it does not follow light/dark; only `--c-accent` (rocket stripes and fins) comes from tokens.
4. No new tokens; scene colours are local custom properties. Accepted exception to the token rule (user, 2026-10-03).
5. Reduced motion: all animation off, page does not scroll, rocket sits on the pad at T-10.

## Inspiration
[Artemis 2 – Scroll to Launch](https://codepen.io/cbolson/pen/jEMxeZW) by Chris Bolson.
