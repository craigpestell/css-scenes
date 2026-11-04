/**
 * The scene sheet for scene pages: one tabbed panel below the scene dock. About describes the scene; Stats shows live frame
 * rate, code sizes against the budget, feature support in this browser and the viewing environment; Controls drives the
 * page. Loaded as one shared script (dist/stats.js) and kept out of every scene's budget; it reads its build-time data from
 * <script id="scene-stats">. Skipped inside the index page's previews.
 *
 * The tab buttons go into the dock's tools (light DOM, styled by the dock) and the sheet lives in a shadow root. Each tab
 * holds { title, render(el), update?(el) } sections, so new sections slot in without touching the shell.
 *
 * Controls: a colour-scheme override and the scene's own meta.json `params`. Playback (speed, loop, pause, restart) is a
 * separate tab fixed to the window's edge, <scene-playback>, so it stays in reach with the sheet closed. Nothing in either
 * persists; Reset restores the page as authored. Which tab is open, and whether the edge tab is open, are remembered.
 */
const data = JSON.parse(document.getElementById('scene-stats')?.textContent ?? 'null');
const html = document.documentElement;
const store = {
  get: (k) => { try { return localStorage.getItem(`scene-stats:${k}`) ?? ''; } catch { return ''; } },
  set: (k, v) => { try { localStorage.setItem(`scene-stats:${k}`, v); } catch {} },
};

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/* Frame sampler: rAF deltas folded into a sample every half second. */
const frames = { fps: 0, avg: 0, worst: 0, long: 0, history: [] };
{
  let last = 0, start = 0, count = 0, sum = 0, worst = 0;
  const tick = (now) => {
    if (last) {
      const dt = now - last;
      count++; sum += dt; worst = Math.max(worst, dt);
      if (dt > 50) frames.long++;
    } else start = now;
    last = now;
    if (now - start >= 500 && count) {
      frames.fps = Math.round((count * 1000) / (now - start));
      frames.avg = sum / count;
      frames.worst = worst;
      frames.history = [...frames.history.slice(-59), frames.fps];
      start = now; count = 0; sum = 0; worst = 0;
      panel?.update();
    }
    requestAnimationFrame(tick);
  };
  // A hidden tab pauses rAF; restart the window so the gap doesn't read as one huge frame.
  document.addEventListener('visibilitychange', () => { last = 0; });
  if (data && window === window.top) requestAnimationFrame(tick);
}

const supports = (test) => {
  if (!test) return null;
  if (test.startsWith('window.')) return test.slice(7) in window;
  try { return CSS.supports(test); } catch { return false; }
};

