/* Route Command service worker: the app shell and catalog load from cache first (works offline),
 * and refresh in the background so the next load has the latest version. */
const CACHE = 'rc-v1';
const SHELL = ['/index.html', '/style.css', '/app.js', '/data.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
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
