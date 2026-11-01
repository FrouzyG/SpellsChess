// SpellsChess: сервис-воркер. Файлы игры берутся из сети (чтобы обновления приходили сразу),
// а если сети нет, показываются из кэша. Запросы к серверу игры (ходы, комнаты) никогда не кэшируются.
const CACHE = 'spellschess-v1';
const SHELL = ['./', 'index.html', 'style.css', 'script.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
const LIVE = ['/events', '/send', '/quick', '/ping', '/lobby', '/report'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => { })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== location.origin) return;
    if (LIVE.some(p => url.pathname.startsWith(p))) return;
    e.respondWith(
        fetch(req).then(res => {
            if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
            return res;
        }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
});
