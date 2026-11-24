/* はしって地図あつめ: オフライン対応(Service Worker)
   - 自分のサイトのファイルは「まずネットから取る → だめなら保存したものを使う」ので、更新はすぐ反映され、電波がなくても起動できます。
   - 地図の画像や道路データなど、他サイトへの通信にはいっさい触れません。 */
const VER = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = 'hashitte-' + VER;
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'lib/leaflet/leaflet.css', 'lib/leaflet/leaflet.js', 'lib/maplibre/maplibre-gl.css', 'lib/maplibre/maplibre-gl.js', 'lib/maplibre/leaflet-maplibre-gl.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(CORE.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('hashitte-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fontHost = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.host);
  if (url.origin !== self.location.origin && !fontHost) return;           // 地図・道路データなどは、そのままネットへ
  e.respondWith(fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: false }).then(r => r || caches.match(req, { ignoreSearch: true })).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
