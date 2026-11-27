/** Render the gallery's still images from the built site: run `pnpm build`, then `pnpm og [slug…]`, and commit the images.
 *
 * For each scene, one frame (at #card, so no chrome) becomes:
 *   sites/posters/<slug>.jpg      960×600, the gallery poster
 *   sites/posters/<slug>-sm.jpg   480×300, the reel thumbnail and technique-page face
 *   sites/og/<slug>.jpg           1200×630, the link-preview image
 * and the gallery itself becomes sites/og/index.jpg.
 *
 * The frame is chosen, not waited for: every animation is paused at `meta.poster.time` seconds (default 4), so the same
 * build always gives the same picture. `meta.poster.scheme` ("light" or "dark", default dark) picks the colour scheme.
 * Name slugs to render only those scenes; with none, everything is rendered.
 *
 * Needs Playwright with Chromium, which isn't a project dependency; install it globally or run with NODE_PATH set. */
import { createServer } from 'node:http';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dist = path.join(root, 'dist');
const ogDir = path.join(root, 'sites/og');
const posterDir = path.join(root, 'sites/posters');

let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch {
  console.error('pnpm og needs Playwright: install it globally (npm i -g playwright) or set NODE_PATH to where it lives.');
  process.exit(1);
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  else if (!path.extname(p)) p += '.html'; // clean URLs, as on Vercel
  try {
    const body = await readFile(path.join(dist, p));
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const all = (await readdir(path.join(dist, 'scenes'), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
const wanted = process.argv.slice(2);
const slugs = wanted.length ? all.filter((s) => wanted.includes(s)) : all;
await Promise.all([mkdir(ogDir, { recursive: true }), mkdir(posterDir, { recursive: true })]);

const browser = await chromium.launch();
/** Load a scene, let it settle, then hold every animation at the chosen second. */
async function frame(page, slug, time) {
  await page.goto(`${base}/scenes/${slug}/#card`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600); // scene scripts and first transitions
  await page.evaluate((ms) => {
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms; }
  }, time * 1000);
  await page.waitForTimeout(150);
}

for (const slug of slugs) {
  const meta = JSON.parse(await readFile(path.join(root, 'scenes', slug, 'meta.json'), 'utf8'));
  const { time = 4, scheme = 'dark' } = meta.poster ?? {};
  // Posters are laid out at a desktop window (1440×900) and scaled down, so they show the scene as it is meant to be seen
  for (const [file, scale] of [[`${slug}.jpg`, 2 / 3], [`${slug}-sm.jpg`, 1 / 3]]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: scale, colorScheme: scheme });
    const page = await ctx.newPage();
    await frame(page, slug, time);
    await page.screenshot({ path: path.join(posterDir, file), type: 'jpeg', quality: scale < 0.5 ? 72 : 78 });
    await ctx.close();
    console.log(`sites/posters/${file}`);
  }
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, colorScheme: scheme });
  const page = await ctx.newPage();
  await frame(page, slug, time);
  await page.screenshot({ path: path.join(ogDir, `${slug}.jpg`), type: 'jpeg', quality: 80 });
  await ctx.close();
  console.log(`sites/og/${slug}.jpg`);
}

if (!wanted.length) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto(`${base}/`, { waitUntil: 'load' });
  await page.waitForTimeout(2500); // the featured scene settles
  await page.screenshot({ path: path.join(ogDir, 'index.jpg'), type: 'jpeg', quality: 80 });
  await ctx.close();
  console.log('sites/og/index.jpg');
}
await browser.close();
server.close();