/* About: what the scene is, how to play it, how it's made and who inspired it. */
const aboutSection = {
  title: 'About',
  render: (el) => {
    const a = data.about ?? {};
    const list = (items) => `<ul class="bullets">${items.join('')}</ul>`;
    el.innerHTML = `<p class="kicker">${esc(a.hint ?? '')} · ${kb(data.sizes.total)} of ${kb(data.sizes.budget)}</p>
      ${a.description ? `<p class="lede">${esc(a.description)}</p>` : ''}
      ${a.techniques?.length ? `<h3>Techniques</h3>${list(a.techniques.map((t) => `<li>${esc(t)}</li>`))}` : ''}
      ${a.inspiration?.length ? `<h3>Inspired by</h3>${list(a.inspiration.map((c) => `<li><a href="${esc(c.url)}">${esc(c.title)}</a> by ${esc(c.author)}</li>`))}` : ''}
      <p class="more"><a href="source.html" data-a="source">How it's made <span aria-hidden="true">→</span></a></p>`;
    // The link opens the source dialog like the dock's Source; modified clicks get the page
    el.querySelector('[data-a=source]').addEventListener('click', (e) => {
      const dock = document.querySelector('.scene-dock [href="source.html"]');
      if (!dock || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      dock.click();
    });
  },
};

const SECTIONS = [
  {
    title: 'Performance',
    render: (el) => {
      el.innerHTML = `<p class="big"><output data-k="fps">–</output> <span>fps</span></p>
        <svg class="spark" viewBox="0 0 59 30" preserveAspectRatio="none" aria-hidden="true"><polyline/></svg>
        <dl>
          <dt>Frame time</dt><dd><output data-k="avg">–</output></dd>
          <dt>Worst frame (0.5 s)</dt><dd><output data-k="worst">–</output></dd>
          <dt>Long frames (&gt;50 ms)</dt><dd><output data-k="long">0</output></dd>
          <dt>Animations</dt><dd><output data-k="anims">–</output></dd>
        </dl>`;
    },
    update: (el) => {
      const set = (k, v) => { el.querySelector(`[data-k="${k}"]`).value = v; };
      set('fps', frames.fps);
      set('avg', `${frames.avg.toFixed(1)} ms`);
      set('worst', `${frames.worst.toFixed(1)} ms`);
      set('long', frames.long);
      const anims = document.getAnimations?.() ?? [];
      const scroll = anims.filter((a) => a.timeline && !(a.timeline instanceof DocumentTimeline)).length;
      set('anims', `${anims.length}${scroll ? ` (${scroll} scroll-linked)` : ''}`);
      const top = Math.max(60, ...frames.history);
      el.querySelector('polyline').setAttribute('points',
        frames.history.map((v, i) => `${i + 59 - frames.history.length},${30 - (v / top) * 28}`).join(' '));
    },
  },
  {
    title: 'Size',
    render: (el) => {
      const { html, css, js, total, budget } = data.sizes;
      const row = (name, p) => `<dt>${name}</dt><dd>${p ? `${kb(p.br)} <small>${kb(p.raw)} raw</small>` : 'none'}</dd>`;
      el.innerHTML = `<meter min="0" max="${budget}" low="${budget * 0.75}" high="${budget * 0.9}" optimum="0" value="${total}">${kb(total)}</meter>
        <p class="note">${kb(total)} of ${kb(budget)} budget, brotli</p>
        <dl>${row('HTML', html)}${row('CSS', css)}${row('JS', js)}</dl>
        <p class="note">Parts compress separately, so they sum to more than the page. Excludes this panel.</p>`;
    },
  },
  {
    title: 'Compatibility',
    render: (el) => {
      if (!data.features.length) {
        el.innerHTML = `<p class="note">No feature data for this scene.</p>`;
        return;
      }
      const results = data.features.map((f) => ({ ...f, ok: supports(f.test) }));
      const tested = results.filter((f) => f.ok !== null);
      const passed = tested.filter((f) => f.ok).length;
      const mark = { true: ['yes', 'Supported here'], false: ['no', 'Not supported here; fallback in use'], null: ['na', 'Not tested'] };
      el.innerHTML = `<p class="note">${passed} of ${tested.length} tested features supported in this browser.</p>
        <ul>${results.map((f) => {
          const [cls, label] = mark[f.ok];
          return `<li class="${cls}"><span class="dot" role="img" aria-label="${label}" title="${label}"></span>
            <span>${esc(f.name)}<small>${esc(f.baseline)}</small></span></li>`;
        }).join('')}</ul>`;
    },
  },
  {
    title: 'Environment',
    render: (el) => {
      el.innerHTML = `<dl>
        <dt>Viewport</dt><dd><output data-k="vp"></output></dd>
        <dt>Colour scheme</dt><dd><output data-k="scheme"></output></dd>
        <dt>Reduced motion</dt><dd><output data-k="motion"></output></dd>
        <dt>DOM elements</dt><dd><output data-k="dom"></output></dd>
        <dt>Scene JavaScript</dt><dd>${data.sizes.js ? 'yes' : 'none'}</dd>
      </dl>`;
    },
    update: (el) => {
      const set = (k, v) => { el.querySelector(`[data-k="${k}"]`).value = v; };
      set('vp', `${innerWidth} × ${innerHeight} @${devicePixelRatio}x`);
      set('scheme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      set('motion', matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'no preference');
      // The panel lives in a shadow root, so this counts the scene's elements only.
      set('dom', document.getElementsByTagName('*').length);
    },
  },
];

/* Playback: every scene runs on the clock (the document timeline), never on the scrollbar. The edge tab holds speed,
 * loop, pause and restart; they act on the stage's animations through the Web Animations API, so scenes need no script.
 *
 * Loop off means one pass, then a still: the scene's longest repeating animation (its cycle, such as a launch or a race)
 * finishes the pass it is on and holds its last frame, and everything else stops with it. An alternating cycle finishes
 * on a forwards pass, so it holds the authored end. Turning loop back on after the hold plays the scene from the start.
 */
const play = { rate: 1, paused: false, loop: true, held: false, scheme: '' };
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

const stageAnims = () => (document.getAnimations?.() ?? []).filter((a) =>
  a.timeline instanceof DocumentTimeline && a.effect?.target?.closest?.('.stage'));
const infinite = new WeakSet(); // animations authored to repeat, remembered before loop-off rewrites their iterations
const cycleOf = (list) => {
  list.forEach((a) => { if (a.effect.getTiming().iterations === Infinity) infinite.add(a); });
  const loops = list.filter((a) => infinite.has(a));
  const len = (a) => Number(a.effect.getTiming().duration) || 0;
  const max = Math.max(0, ...loops.map(len));
  return { max, cycle: loops.filter((a) => len(a) >= max * 0.999 && max > 0) };
};

/** Make the cycle's animations end after the pass they are on (forwards, for alternating ones) or repeat again. */
const setIterations = (cycle) => {
  for (const a of cycle) {
    const t = a.effect.getTiming();
    if (play.loop) { if (t.iterations !== Infinity) a.effect.updateTiming({ iterations: Infinity }); continue; }
    if (t.iterations !== Infinity) continue; // already ending
    const n = a.effect.getComputedTiming().currentIteration ?? 0;
    const flips = t.direction === 'alternate' || t.direction === 'alternate-reverse';
    const backwards = (t.direction === 'alternate' && n % 2) || (t.direction === 'alternate-reverse' && !(n % 2));
    a.effect.updateTiming({ iterations: n + 1 + (flips && backwards ? 1 : 0), fill: 'both' });
  }
};

/** Keep every stage animation at the chosen speed and loop setting. Runs on changes and twice a second, because CSS
 * replaces animations when a property they read changes (a scene param, the colour scheme). */
const syncPlayback = () => {
  const list = stageAnims();
  const { cycle } = cycleOf(list);
  setIterations(cycle);
  if (!play.loop && !play.held && cycle.length && cycle.every((a) => a.playState === 'finished')) play.held = true;
  const r = play.paused || play.held ? 0 : play.rate;
  for (const a of list) if (a.playbackRate !== r && a.playState !== 'finished') a.playbackRate = r;
  playback?.render();
};

/** Every stage animation back to its first frame, playing. */
const restart = () => {
  play.held = false;
  for (const a of stageAnims()) {
    if (infinite.has(a)) a.effect.updateTiming({ iterations: Infinity });
    a.currentTime = 0;
    a.play();
  }
  syncPlayback();
};
const setLoop = (on) => {
  play.loop = on;
  if (on && play.held) restart(); // the still was the end of the pass; looping again starts the next one
  else syncPlayback();
};
const resetPlayback = () => {
  Object.assign(play, { rate: 1, paused: false });
  setLoop(true);
};

/** How far the cycle is through its current pass, 0 to 1, for the tab's progress bar. */
const progress = () => {
  const { cycle } = cycleOf(stageAnims());
  const t = cycle[0]?.effect.getComputedTiming();
  if (!t) return null;
  if (cycle[0].playState === 'finished') return 1;
  const p = t.progress ?? 0;
  return t.direction === 'reverse' || (t.direction === 'alternate' && t.currentIteration % 2) ? 1 - p : p;
};

class ScenePlayback extends HTMLElement {
  connectedCallback() {
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${PLAYBACK_CSS}</style>
      <div class="tab">
        <button class="handle" aria-expanded="false" aria-controls="pb" title="Playback (P)">
          <span class="icon" aria-hidden="true"></span><span class="word">Playback</span></button>
        <div id="pb" class="body" role="group" aria-label="Playback" hidden>
          <p class="reduced" hidden>Your system asks for reduced motion, so this scene shows a still frame.</p>
          <div class="buttons">
            <button type="button" class="btn" data-a="pause" aria-pressed="false">Pause</button>
            <button type="button" class="btn" data-a="restart">Restart</button>
          </div>
          <div class="row"><label for="pb-rate">Speed</label><output for="pb-rate">1×</output>
            <input type="range" id="pb-rate" min="0.1" max="4" step="0.05" value="1" list="pb-marks">
            <datalist id="pb-marks"><option value="0.5"></option><option value="1"></option><option value="2"></option></datalist></div>
          <label class="switch"><span>Loop</span><input type="checkbox" role="switch" data-a="loop" checked></label>
          <div class="progress" aria-hidden="true"><i></i></div>
          <p class="state" aria-live="polite"></p>
        </div>
      </div>`;
    this.handle = root.querySelector('.handle');
    this.body = root.getElementById('pb');
    this.rate = root.getElementById('pb-rate');
    this.bar = root.querySelector('.progress i');
    this.state = root.querySelector('.state');
    this.handle.addEventListener('click', () => this.toggle());
    this.body.addEventListener('input', (e) => {
      if (e.target === this.rate) { play.rate = +this.rate.value; syncPlayback(); }
      if (e.target.dataset.a === 'loop') setLoop(e.target.checked);
    });
    this.body.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b?.dataset.a === 'pause') { play.paused = !play.paused; syncPlayback(); }
      if (b?.dataset.a === 'restart') restart();
    });
    // 1× is a double-click away on the slider
    this.rate.addEventListener('dblclick', () => { play.rate = 1; syncPlayback(); });
    addEventListener('keydown', (e) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.composedPath().some((el) => el.matches?.('input,select,textarea,[contenteditable]'))) return;
      if (e.key === 'Escape' && !this.body.hidden) { this.toggle(false); this.handle.focus(); }
      else if (e.key === 'p' || e.key === 'P') this.toggle();
    });
    reduced.addEventListener('change', () => this.render());
    // While open, the progress bar follows the cycle every frame
    this.tick = () => { if (!this.body.hidden) { this.paint(); requestAnimationFrame(this.tick); } };
    this.toggle(store.get('playback') === 'open');
  }

  toggle(open = this.body.hidden) {
    this.body.hidden = !open;
    this.handle.setAttribute('aria-expanded', open);
    store.set('playback', open ? 'open' : '');
    this.render();
    if (open) requestAnimationFrame(this.tick);
  }

  paint() {
    const p = progress();
    this.bar.parentElement.hidden = p === null || reduced.matches;
    if (p !== null) this.bar.style.scale = `${p} 1`;
  }

  render() {
    if (!this.body) return;
    const off = reduced.matches;
    this.body.querySelector('.reduced').hidden = !off;
    this.body.querySelectorAll('button,input').forEach((el) => { el.disabled = off; });
    const pause = this.body.querySelector('[data-a=pause]');
    pause.setAttribute('aria-pressed', play.paused);
    pause.textContent = play.paused ? 'Play' : 'Pause';
    if (+this.rate.value !== play.rate) this.rate.value = play.rate;
    this.body.querySelector('output').value = `${+play.rate.toFixed(2)}×`;
    this.body.querySelector('[data-a=loop]').checked = play.loop;
    this.handle.dataset.state = off ? 'still' : play.held ? 'ended' : play.paused ? 'paused' : 'playing';
    const text = off ? '' : play.held ? 'Played once. Restart, or turn loop on, to play again.' : play.paused ? 'Paused.' : '';
    if (this.state.textContent !== text) this.state.textContent = text;
    this.paint();
  }
}
let playback;

/* Controls. Scene params come from meta.json:
 *   { "type": "range", "label", "var": "--x", "target"?: ".stage", "min", "max", "step", "value", "unit"? }
 *     sets a custom property inline on target; `value` is the authored default, and Reset removes the inline value.
 *   { "type": "count", "label", "selector", "min", "max", "step"? }
 *     clones or removes elements matching selector inside each of their parents, then sets --i (1-based index) and
 *     --n (count) inline on each, so --i-driven CSS keeps working where sibling-index() is missing.
 *   { "type": "color", "label", "var", "target"?, "value" }
 * Playback (speed, loop, pause) lives in the edge tab, not here.
 */
const counts = new Map(); // selector -> { template, homes: [{ parent, anchor }], initial }
const countSetup = (p) => {
  const els = [...document.querySelectorAll(p.selector)];
  if (!els.length) return null;
  const homes = [...new Set(els.map((e) => e.parentElement))].map((parent) => {
    const own = [...parent.children].filter((e) => e.matches(p.selector));
    return { parent, anchor: own.at(-1).nextElementSibling };
  });
  const c = { template: els[0].cloneNode(true), homes, initial: els.length / homes.length };
  counts.set(p.selector, c);
  return c;
};
const setCount = (p, n) => {
  const c = counts.get(p.selector);
  // Parents cloned by an earlier param (wedges holding glass) are found through their current children.
  const parents = new Map(c.homes.map((h) => [h.parent, h.anchor]));
  for (const e of document.querySelectorAll(p.selector)) if (!parents.has(e.parentElement)) parents.set(e.parentElement, null);
  for (const [parent, anchor] of parents) {
    const own = () => [...parent.children].filter((e) => e.matches(p.selector));
    let kids = own();
    while (kids.length > n) kids.pop().remove();
    while (kids.length < n) {
      const clone = c.template.cloneNode(true);
      parent.insertBefore(clone, kids.at(-1)?.nextElementSibling ?? anchor);
      kids.push(clone);
    }
    kids.forEach((e, i) => { e.style.setProperty('--i', i + 1); e.style.setProperty('--n', n); });
  }
};
const targets = (p) => document.querySelectorAll(p.target ?? '.stage');
const fmt = (p, v) => `${v}${p.unit ?? ''}`; // the CSS value
const show = (p, v) => `${v}${/^[a-z]/i.test(p.unit ?? '') ? ' ' : ''}${p.unit ?? ''}`; // the label: 20 s, 1.5×
const hex = (c) => {
  const m = /^rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/.exec(c.trim());
  return m && `#${m.slice(1).map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`;
};

const controlsSection = {
  title: 'Scene',
  render: (el) => {
    const id = (i) => `ctl-${i}`;
    const rows = data.params.map((p, i) => {
      if (p.type === 'count' && !countSetup(p)) return '';
      if (p.type === 'count') p.value = counts.get(p.selector).initial;
      // A colour starts from what the page computes now, so the picker matches light or dark.
      if (p.type === 'color') p.value = hex(getComputedStyle(targets(p)[0] ?? html).getPropertyValue(p.var)) ?? p.value;
      const input = p.type === 'color'
        ? `<input type="color" id="${id(i)}" value="${esc(p.value)}">`
        : `<input type="range" id="${id(i)}" min="${p.min}" max="${p.max}" step="${p.step ?? 1}" value="${p.value}">`;
      return `<div class="row" data-p="${i}">
        <label for="${id(i)}">${esc(p.label)}</label><output for="${id(i)}">${esc(show(p, p.value))}</output>${input}</div>`;
    }).join('');
    el.innerHTML = `<p class="note">Speed and loop are in the Playback tab on the edge of the window.</p>
      <div class="pair">
        <label class="pick">Scheme <select data-a="scheme"><option value="">auto</option><option>light</option><option>dark</option></select></label>
      </div>
      ${rows}
      <button type="button" class="btn reset" data-a="reset">Reset all</button>`;

    const out = (id, v) => { el.querySelector(`output[for="${id}"]`).value = v; };
    const applyParam = (p, v) => {
      if (p.type === 'count') {
        // Counts nest (glass inside wedges), so every count is replayed in order to keep clones in step.
        p.current = +v;
        data.params.filter((q) => q.type === 'count' && counts.has(q.selector)).forEach((q) => setCount(q, q.current ?? q.value));
      } else targets(p).forEach((t) => t.style.setProperty(p.var, fmt(p, v)));
      syncPlayback();
    };

    el.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.a === 'scheme') { play.scheme = t.value; html.style.colorScheme = t.value; }
      else {
        const p = data.params[t.closest('[data-p]')?.dataset.p];
        if (!p) return;
        out(t.id, show(p, t.value));
        applyParam(p, t.value);
      }
    });
    el.addEventListener('click', (e) => {
      if (e.target.closest('button')?.dataset.a !== 'reset') return;
      play.scheme = '';
      html.style.colorScheme = '';
      el.querySelector('[data-a=scheme]').value = '';
      data.params.forEach((p, i) => {
        const input = el.querySelector(`#${id(i)}`);
        if (!input) return;
        input.value = p.value;
        out(input.id, show(p, p.value));
        if (p.type === 'count') applyParam(p, p.value);
        else targets(p).forEach((t) => t.style.removeProperty(p.var));
      });
      resetPlayback();
    });
  },
};

