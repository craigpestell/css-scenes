import { readFile, writeFile, mkdir, readdir, copyFile, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform, browserslistToTargets } from 'lightningcss';
import { generateTokens } from './tokens.js';
import { renderLost, modeOf, MODES, describe, sceneChrome } from '../../../sites/index/cards.js';
import { siteBar, renderPlayer, renderFilters, renderTiles, renderTechTiles, countWord } from '../../../sites/index/home.js';
import { catalogue as techCatalogue, techniquesOf } from '../../../sites/techniques/techniques.js';
import { renderTechniquesIndex, renderTechnique } from '../../../sites/techniques/pages.js';
import { headTags, FAVICON } from '../../../sites/shared/head.js';
import { renderSource } from '../../../sites/source/source.js';
import { sceneStats, statsTags } from '../../../sites/stats/stats.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dist = path.join(root, 'dist');
const targets = browserslistToTargets(['chrome >= 120', 'safari >= 17.4', 'firefox >= 128']);
const BUDGET = 14 * 1024; // brotli bytes, HTML + CSS + JS

/** Where build-time imports resolve: `lib/<name>` for scene snippets, `site/<name>` for the site's shared styles. */
const IMPORTS = { lib: 'packages/lib/src', site: 'sites/shared' };

/** Inline `@import "lib/<name>"` and `@import "site/<name>"` lines, then run Lightning CSS. */
async function bundleCss(source, tokensCss, filename = 'scene.css', minify = true) {
  const parts = [tokensCss];
  for (const m of source.matchAll(/@import\s+["'](lib|site)\/([\w-]+)["'];?/g)) {
    parts.push(await readFile(path.join(root, IMPORTS[m[1]], `${m[2]}.css`), 'utf8'));
  }
  parts.push(source.replace(/@import[^;]+;/g, ''));
  const { code } = transform({
    filename,
    code: Buffer.from(parts.join('\n')),
    minify,
    targets,
  });
  return code.toString();
}

async function build() {
  const tokensCss = await generateTokens(path.join(root, 'packages/tokens/tokens.json'));
  const slugs = (await readdir(path.join(root, 'scenes'), { withFileTypes: true }))
    .filter((d) => d.isDirectory()).map((d) => d.name)
    // A folder holding only a brief is a scene awaiting approval: skip it until it has an index.html.
    .filter((slug) => existsSync(path.join(root, 'scenes', slug, 'index.html')));
  const report = [];
  const shown = []; // what the index and the technique pages need from each scene
  const sources = new Map(); // slug -> the stylesheets a technique page may quote: scene.css, then lib snippets it imports
  const measure = (slug, out, extra = 0) => {
    const br = brotliCompressSync(Buffer.from(out)).length;
    const budget = BUDGET + extra;
    const row = { slug, raw: Buffer.byteLength(out), gzip: gzipSync(out).length, br, budget, ok: br <= budget };
    report.push(row);
    return row;
  };
  // Link-preview images are pre-rendered by `pnpm og`; pages without one get none
  const og = new Set((await readdir(path.join(root, 'sites/og')).catch(() => [])).filter((f) => f.endsWith('.jpg')));
  const ogImage = (name) => (og.has(`${name}.jpg`) ? `/og/${name}.jpg` : null);
  const sourceCss = await bundleCss(await readFile(path.join(root, 'sites/source/source.css'), 'utf8'), tokensCss, 'source.css');

  const scenes = await Promise.all(slugs.map(async (slug) => {
    const dir = path.join(root, 'scenes', slug);
    const [html, css, meta, js, writeup] = await Promise.all([
      readFile(path.join(dir, 'index.html'), 'utf8'),
      readFile(path.join(dir, 'scene.css'), 'utf8'),
      readFile(path.join(dir, 'meta.json'), 'utf8').then(JSON.parse),
      readFile(path.join(dir, 'scene.js'), 'utf8').catch(() => null), // optional; most scenes are CSS only
      readFile(path.join(dir, 'writeup.md'), 'utf8').catch(() => null), // optional; shown on the source page
    ]);
    return { slug, html, css, meta, js, writeup, title: meta.title };
  }));

  for (const [i, { slug, html, css, meta, js, writeup }] of scenes.entries()) {
    // Previous/next wrap around, in the same order as the index cards
    const prev = scenes.at(i - 1);
    const next = scenes[(i + 1) % scenes.length];
    const chrome = sceneChrome({ slug, title: meta.title, prev, next, mode: modeOf(meta) });
    const script = js ? `<script type="module">${js.replaceAll('</script', '<\\/script')}</script>` : '';
    const minCss = await bundleCss(css, tokensCss);
    const description = describe(html);
    // Head tags go first, while the parser is still in the head; the header follows the styles so it comes first in
    // focus order, ahead of the stage
    const head = headTags({ root: '../../', title: `${meta.title} · CSS Scenes`, description, path: `/scenes/${slug}/`, image: ogImage(slug) });
    const out = html.replace('<!--css-->', () => `${head}<style>${minCss}</style>${chrome}`) + script;
    const outDir = path.join(dist, 'scenes', slug);
    await mkdir(outDir, { recursive: true });
    const size = measure(slug, out, meta.exceptions?.extraBytes);
    // Optional scenes/<slug>/assets/ (a photo, say) ships beside the page; it is outside the page budget
    if (existsSync(path.join(root, 'scenes', slug, 'assets'))) await cp(path.join(root, 'scenes', slug, 'assets'), path.join(outDir, 'assets'), { recursive: true });
    const markup = html.replace('<!--css-->', () => chrome);
    await writeFile(path.join(outDir, 'index.html'), out + statsTags(sceneStats({ meta, markup, css: minCss, js, size })));
    const bundled = await bundleCss(css, tokensCss, 'scene.css', false);
    await writeFile(path.join(outDir, 'source.html'), renderSource({ slug, meta, html, css, js, writeup, bundled, size, description, pageCss: sourceCss, hint: MODES[modeOf(meta)].hint,
      head: headTags({ root: '../../', title: `${meta.title}: how it's made · CSS Scenes`, description, path: `/scenes/${slug}/source`, image: ogImage(slug) }) }));
    shown.push({ slug, meta, description, hasJs: Boolean(js), size, techniques: techniquesOf(meta) });
    sources.set(slug, [{ file: 'scene.css', css }, ...await Promise.all([...css.matchAll(/@import\s+["']lib\/([\w-]+)["']/g)]
      .map(async ([, name]) => ({ file: `lib/${name}.css`, css: await readFile(path.join(root, IMPORTS.lib, `${name}.css`), 'utf8') })))]);
  }

  // Techniques: an index and one page per CSS feature, with the lines of each scene that uses it
  const catalogue = techCatalogue(shown);
  const techCss = await bundleCss(await readFile(path.join(root, 'sites/techniques/techniques.css'), 'utf8'), tokensCss, 'techniques.css');
  await mkdir(path.join(dist, 'techniques'), { recursive: true });
  await writeFile(path.join(dist, 'techniques', 'index.html'), renderTechniquesIndex({ catalogue, css: techCss,
    head: headTags({ root: '/', title: 'Techniques · CSS Scenes', description: 'The CSS features behind every scene, with their Baseline status and the exact lines that use them.', path: '/techniques/', image: ogImage('index') }) }));
  for (const t of catalogue) {
    await mkdir(path.join(dist, 'techniques', t.key), { recursive: true });
    await writeFile(path.join(dist, 'techniques', t.key, 'index.html'), renderTechnique({ t, catalogue, sources, scenes: shown, css: techCss,
      head: headTags({ root: '/', title: `${t.name} · CSS Scenes`, description: t.summary, path: `/techniques/${t.key}/`, image: ogImage(t.uses[0].slug) }) }));
  }
  // The scene list the scene pages' switcher reads (kept out of each page, so out of its budget)
  await writeFile(path.join(dist, 'scenes.json'), JSON.stringify(shown.map((s) => ({ slug: s.slug, title: s.meta.title, mode: modeOf(s.meta) }))));

  // Index page: one card per scene, generated from the scenes above
  const site = path.join(root, 'sites/index');
  const [indexHtml, indexCss] = await Promise.all([
    readFile(path.join(site, 'index.html'), 'utf8'),
    readFile(path.join(site, 'index.css'), 'utf8'),
  ]);
  // The template names the first scene on screen (hero:slug) and the bento's opening tiles (bento:slug=size ...)
  const featured = shown.find((s) => s.slug === indexHtml.match(/hero:([\w-]+)/)?.[1]) ?? shown[0];
  const layout = [...(indexHtml.match(/bento:([^\n]*)/)?.[1] ?? '').matchAll(/([\w-]+)=(xl|wide|sm)/g)].map((m) => [m[1], m[2]]);
  const avg = shown.reduce((t, s) => t + s.size.br, 0) / shown.length;
  const homeJs = await readFile(path.join(site, 'home.client.js'), 'utf8');
  const index = indexHtml
    .replace(/<!--\n\s*The first scene[\s\S]*?-->\n/, '')
    .replace('<!--head-->', () => headTags({ root: '', title: 'CSS Scenes', description: 'Full-window scenes and animations built with modern CSS, each with its source, a write-up and the techniques it uses.', path: '/', image: ogImage('index') }))
    .replace('<!--css-->', `<style>${await bundleCss(indexCss, tokensCss, 'index.css')}</style>`)
    .replace('<!--sitebar-->', () => siteBar({ root: '', here: 'home', over: true, aside: `${shown.length} scenes · avg ${(avg / 1024).toFixed(1)} KB` }))
    .replace('<!--player-->', () => renderPlayer(shown, featured))
    .replace('<!--count-word-->', countWord(shown.length))
    .replaceAll('<!--count-->', String(shown.length))
    .replace('<!--avg-->', (avg / 1024).toFixed(1))
    .replaceAll('<!--budget-->', String(BUDGET / 1024))
    .replaceAll('<!--tech-count-->', String(catalogue.length))
    .replace('<!--filters-->', () => renderFilters(shown))
    .replace('<!--tiles-->', () => renderTiles(shown, layout))
    .replace('<!--techniques-->', () => renderTechTiles(catalogue, '', 8))
    .replace('<!--js-->', () => `<script type="module">${homeJs}</script>`);
  await writeFile(path.join(dist, 'index.html'), index);

  // 404: every scene, so a broken link still lands somewhere to go
  const [lostHtml, lostCss] = await Promise.all([
    readFile(path.join(root, 'sites/404/404.html'), 'utf8'),
    readFile(path.join(root, 'sites/404/404.css'), 'utf8'),
  ]);
  await writeFile(path.join(dist, '404.html'), lostHtml
    .replace('<!--head-->', () => headTags({ root: '/', title: 'Not found · CSS Scenes', description: '', path: '/', image: null }))
    .replace('<!--css-->', `<style>${await bundleCss(lostCss, tokensCss, '404.css')}</style>`)
    .replace('<!--scenes-->', () => renderLost(shown)));

  // Shared files: the site icon and the link-preview images
  await writeFile(path.join(dist, 'favicon.svg'), FAVICON);
  await mkdir(path.join(dist, 'og'), { recursive: true });
  await Promise.all([...og].map((f) => copyFile(path.join(root, 'sites/og', f), path.join(dist, 'og', f))));
  // Posters: the gallery's stills, rendered by `pnpm og`
  if (existsSync(path.join(root, 'sites/posters'))) await cp(path.join(root, 'sites/posters'), path.join(dist, 'posters'), { recursive: true });
  await writeFile(path.join(dist, 'stats.js'), await readFile(path.join(root, 'sites/stats/panel.js')));
  measure('(index)', index);

  console.table(report);
  if (report.some((r) => !r.ok)) { console.error('Budget exceeded'); process.exitCode = 1; }
}

/** Requests that arrive together (the index loads every scene in an iframe) share one build. */
let pending;
const rebuild = () => (pending ??= build().finally(() => { pending = undefined; }));

async function dev() {
  await build();
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    else if (!path.extname(p)) p = existsSync(path.join(dist, `${p}.html`)) ? `${p}.html` : `${p}/index.html`; // clean URLs, as on Vercel
    try {
      await rebuild(); // rebuild on every request: simple and fast enough for tiny scenes
      const file = path.join(dist, p);
      if (!file.startsWith(dist + path.sep)) throw new Error('bad path');
      const body = await readFile(file); // read before sending headers so a failure can still 404
      res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      if (res.headersSent) return res.end();
      res.writeHead(404, { 'content-type': types['.html'] });
      res.end(await readFile(path.join(dist, '404.html')).catch(() => 'not found')); // as Vercel serves it
    }
  }).listen(4321, () => console.log('http://localhost:4321/'));
}

const cmd = process.argv[2];
if (cmd === 'build') await build();
else if (cmd === 'dev') await dev();
else console.log('usage: cli.js build|dev');
