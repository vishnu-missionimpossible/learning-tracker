/**
 * Service worker: makes the app installable and lets the shell open offline.
 * Strategy: network-first for our own files (so updates show immediately),
 * cache as fallback. Firebase/API traffic is never intercepted.
 */
const CACHE = 'learning-tracker-v2';
const SHELL = [
    './', 'index.html', 'manifest.json',
    'src/css/styles.css',
    'src/js/utils.js', 'src/js/fun.js', 'src/js/analytics.js', 'src/js/settings.js',
    'src/js/auth.js', 'src/js/courseManager.js', 'src/js/shareManager.js',
    'src/js/metricsManager.js', 'src/js/ui.js', 'src/js/app.js',
    'config/firebase.js', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);
    if (req.method !== 'GET' || url.origin !== self.location.origin) return;

    event.respondWith(
        fetch(req)
            .then(res => {
                const copy = res.clone();
                caches.open(CACHE).then(c => c.put(req, copy));
                return res;
            })
            .catch(() => caches.match(req).then(hit => hit || caches.match('index.html')))
    );
});
