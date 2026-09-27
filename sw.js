/* 窑洞一号 · Service Worker（PWA 离线外壳 + 安装） */
const CACHE = "yaodong1-v5";
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest",
  "./ydh-appicon-192.png", "./ydh-appicon-512.png", "./data/index.json"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;            // 只处理 GET
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 跨域（API/raw）直连，不缓存

  if (req.mode === "navigate") {               // 页面导航：网络优先，离线回退缓存首页
    e.respondWith(
      fetch(req).catch(() => caches.match("index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // 文库原文走 HTTP Range 分片，缓存 206 会错位，故直连、不缓存
  if (url.pathname.indexOf("/lib/") >= 0) {
    e.respondWith(fetch(req));
    return;
  }

  // 其余静态资源：缓存优先，回退网络并写入缓存
  e.respondWith(
    caches.match(req).then(c => c || fetch(req).then(r => {
      if (r && r.ok && /\.(json|png|webmanifest|html|css|js)$/.test(url.pathname)) {
        const cp = r.clone();
        caches.open(CACHE).then(c2 => c2.put(req, cp)).catch(() => {});
      }
      return r;
    }).catch(() => c))
  );
});
