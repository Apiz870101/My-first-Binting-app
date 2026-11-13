/* Service worker Bintang.
   - Fail aplikasi disimpan semasa pemasangan, jadi game boleh dibuka tanpa internet.
   - Fon Google disimpan selepas digunakan sekali.
   - Semua laluan relatif, jadi sesuai untuk GitHub Pages (https://nama.github.io/repo/).
   Apabila anda mengemas kini index.html, tukar nombor VERSION supaya peranti mengambil versi baharu. */
const VERSION = 'v1';
const SHELL_CACHE = 'bintang-shell-' + VERSION;
const FONT_CACHE = 'bintang-fonts-v1';
const SHELL_FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith('bintang-') && name !== SHELL_CACHE && name !== FONT_CACHE)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

async function staleWhileRevalidate(event, cacheName, fallbackUrl) {
  const request = event.request;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: true });

  const fetching = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(fetching);
    return cached;
  }

  const response = await fetching;
  if (response) return response;

  if (fallbackUrl) {
    const fallback = await cache.match(fallbackUrl);
    if (fallback) return fallback;
  }
  return new Response('Tiada sambungan internet.', {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    const fallback = request.mode === 'navigate' ? './index.html' : null;
    event.respondWith(staleWhileRevalidate(event, SHELL_CACHE, fallback));
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(event, FONT_CACHE, null));
  }
});
