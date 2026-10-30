// Service worker: caches every file so the app works 100% offline
const CACHE = 'expense-tracker';   // changed from v1
const FILES = [
  './', 'index.html', 'manifest.json',
  'css/styles.css',
  'js/db.js', 'js/auth.js', 'js/app.js',
  'lib/chart.umd.js',
  'fonts/Cinzel.ttf',                  // added
  'img/psu-logo.png', 'img/icon-192.png', 'img/icon-512.png'
];
 
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {}))))
      .then(() => self.skipWaiting())
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
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).catch(() => caches.match('index.html')))
  );
});