const CSS_TEXT = `
:host{all:initial;color-scheme:inherit;--bg:light-dark(#fffe,#0f0e18f0);--fg:light-dark(#14121f,#f4f1ff);--dim:light-dark(#5d5a70,#a29fb8);
  --line:light-dark(#14121f1f,#fff2);--accent:var(--c-accent,#9d85ff);--yes:light-dark(#08703a,#5fd38d);--no:light-dark(#b3261e,#ff8a80);
  font:12px/1.45 system-ui,sans-serif;font-variant-numeric:tabular-nums;color:var(--fg)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
button,select{font:inherit;color:inherit;cursor:pointer}
:focus-visible{outline:2px solid currentColor;outline-offset:2px}
[popover]{position:fixed;inset:calc(max(.75rem,env(safe-area-inset-top)) + 3.4rem) max(.75rem,env(safe-area-inset-right)) auto auto;margin:0;
  width:min(22rem,calc(100vw - 1.5rem));max-height:min(calc(100dvh - 5rem),40rem);overflow:auto;padding:0;
  border:0;border-radius:1rem;background:var(--bg);color:var(--fg);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
  box-shadow:0 0 0 1px var(--line),0 1rem 3rem #0005}
@media (width < 40rem){[popover]{max-height:58dvh}}
@media (prefers-reduced-motion:no-preference){[popover]:popover-open{animation:in .18s ease-out}}
@keyframes in{from{opacity:0;translate:0 -.4rem}}
header{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:.25rem;padding:.4rem;border-bottom:1px solid var(--line);background:var(--bg)}
[role=tablist]{display:flex;gap:.2rem;flex:1}
[role=tab]{padding:.4rem .7rem;border:0;border-radius:99rem;background:none;font-weight:600;color:var(--dim)}
[role=tab]:hover{color:var(--fg)}
[role=tab][aria-selected=true]{background:light-dark(#14121f14,#fff2);color:var(--fg)}
.close{border:0;background:none;padding:.3rem .55rem;font-size:16px;line-height:1;border-radius:99rem}
.close:hover{background:light-dark(#14121f14,#fff2)}
[role=tabpanel]:not(.on){display:none}
.kicker{margin:0 0 .5rem;color:var(--accent);font:600 10.5px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase}
.lede{margin:0 0 .8rem;font-size:13px;line-height:1.5}
.bullets{display:block;margin:0 0 .8rem;padding-left:1rem;list-style:disc}
.bullets li{display:list-item;margin:.2rem 0}
a{color:inherit;text-underline-offset:2px}
.more{margin:.2rem 0 0}.more a{color:var(--accent);font-weight:600;text-decoration:none}
section{padding:.6rem .8rem;border-bottom:1px solid var(--line)}
section:last-child{border:0}
h3{margin:0 0 .4rem;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--dim)}
section h3+div>h3{margin-top:.8rem}
dl{display:grid;grid-template-columns:auto auto;gap:.15rem 1rem;margin:0}
dt{color:var(--dim)}dd{margin:0;text-align:end}
small{display:block;color:var(--dim);font-size:11px}
dd small{display:inline}
.big{margin:0;font-size:28px;font-weight:700;line-height:1}.big span{font-size:12px;font-weight:400;color:var(--dim)}
.spark{display:block;width:100%;height:30px;margin:.3rem 0 .5rem}
.spark polyline{fill:none;stroke:currentColor;stroke-width:1.5;vector-effect:non-scaling-stroke}
.note{margin:.3rem 0;color:var(--dim)}
meter{display:block;width:100%;height:.5rem}
ul{list-style:none;margin:.3rem 0 0;padding:0;display:grid;gap:.35rem}
li{display:grid;grid-template-columns:auto 1fr;gap:.5rem;align-items:start}
.dot{width:.6rem;height:.6rem;margin-top:.3em;border-radius:50%;background:var(--dim)}
.yes .dot{background:var(--yes)}.no .dot{background:var(--no)}.na .dot{background:none;border:1px solid var(--dim)}
.row{display:grid;grid-template-columns:1fr auto;gap:0 .5rem;margin:0 0 .5rem}
.row output{color:var(--dim)}
.row input{grid-column:1/-1;width:100%;margin:.2rem 0 0;accent-color:var(--fg)}
input[type=color]{height:1.6rem;padding:0;border:1px solid var(--line);border-radius:.3rem;background:none}
[hidden]{display:none!important}
.pair{display:flex;gap:.5rem;align-items:center;justify-content:space-between;margin:0 0 .3rem}
.btn{padding:.3rem .7rem;border:1px solid var(--line);border-radius:99rem;background:none}
.btn[aria-pressed=true]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.pick{display:flex;gap:.4rem;align-items:center;color:var(--dim)}
select{padding:.2rem .3rem;border:1px solid var(--line);border-radius:.3rem;background:none}
.reset{display:block;margin:.6rem 0 0 auto}
`;

