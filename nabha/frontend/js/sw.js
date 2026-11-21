// Digital Learning Platform - Nabha | Service Worker
// Developed by Piyush and Team
const C = 'nabha-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/common.js',
  '/student/login.html',
  '/student/dashboard.html',
  '/teacher/login.html',
  '/teacher/dashboard.html',
  '/admin/login.html',
  '/admin/dashboard.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(C).then((c) => c.addAll(ASSETS)).catch((err) => console.warn('Cache prefill warning:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== C).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const x = r.clone();
        caches.open(C).then((c) => c.put(e.request, x));
        return r;
      })
      .catch(() =>
        caches.match(e.request).then((r) => r || caches.match('/') || caches.match('/index.html'))
      )
  );
});
