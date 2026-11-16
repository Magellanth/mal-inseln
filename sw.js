// Service Worker: hält die App offline verfügbar. Fasst den Spielstand (localStorage) nie an.
// Bei jedem Update VERSION erhöhen – dann lädt das Handy alle Dateien gemeinsam neu.

const VERSION = 'mal-inseln-v5';
const FONT_CACHE = 'mal-inseln-fonts';

const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'js/app.js',
  'js/days.js',
  'js/fx.js',
  'js/hints.js',
  'js/model.js',
  'js/quiz.js',
  'js/rounds.js',
  'js/sound.js',
  'js/stickers.js',
  'js/storage.js',
  'js/ui/album.js',
  'js/ui/core.js',
  'js/ui/dom.js',
  'js/ui/home.js',
  'js/ui/parents.js',
  'js/ui/play.js',
  'js/ui/result.js',
  'js/ui/row.js',
  'js/ui/welcome.js',
  'js/ui/widgets.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

// Nur eigene, veraltete Caches löschen – auf github.io teilen sich alle Projekte eines Kontos denselben Speicher.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('mal-inseln-') && k !== VERSION && k !== FONT_CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Schriften von Google: einmal laden, dann aus dem Cache.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        try {
          const res = await fetch(request);
          if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
          return res;
        } catch {
          return new Response('', { status: 504 });
        }
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // App-Dateien: immer der zusammengehörige Stand aus dem Cache, Netz nur als Rückfall.
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const key = request.mode === 'navigate' ? 'index.html' : request;
      const hit = await cache.match(key, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(request);
      if (res.ok && res.type === 'basic') cache.put(key, res.clone());
      return res;
    }),
  );
});
