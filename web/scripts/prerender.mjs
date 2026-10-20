/* After `vite build` + the SSR build: writes static HTML for the public pages, a no-index shell for the app routes,
   and sitemap.xml. Content edits made in the back office are fetched from the live API so the HTML matches the site;
   if the API can't be reached, the built-in copy is used. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

// the app reads saved sign-in tokens at import time; give Node an empty store
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() }; };
globalThis.localStorage = memory();
globalThis.sessionStorage = memory();

const ssr = await import(pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href);

const API = process.env.CONTENT_API ?? 'https://universeportal-api.vercel.app/api/content';
try {
  const res = await fetch(API, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  ssr.applyContent(await res.json());
  console.log('prerender: using live content');
} catch (e) {
  console.warn(`prerender: live content unavailable (${e.message}); using built-in copy`);
}

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!template.includes('<!--head:start-->') || !template.includes('<!--app-->')) throw new Error('index.html is missing the prerender markers');
const page = (url, body) => template
  .replace(/<!--head:start-->[\s\S]*?<!--head:end-->/, ssr.headHtml(ssr.headFor(url)))
  .replace('<!--app-->', body);

const routes = ['/', ...ssr.visibleServices().map((s) => `/services/${s.key}`)];
for (const url of routes) {
  const file = url === '/' ? 'index.html' : `${url.slice(1)}.html`;
  fs.mkdirSync(path.dirname(path.join(dist, file)), { recursive: true });
  fs.writeFileSync(path.join(dist, file), page(url, ssr.render(url)));
}
// sign-in, dashboards and back office: an empty shell that search engines are told not to index
fs.writeFileSync(path.join(dist, 'app.html'), page('/app', ''));

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(dist, 'sitemap.xml'), [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.map((u) => `  <url><loc>${ssr.ORIGIN}${u}</loc><lastmod>${today}</lastmod><changefreq>${u === '/' ? 'weekly' : 'monthly'}</changefreq><priority>${u === '/' ? '1.0' : '0.8'}</priority></url>`),
  '</urlset>', '',
].join('\n'));
fs.rmSync(path.join(root, 'dist-ssr'), { recursive: true, force: true });
console.log(`prerender: ${routes.length} pages, app shell and sitemap written`);
