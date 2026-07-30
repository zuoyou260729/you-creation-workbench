/* ==========================================
   服务 worker - 应用壳缓存 + 离线缓存 + 重连合并
   版本升级后旧缓存自动清理；data/ 走 network-first 保证重连后拿到云端最新数据
   ========================================== */
const CACHE = 'you-workbench-v2';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './css/words.css',
  './js/app.js',
  './js/words-db.js',
  './js/words-ui.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
  './assets/icon.svg',
  './data/topic-douyin.json',
  './data/topic-bilibili.json',
  './data/topic-xiaohongshu.json',
  './data/hot-videos.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // data/ 目录：network-first，离线时回退缓存（重连后自动拿最新）
  if (url.pathname.includes('/data/')) {
    event.respondWith(
      fetch(event.request).then(resp => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(event.request, copy));
        }
        return resp;
      }).catch(() => caches.match(event.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // 应用壳：cache-first，命中即返回；未命中再走网络并缓存
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
