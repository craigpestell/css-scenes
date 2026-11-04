// Adaptive size (off by default; the "Fit to frame rate" switch in Controls sets data-adaptive on the stage).
// Once a second it compares the frame rate with the display's own rate: it shrinks the eyepiece when frames drop
// and grows it again while there is headroom. The size goes in --fit-d, which scene.css reads in place of --d.
const stage = document.querySelector('.stage');
let raf = 0, frames = 0, since = 0, target = 60, calm = 0, size = 0, ceiling = Infinity;

const bounds = () => {
  const side = Math.min(innerWidth, innerHeight);
  return [side * 0.3, side * 0.92];
};
const tick = (now) => {
  raf = requestAnimationFrame(tick);
  if (!since) { since = now; size = stage.querySelector('.scope').offsetWidth; return; }
  frames++;
  if (now - since < 1000) return;
  const fps = (frames * 1000) / (now - since);
  frames = 0; since = now;
  if (document.hidden) return;
  target = Math.min(240, Math.max(target, Math.round(fps))); // the best rate seen is the display's rate
  const [min, max] = bounds();
  if (fps < target * 0.9) { ceiling = size * 0.95; size *= 0.88; calm = 0; } // dropping frames: shrink at once
  else if (fps >= target * 0.97 && ++calm >= 2) size *= 1.04; // two smooth seconds in a row: grow a little
  else return;
  // Never grow back to a size that dropped frames, so it settles instead of see-sawing.
  size = Math.min(max, ceiling, Math.max(min, size));
  stage.style.setProperty('--fit-d', `${Math.round(size)}px`);
};
addEventListener('resize', () => { ceiling = Infinity; });
const sync = () => {
  cancelAnimationFrame(raf);
  if (stage.hasAttribute('data-adaptive')) { since = 0; frames = 0; calm = 0; ceiling = Infinity; raf = requestAnimationFrame(tick); }
  else stage.style.removeProperty('--fit-d');
};
new MutationObserver(sync).observe(stage, { attributes: true, attributeFilter: ['data-adaptive'] });
sync();
