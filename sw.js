/* Route Command service worker: the app shell and catalog load from cache first (works offline),
 * refresh in the background, and unsent submissions are sent even when the app is closed.
 * Bundled by esbuild at deploy time (it imports js/outbox.js); __BUILD__ is the commit hash. */
import { flushOutbox } from './js/outbox.js';

/* New hash per deploy => sw.js changes byte-for-byte, the browser installs it, and the old cache is dropped */
const CACHE = 'rc-' + (typeof __BUILD__ === 'undefined' ? 'dev' : __BUILD__.slice(0, 7));
const SHELL = ['/index.html', '/style.css', '/app.js', '/data.json'];

self.addEventListener('install', (e) => {
  /* cache:'reload' skips the browser's HTTP cache, so a fresh install never stores last deploy's files */
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  /* Every view URL (/credits, /history, ...) is the same page */
  const key = req.mode === 'navigate' ? '/index.html' : req;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached  = await cache.match(key);
    const refresh = fetch(req).then(res => { if (res.ok) cache.put(key, res.clone()); return res; }).catch(() => cached);
    return cached || refresh;
  }));
});

/* Background Sync (Chrome/Android): the page asks for 'flush-outbox' after queueing; the browser fires it when
   the connection is back, even if the app was closed. Elsewhere the page flushes the outbox itself. */
self.addEventListener('sync', (e) => {
  if (e.tag === 'flush-outbox') e.waitUntil(flush());
});

async function flush() {
  const result = await flushOutbox();
  if (result.sent || result.failed) {
    for (const client of await self.clients.matchAll({ type: 'window' })) client.postMessage({ type: 'outbox-changed', sent: result.sent });
  }
  if (result.offline) throw new Error('still offline');   // a rejected sync is retried by the browser later
}
