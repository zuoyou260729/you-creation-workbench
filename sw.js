/* ==========================================
   服务 worker - 应用壳缓存 + 离线缓存 + 重连合并
   版本升级后旧缓存自动清理；data/ 走 network-first 保证重连后拿到云端最新数据
   ========================================== */
const CACHE = 'you-workbench-v29';

// 安装时只缓存核心文件（HTML/CSS/JS/manifest/应用图标/data），
// 物品分类图标改为按需缓存（首次访问时由 fetch 事件自动缓存），
// 避免安装阶段下载大量图标文件导致手机端加载极慢。
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './css/styles.css',
  './css/items.css',
  './css/words.css',
  './js/app.js',
  './js/items.js',
  './js/sync-config.js',
  './js/words-db.js',
  './js/words-ui.js',
  './sw.js',
  './assets/apple-touch-icon.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/icon.svg',
  './data/hot-videos.json',
  './data/topic-bilibili.json',
  './data/topic-douyin.json',
  './data/topic-xiaohongshu.json'
];

self.addEventListener('install', event => {
  // 逐个缓存核心文件：单个失败不会导致整体安装中断（Promise.allSettled），
  // 失败的文件会在 fetch 事件中按需从网络获取并缓存。
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(CORE_ASSETS.map(url => cache.add(url)))
    ).then(() => self.skipWaiting())
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

  // 应用壳 + 图标：cache-first，命中即返回；未命中再走网络并缓存
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
