// Adaptive size (off by default; the "Fit size to frame rate" switch in Controls sets data-adaptive on the stage).
// Once a second it compares the frame rate with the display's refresh rate: it shrinks the eyepiece when frames
// drop and grows it while there is headroom. The size goes in --fit-d, which scene.css reads in place of --d.
//
// The page can't read the refresh rate, and it changes (a Mac on battery drops from 60 Hz to 30 Hz), so the script
// works it out. Short frame gaps reveal a higher rate. A lower one shows up when shrinking stops helping: the frame
// rate sits on a display rate however small the eyepiece gets, so the rate becomes the new target and the size goes
// back to where it was. While the target is under 60, it now and then shrinks for a second to test for a faster display.
const stage = document.querySelector('.stage');
const RATES = [24, 30, 48, 60, 75, 90, 100, 120, 144, 165, 240];
const snap = (hz) => RATES.reduce((best, r) => (Math.abs(r - hz) < Math.abs(best - hz) ? r : best));
let raf = 0, last = 0, since = 0, gaps = [];
let target = 0, size = 0, ceiling = Infinity, calm = 0;
let shrinks = 0, before = 0, beforeFps = 0; // the current run of shrinks
let probing = false, probeIn = 15, probeSize = 0, probeTarget = 0;

const bounds = () => {
  // The stage's content box: it narrows while the Controls sheet is open
  const side = Math.min(stage.clientWidth - parseFloat(getComputedStyle(stage).paddingInlineEnd), stage.clientHeight);
  const cap = parseFloat(stage.style.getPropertyValue('--cap-d')) || Infinity; // the memory budget's limit
  return [Math.min(side * 0.3, cap), Math.min(side * 0.92, cap)];
};
const apply = (next) => {
  const [min, max] = bounds();
  size = Math.min(max, Math.max(min, next));
  stage.style.setProperty('--fit-d', `${Math.round(size)}px`);
};
const step = (fps, fastest) => {
  if (!target) { target = Math.max(60, fastest); return; } // assume at least 60 Hz until shown otherwise
  if (fastest > target) { target = fastest; ceiling = Infinity; probeIn = 15; } // frames show a faster display

  if (probing) { // last second ran small: did that reveal a faster display? If not, put the size back
    probing = false;
    if (target <= probeTarget) { apply(probeSize); probeIn *= 2; calm = 0; }
    return;
  }

  if (fps < target * 0.9) { // dropping frames
    if (shrinks >= 2 && fps <= beforeFps * 1.05 && Math.abs(fps - snap(fps)) < 2) {
      // Shrinking didn't help and the rate sits on a display rate: that's the display. Undo the shrinks.
      target = snap(fps); apply(before); shrinks = 0; ceiling = Infinity; probeIn = 15; calm = 0;
      return;
    }
    if (!shrinks) { before = size; beforeFps = fps; }
    shrinks++; ceiling = size * 0.95; calm = 0;
    apply(size * 0.88);
    return;
  }
  shrinks = 0;
  if (fps < target * 0.95) return;

  calm++;
  if (calm >= 30) ceiling = Infinity; // after thirty smooth seconds, sizes that dropped frames get another try
  if (target < 60 && --probeIn <= 0) { probing = true; probeSize = size; probeTarget = target; apply(size * 0.6); return; }
  if (calm >= 2) apply(Math.min(size * 1.04, Math.max(ceiling, size))); // two smooth seconds: grow a little
};
const tick = (now) => {
  raf = requestAnimationFrame(tick);
  if (!last || now - last > 500) { // first frame, or back from a hidden tab: start a fresh window
    last = since = now; gaps = []; size ||= stage.querySelector('.scope').offsetWidth;
    return;
  }
  gaps.push(now - last);
  last = now;
  if (now - since < 1000) return;
  const fps = (gaps.length * 1000) / (now - since);
  const fastest = snap(1000 / [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length * 0.1)]);
  gaps = []; since = now;
  step(fps, fastest);
};
addEventListener('resize', () => { ceiling = Infinity; });
// The Controls sheet narrows the stage while it is open: clamp the size to the room left.
new MutationObserver(() => { if (size && stage.hasAttribute('data-adaptive')) requestAnimationFrame(() => apply(size)); })
  .observe(document.documentElement, { attributes: true, attributeFilter: ['data-sheet-open'] });
const sync = () => {
  cancelAnimationFrame(raf);
  last = since = 0; gaps = []; target = 0; size = 0; ceiling = Infinity; calm = 0; shrinks = 0; probing = false; probeIn = 15;
  if (stage.hasAttribute('data-adaptive')) raf = requestAnimationFrame(tick);
  else stage.style.removeProperty('--fit-d');
};
new MutationObserver(sync).observe(stage, { attributes: true, attributeFilter: ['data-adaptive'] });
sync();

// GPU memory budget (the "GPU memory budget" slider in Controls sets --budget, in MB, on the stage).
// When the GPU runs out of tile memory, wedges silently stop drawing while the frame rate holds, and no web API
// reports it. So the script predicts the memory instead and caps the eyepiece so the estimate stays in budget.
// The model is fitted to Chromium memory dumps (cc/tile_memory at 1400×900, 2×: 65 MB at 12 mirrors / 1 layer,
// 145 MB at 24/4, 180 MB at 32/4): a fixed cost for the page, plus bytes per wedge and per extra glass layer
// that grow with the eyepiece's area and the pixel density squared.
const PAGE = 40e6 / (1400 * 900 * 4); // bytes per CSS px² of window at 1×
const WEDGE = 4.6; // bytes per wedge, per r² at 1×
const GLASS = 1.7; // bytes per extra glass layer in a wedge, per r² at 1×
const scope = stage.querySelector('.scope');
const estimate = (d = scope.offsetWidth) => {
  const n = scope.children.length;
  const g = scope.firstElementChild?.children.length ?? 1;
  const dpr2 = devicePixelRatio ** 2;
  return dpr2 * (innerWidth * innerHeight * PAGE + (d / 2) ** 2 * n * (WEDGE + GLASS * (g - 1)));
};
const fitBudget = () => {
  const mb = parseFloat(getComputedStyle(stage).getPropertyValue('--budget')) || 150;
  const n = scope.children.length;
  const g = scope.firstElementChild?.children.length ?? 1;
  const dpr2 = devicePixelRatio ** 2;
  const room = mb * 1e6 / dpr2 - innerWidth * innerHeight * PAGE;
  const r = Math.sqrt(Math.max(0, room) / (n * (WEDGE + GLASS * (g - 1))));
  const cap = `${Math.max(120, Math.floor(2 * r))}px`;
  // Only write when it changes: this observer also watches the stage's style attribute
  if (stage.style.getPropertyValue('--cap-d') !== cap) stage.style.setProperty('--cap-d', cap);
  stage.dataset.memory = Math.round(estimate() / 1e6); // what the current size is estimated to need, for checking
};
new MutationObserver(fitBudget).observe(scope, { childList: true, subtree: true }); // mirrors or glass added
new MutationObserver(fitBudget).observe(stage, { attributes: true, attributeFilter: ['style'] }); // slider moved
addEventListener('resize', fitBudget);
matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener('change', fitBudget); // moved to another screen
fitBudget();
