import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform, browserslistToTargets } from 'lightningcss';
import { generateTokens } from './tokens.js';
import { renderCard, renderHero, renderFilters, renderLost, modeOf, MODES, describe, sceneChrome } from '../../../sites/index/cards.js';
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
  const cards = [];
  const shown = []; // what the index needs from each scene
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
    const markup = html.replace('<!--css-->', () => chrome);
    await writeFile(path.join(outDir, 'index.html'), out + statsTags(sceneStats({ meta, markup, css: minCss, js, size, description })));
    const bundled = await bundleCss(css, tokensCss, 'scene.css', false);
    await writeFile(path.join(outDir, 'source.html'), renderSource({ slug, meta, html, css, js, writeup, bundled, size, pageCss: sourceCss, hint: MODES[modeOf(meta)].hint,
      head: headTags({ root: '../../', title: `${meta.title}: how it's made · CSS Scenes`, description, path: `/scenes/${slug}/source`, image: ogImage(slug) }) }));
    shown.push({ slug, meta, description, hasJs: Boolean(js), size });
    cards.push(renderCard(shown.at(-1)));
  }

  // Index page: one card per scene, generated from the scenes above
  const site = path.join(root, 'sites/index');
  const [indexHtml, indexCss] = await Promise.all([
    readFile(path.join(site, 'index.html'), 'utf8'),
    readFile(path.join(site, 'index.css'), 'utf8'),
  ]);
  // <!--hero:slug--> in the template picks the featured scene; it falls back to the first
  const featured = shown.find((s) => s.slug === indexHtml.match(/<!--hero:([\w-]+)-->/)?.[1]) ?? shown[0];
  const avg = shown.reduce((t, s) => t + s.size.br, 0) / shown.length;
  const index = indexHtml
    .replace('<!--head-->', () => headTags({ root: '', title: 'CSS Scenes', description: 'Full-window scenes and animations built with modern CSS. No images, and no JavaScript unless a scene needs it.', path: '/', image: ogImage('index') }))
    .replace('<!--css-->', `<style>${await bundleCss(indexCss, tokensCss, 'index.css')}</style>`)
    .replace(/<!--hero:[\w-]*-->/, () => renderHero(featured))
    .replaceAll('<!--count-->', String(cards.length))
    .replace('<!--avg-->', (avg / 1024).toFixed(1))
    .replaceAll('<!--budget-->', String(BUDGET / 1024))
    .replace('<!--filters-->', () => renderFilters(shown.map((s) => modeOf(s.meta))))
    .replace('<!--cards-->', () => cards.join('\n'));
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
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
  createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
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