/* The edge tab: a slim handle on the window's right edge, vertically centred; the controls slide out beside it. It dims
   with the dock on hover devices and wakes on hover or focus. */
const PLAYBACK_CSS = `
:host{all:initial;color-scheme:inherit;position:fixed;z-index:9;inset:50% 0 auto auto;translate:0 -50%;
  --bg:light-dark(#fffe,#0f0e18f0);--fg:light-dark(#14121f,#f4f1ff);--dim:light-dark(#5d5a70,#a29fb8);--line:light-dark(#14121f1f,#fff2);
  font:12px/1.45 system-ui,sans-serif;font-variant-numeric:tabular-nums;color:var(--fg)}
.tab{display:flex;align-items:center;filter:drop-shadow(0 .5rem 1.2rem #0004)}
button,input{font:inherit;color:inherit}
button{cursor:pointer}
:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.handle{display:flex;flex-direction:column;align-items:center;gap:.5rem;padding:.8rem .45rem;border:0;border-radius:.8rem 0 0 .8rem;
  background:var(--bg);box-shadow:0 0 0 1px var(--line);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-weight:600}
.handle:hover{background:light-dark(#fff,#1a1828f5)}
.word{writing-mode:vertical-rl;rotate:180deg;letter-spacing:.04em}
.icon{inline-size:.7rem;aspect-ratio:1;background:currentColor;clip-path:polygon(15% 0,100% 50%,15% 100%)}
.handle[data-state=paused] .icon{clip-path:polygon(0 0,35% 0,35% 100%,0 100%,0 0,65% 0,100% 0,100% 100%,65% 100%,65% 0)}
.handle[data-state=ended] .icon,.handle[data-state=still] .icon{clip-path:none;border-radius:2px;scale:.85}
.body{display:grid;gap:.7rem;inline-size:min(14rem,calc(100vw - 4rem));padding:.8rem;border-radius:.9rem 0 0 .9rem;
  background:var(--bg);box-shadow:0 0 0 1px var(--line);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.tab:has(.body:not([hidden])) .handle{margin-inline-end:-1px}
[hidden]{display:none!important}
@media (prefers-reduced-motion:no-preference){.body{animation:out .18s ease-out}}
@keyframes out{from{opacity:0;translate:.6rem 0}}
.buttons{display:flex;gap:.4rem}
.btn{flex:1;padding:.35rem .7rem;border:1px solid var(--line);border-radius:99rem;background:none;font-weight:600}
.btn:hover{background:light-dark(#14121f14,#fff2)}
.btn[aria-pressed=true]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.row{display:grid;grid-template-columns:1fr auto;gap:0 .5rem}
.row output{color:var(--dim)}
.row input{grid-column:1/-1;inline-size:100%;margin:.25rem 0 0;accent-color:var(--fg)}
.switch{display:flex;justify-content:space-between;align-items:center;cursor:pointer}
.switch input{appearance:none;position:relative;inline-size:2.1rem;block-size:1.2rem;margin:0;border-radius:99rem;background:var(--line);cursor:pointer;transition:background .15s}
.switch input::before{content:"";position:absolute;inset:.15rem auto .15rem .15rem;aspect-ratio:1;border-radius:50%;background:var(--bg);box-shadow:0 1px 2px #0004;transition:translate .15s}
.switch input:checked{background:var(--fg)}
.switch input:checked::before{translate:.9rem 0}
.progress{block-size:3px;border-radius:99rem;background:var(--line);overflow:hidden}
.progress i{display:block;block-size:100%;background:var(--fg);transform-origin:0 50%;scale:0 1}
.state,.reduced{margin:0;color:var(--dim)}
.state:empty{display:none}
:disabled{opacity:.45;cursor:not-allowed}
@media (hover:hover){:host{animation:idle .6s 3s both}:host(:hover),:host(:focus-within){animation:none}}
@media (prefers-reduced-motion:reduce){:host{animation-duration:0s}}
@keyframes idle{to{opacity:.35}}
`;

