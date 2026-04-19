const CACHE = 'oncoguia-v1';
const ASSETS = ['/', '/index.html', '/css/styles.css', '/js/app.js'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
    // Não faz cache de chamadas à API
    if (e.request.url.includes('/api/')) return;
    e.respondWith(
        caches.match(e.request).then(r => r || fetch(e.request))
    );
});
