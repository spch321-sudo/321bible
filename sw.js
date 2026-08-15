/* 321聖經講義｜羅馬書 — Service Worker
   目標：第一次連線之後，完全離線可用。
   策略：App 殼採 network-first（確保更新拿得到），失敗時回退快取；
         圖示等靜態檔採 cache-first。 */

const VERSION = 'v2.0.0';
const CACHE = '321bible-' + VERSION;

const SHELL = [
  './',
  './index.html',
  './sc/',
  './sc/index.html',
  './en/',
  './en/index.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isDoc = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  if (isDoc) {
    // network-first：有網路就拿最新的，沒網路就用快取
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // cache-first：圖示等靜態資源
  e.respondWith(
    caches.match(req).then(hit =>
      hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => hit)
    )
  );
});

// 讓網頁可以主動要求立即更新
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