let panel;

const TABS = [
  { id: 'about', label: 'About', sections: [aboutSection] },
  { id: 'controls', label: 'Controls', sections: [controlsSection] },
  { id: 'stats', label: 'Stats', sections: SECTIONS },
];

class SceneStats extends HTMLElement {
  connectedCallback() {
    const root = this.attachShadow({ mode: 'open' });
    data.params ??= [];
    this.sections = TABS.flatMap((t) => t.sections);
    root.innerHTML = `<style>${CSS_TEXT}</style>
      <div id="sheet" popover="manual" role="dialog" aria-label="${esc(data.title)}">
        <header><div role="tablist" aria-label="${esc(data.title)}">${TABS.map((t) =>
          `<button role="tab" id="tab-${t.id}" aria-controls="panel-${t.id}" aria-selected="false" tabindex="-1">${t.label}</button>`).join('')}</div>
          <button class="close" aria-label="Close">×</button></header>
        ${TABS.map((t) => `<div role="tabpanel" id="panel-${t.id}" aria-labelledby="tab-${t.id}">${t.sections.map((s) =>
          `<section aria-label="${s.title}">${t.sections.length > 1 ? `<h3>${s.title}</h3>` : ''}<div></div></section>`).join('')}</div>`).join('')}
      </div>`;
    const bodies = [...root.querySelectorAll('section > div')];
    this.sections.forEach((s, i) => { s.body = bodies[i]; s.render(s.body); });
    this.sheet = root.getElementById('sheet');
    this.tabs = [...root.querySelectorAll('[role=tab]')];

    // The dock buttons: About before Source, Controls and the live fps (Stats) after it
    const tools = document.querySelector('.scene-dock .tools');
    const make = (t, html) => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.tab = t.id; b.innerHTML = html;
      b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', () => (this.tab === t.id && this.sheet.matches(':popover-open') ? this.close() : this.open(t.id)));
      return b;
    };
    this.buttons = {
      about: make(TABS[0], 'About'),
      controls: make(TABS[1], 'Controls'),
      stats: make(TABS[2], '<i class="fps-dot"></i><output>–</output><span class="unit">fps</span>'),
    };
    this.buttons.stats.classList.add('fps');
    this.buttons.stats.setAttribute('aria-label', 'Stats');
    tools?.prepend(this.buttons.about);
    tools?.append(this.buttons.controls, this.buttons.stats);
    this.fps = this.buttons.stats.querySelector('output');

