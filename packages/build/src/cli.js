import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform, browserslistToTargets } from 'lightningcss';
import { generateTokens } from './tokens.js';
import { renderCard, describe, sceneChrome } from '../../../sites/index/cards.js';
import { renderSource } from '../../../sites/source/source.js';
import { sceneStats, statsTags } from '../../../sites/stats/stats.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dist = path.join(root, 'dist');
const targets = browserslistToTargets(['chrome >= 120', 'safari >= 17.4', 'firefox >= 128']);
const BUDGET = 14 * 1024; // brotli bytes, HTML + CSS + JS

/** Inline `@import "lib/<name>"` lines, then run Lightning CSS. */
async function bundleCss(source, tokensCss, filename = 'scene.css', minify = true) {
  const parts = [tokensCss];
  for (const m of source.matchAll(/@import\s+["']lib\/([\w-]+)["'];?/g)) {
    parts.push(await readFile(path.join(root, 'packages/lib/src', `${m[1]}.css`), 'utf8'));
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
    .filter((d) => d.isDirectory()).map((d) => d.name);
  const report = [];
  const cards = [];
  const measure = (slug, out, extra = 0) => {
    const br = brotliCompressSync(Buffer.from(out)).length;
    const budget = BUDGET + extra;
    const row = { slug, raw: Buffer.byteLength(out), gzip: gzipSync(out).length, br, budget, ok: br <= budget };
    report.push(row);
    return row;
  };
  const sourceCss = await bundleCss(await readFile(path.join(root, 'sites/source/source.css'), 'utf8'), tokensCss, 'source.css');

  const scenes = await Promise.all(slugs.map(async (slug) => {
    const dir = path.join(root, 'scenes', slug);
    const [html, css, meta, js] = await Promise.all([
      readFile(path.join(dir, 'index.html'), 'utf8'),
      readFile(path.join(dir, 'scene.css'), 'utf8'),
      readFile(path.join(dir, 'meta.json'), 'utf8').then(JSON.parse),
      readFile(path.join(dir, 'scene.js'), 'utf8').catch(() => null), // optional; most scenes are CSS only
    ]);
    return { slug, html, css, meta, js, title: meta.title };
  }));

  for (const [i, { slug, html, css, meta, js }] of scenes.entries()) {
    // Previous/next wrap around, in the same order as the index cards
    const prev = scenes.at(i - 1);
    const next = scenes[(i + 1) % scenes.length];
    const chrome = sceneChrome({ slug, title: meta.title, prev, next });
    const script = js ? `<script type="module">${js.replaceAll('</script', '<\\/script')}</script>` : '';
    // The header goes straight after the styles so it comes first in focus order, ahead of the stage
    const minCss = await bundleCss(css, tokensCss);
    const out = html.replace('<!--css-->', () => `<style>${minCss}</style>${chrome}`) + script;
    const outDir = path.join(dist, 'scenes', slug);
    await mkdir(outDir, { recursive: true });
    const size = measure(slug, out, meta.exceptions?.extraBytes);
    const markup = html.replace('<!--css-->', () => chrome);
    await writeFile(path.join(outDir, 'index.html'), out + statsTags(sceneStats({ meta, markup, css: minCss, js, size })));
    const bundled = await bundleCss(css, tokensCss, 'scene.css', false);
    await writeFile(path.join(outDir, 'source.html'), renderSource({ slug, meta, html, css, js, bundled, size, pageCss: sourceCss }));
    cards.push(renderCard({ slug, meta, description: describe(html), hasJs: Boolean(js) }));
  }

  // Index page: one card per scene, generated from the scenes above
  const site = path.join(root, 'sites/index');
  const [indexHtml, indexCss] = await Promise.all([
    readFile(path.join(site, 'index.html'), 'utf8'),
    readFile(path.join(site, 'index.css'), 'utf8'),
  ]);
  const index = indexHtml
    .replace('<!--css-->', `<style>${await bundleCss(indexCss, tokensCss, 'index.css')}</style>`)
    .replace('<!--count-->', `${cards.length} scenes`)
    .replace('<!--cards-->', cards.join('\n'));
  await writeFile(path.join(dist, 'index.html'), index);
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
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
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
      if (!res.headersSent) res.writeHead(404);
      res.end('not found');
    }
  }).listen(4321, () => console.log('http://localhost:4321/'));
}

const cmd = process.argv[2];
if (cmd === 'build') await build();
else if (cmd === 'dev') await dev();
else console.log('usage: cli.js build|dev');
