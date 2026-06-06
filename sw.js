const CACHE_NAME = 'medchat-v1';

const LOCAL_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/storage.js',
  './js/extractor.js',
  './js/context.js',
  './js/api.js',
  './js/ui.js',
  './js/app.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(LOCAL_ASSETS)
        .then(() => {
          return Promise.allSettled(
            CDN_ASSETS.map(url =>
              fetch(url, { mode: 'cors' })
                .then(r => r.ok ? cache.put(url, r) : null)
                .catch(() => null)
            )
          );
        });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.hostname === 'openrouter.ai') return;

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request){
  const cached = await caches.match(request);
  if (cached) return cached;
  try{
    const response = await fetch(request);
    if (response && response.ok && response.type !== 'opaque'){
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  }catch(e){
    return new Response('Hors-ligne — ressource non disponible dans le cache.', {
      status: 503, headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
  }
}

async function staleWhileRevalidate(request){
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || await fetchPromise;
}