    this.tabs.forEach((b, i) => {
      b.addEventListener('click', () => this.open(TABS[i].id));
      // Arrow keys move along the tabs, as tablists do
      b.addEventListener('keydown', (e) => {
        const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
        if (!d) return;
        e.preventDefault(); e.stopPropagation();
        const n = this.tabs[(i + d + this.tabs.length) % this.tabs.length];
        n.focus(); n.click();
      });
    });
    root.querySelector('.close').addEventListener('click', () => this.close());
    this.sheet.addEventListener('toggle', (e) => {
      const open = e.newState === 'open';
      store.set('tab', open ? this.tab : '');
      this.sync();
      if (open) this.update();
    });
    // Manual popovers don't light-dismiss, so the scene stays usable with the sheet open; Escape closes it.
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.sheet.matches(':popover-open') && !document.getElementById('scene-source')?.open) this.close();
    });
    const saved = store.get('tab');
    if (TABS.some((t) => t.id === saved)) this.open(saved);
    addEventListener('resize', () => this.update());
  }

  open(id) {
    this.tab = id;
    document.getElementById('scene-source')?.close(); // one panel at a time
    if (!this.sheet.matches(':popover-open')) this.sheet.showPopover();
    store.set('tab', id);
    this.sync();
    this.update();
  }

  close() { if (this.sheet?.matches(':popover-open')) this.sheet.hidePopover(); }

  sync() {
    const open = this.sheet.matches(':popover-open');
    TABS.forEach((t, i) => {
      const on = t.id === this.tab;
      this.tabs[i].setAttribute('aria-selected', on);
      this.tabs[i].tabIndex = on ? 0 : -1;
      this.sheet.querySelector(`#panel-${t.id}`).classList.toggle('on', on);
      this.buttons[t.id].setAttribute('aria-expanded', open && on);
    });
    document.querySelector('.scene-dock')?.classList.toggle('awake', open); // the dock stays lit while the sheet is open
  }

  update() {
    this.fps.value = frames.fps;
    // Green at 55+ fps, amber at 30+, red below.
    this.buttons.stats.style.setProperty('--state', frames.fps >= 55 ? '#5fd38d' : frames.fps >= 30 ? '#f5c451' : '#ff8a80');
    syncPlayback(); // CSS restarts animations when their properties change; keep new ones at the chosen speed and loop
    if (!this.sheet.matches(':popover-open')) return;
    TABS.find((t) => t.id === this.tab)?.sections.forEach((s) => s.update?.(s.body));
  }
}

if (data && window === window.top) {
  customElements.define('scene-stats', SceneStats);
  panel = document.body.appendChild(document.createElement('scene-stats'));
  customElements.define('scene-playback', ScenePlayback);
  playback = document.body.appendChild(document.createElement('scene-playback'));
  syncPlayback();
}
