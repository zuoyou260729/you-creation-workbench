/* ==========================================
   服务 worker - 应用壳缓存 + 离线缓存 + 重连合并
   版本升级后旧缓存自动清理。
   缓存策略（重要）：
   - 代码文件（HTML/JS/CSS/manifest）：network-first —— 联网时始终取最新版本，
     离线才回退缓存。解决「已部署新版但手机一直显示旧版」的问题。
   - data/：network-first（重连后自动拿到最新采集数据）
   - 图标等静态资源：cache-first（避免每次加载大量图片导致卡顿）
   ========================================== */
const CACHE = 'you-workbench-v48';

// 需要「始终取最新」的文件后缀（命中即走 network-first）
function isCodeFile(pathname){
  return pathname.endsWith('.html') || pathname.endsWith('.js') ||
         pathname.endsWith('.css') || pathname.endsWith('.json');
}

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

  // data/ 与 代码文件（HTML/JS/CSS/JSON）：network-first，离线时回退缓存
  if (url.pathname.includes('/data/') || isCodeFile(url.pathname) || url.pathname.endsWith('/')) {
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
