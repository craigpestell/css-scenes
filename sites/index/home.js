/** Render the home page: the player (one scene full-bleed with its title card and the reel of every scene), the
 * collection (a bento of build-time posters that play live on hover), the techniques grid and the about section.
 * Everything here is generated from the scenes; sites/index/index.html holds the words and the layout. */
import { MODES, modeOf } from './cards.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
export const num = (i) => String(i + 1).padStart(2, '0');
const WORDS = 'Zero One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve Thirteen Fourteen Fifteen Sixteen Seventeen Eighteen Nineteen Twenty'.split(' ');
export const countWord = (n) => WORDS[n] ?? String(n);

/** The site bar every page shares. `here` is 'scenes', 'techniques' or 'about'; root is the way back to the site root. */
export const siteBar = ({ root = '/', here, over = false, aside = '' }) => `<header class="sitebar${over ? ' over' : ''}">
  <a class="wordmark" href="${root}"${here === 'home' ? ' aria-current="page"' : ''}>CSS Scenes</a>
  <nav aria-label="Site">
    <a href="${root}#scenes"${here === 'scenes' ? ' aria-current="page"' : ''}>Scenes</a>
    <a href="${root}techniques/"${here === 'techniques' ? ' aria-current="page"' : ''}>Techniques</a>
    <a href="${root}#about">About</a>
  </nav>
  ${aside ? `<span class="aside label">${aside}</span>` : ''}
</header>`;

/** What the player's title card shows for one scene; also the reel's data for swapping scenes in place. */
function card({ slug, meta, description, hasJs, size, techniques }, i) {
  return {
    slug,
    n: num(i),
    title: meta.title,
    mode: MODES[modeOf(meta)].short,
    desc: description,
    chips: [kb(size.br), hasJs ? 'Uses JavaScript' : 'No JavaScript'],
    tech: techniques.slice(0, 4).map((t) => [t.key, t.name]),
  };
}

const chipList = (c) => c.chips.map((x) => `<li>${esc(x)}</li>`).join('')
  + c.tech.map(([key, name]) => `<li><a class="tech" href="techniques/${esc(key)}/">${esc(name)}</a></li>`).join('');

/** The player: the featured scene full-bleed, its title card, and the reel. Without JavaScript the reel's posters are
 * links into each scene; with it they swap the scene in place, and the reel advances on its own until someone picks. */
export function renderPlayer(scenes, featured) {
  const cards = scenes.map(card);
  const c = cards[scenes.indexOf(featured)];
  const reel = cards.map((x) => `<li><a href="scenes/${esc(x.slug)}/" data-slug="${esc(x.slug)}"${x.slug === c.slug ? ' aria-current="true"' : ''}>
      <img src="posters/${esc(x.slug)}-sm.jpg" alt="" width="480" height="300" decoding="async">
      <span><span class="n">${x.n}</span> ${esc(x.title)}</span><i class="bar"></i></a></li>`).join('\n    ');
  return `<section class="screen" aria-labelledby="now-title">
  <div class="frame"><iframe src="scenes/${esc(c.slug)}/#card" title="${esc(c.title)}, playing" tabindex="-1" inert></iframe></div>
  <div class="marquee">
    <p class="now label"><span class="live">Now showing</span> <span data-k="n">${c.n}</span> / ${num(cards.length - 1)} · <span data-k="mode">${esc(c.mode)}</span></p>
    <h2 id="now-title" data-k="title">${esc(c.title)}</h2>
    <p class="desc" data-k="desc">${esc(c.desc)}</p>
    <ul class="chips" role="list" data-k="chips">${chipList(c)}</ul>
    <p class="actions"><a class="btn solid" data-k="enter" href="scenes/${esc(c.slug)}/">Enter scene <span aria-hidden="true">→</span></a> <a class="btn" data-k="source" href="scenes/${esc(c.slug)}/source">How it’s made</a></p>
  </div>
  <nav class="reel" aria-label="Scenes to show here">
    <ol role="list">
    ${reel}
    </ol>
  </nav>
  <script type="application/json" id="reel-data">${JSON.stringify(Object.fromEntries(cards.map((x) => [x.slug, { ...x, chips: chipList(x) }]))).replaceAll('<', '\\u003c')}</script>
</section>`;
}

/** Filter chips for the collection: radios, so :has() filters the bento without JavaScript. */
export function renderFilters(scenes) {
  const modes = scenes.map((s) => modeOf(s.meta));
  const chip = (value, label, n, checked = false) =>
    `<label><input type="radio" name="mode" value="${value}"${checked ? ' checked' : ''}>${esc(label)}<small>${n}</small></label>`;
  return [chip('all', 'All', modes.length, true),
    ...Object.entries(MODES).filter(([m]) => modes.includes(m)).map(([m, { label }]) => chip(m, label, modes.filter((x) => x === m).length))].join('');
}

/**
 * The collection: one poster tile per scene. `layout` names the scenes that open the bento and their sizes, in order
 * ("xl", "wide" or "sm"); the rest follow in gallery order as small tiles. Filtering drops every tile to small.
 */
export function renderTiles(scenes, layout) {
  const order = [...layout.map(([slug]) => scenes.find((s) => s.slug === slug)).filter(Boolean),
    ...scenes.filter((s) => !layout.some(([slug]) => slug === s.slug))];
  const sizeOf = Object.fromEntries(layout);
  return order.map((s) => {
    const mode = modeOf(s.meta);
    const i = scenes.indexOf(s);
    return `    <li class="tile ${sizeOf[s.slug] ?? 'sm'}" data-mode="${mode}">
      <a href="scenes/${esc(s.slug)}/" data-slug="${esc(s.slug)}">
        <span class="poster" style="view-transition-name: scene-${esc(s.slug)}"><img src="posters/${esc(s.slug)}.jpg" alt="" width="960" height="600" loading="lazy" decoding="async"></span>
        <span class="cap"><span class="n">${num(i)}</span> <b>${esc(s.meta.title)}</b> <small>${esc(MODES[mode].short)} · ${esc(kb(s.size.br))}${s.hasJs ? ' · JS' : ''}</small></span>
      </a>
    </li>`;
  }).join('\n');
}

/** The techniques grid: each technique, its Baseline status and the faces of the scenes that use it. */
export const renderTechTiles = (catalogue, root = '', limit = Infinity) => catalogue.slice(0, limit).map((t) => `<li><a class="tech-tile" href="${root}techniques/${esc(t.key)}/">
      <code>${esc(t.name)}</code>
      <span class="status ${t.status.level}">${esc(t.status.label)}</span>
      <span class="uses"><span class="faces">${t.uses.slice(0, 5).map((u) => `<img src="${root}posters/${esc(u.slug)}-sm.jpg" alt="" width="480" height="300" loading="lazy">`).join('')}</span>
      <span class="count">${t.uses.length} scene${t.uses.length === 1 ? '' : 's'} <span aria-hidden="true">→</span></span></span>
    </a></li>`).join('\n    ');
