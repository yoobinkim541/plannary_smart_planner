// v164 -> v165 : site/legacy/, site/pages/ 로 파일 이동하면서 캐시 목록 경로 갱신
// (버전 숫자를 올려야 접속 중인 사용자 브라우저가 예전 경로가 박힌 캐시를 버리고 새로 받음)
const CACHE_NAME = 'todo-pwa-cache-v165';
const urlsToCache = [
  '/',
  '/index.html',
  '/redesign/',
  '/redesign/index.html',
  '/site/legacy/style.css',
  '/site/legacy/app.js',
  '/site/legacy/wiki.js',
  '/manifest.json',
  '/site/pages/landing.html',
  '/site/pages/landing.css',
  '/site/pages/login.html',
  '/site/pages/signup.html',
  '/site/pages/auth.css',
  '/site/pages/privacy.html',
  '/site/pages/terms.html',
  '/firebase-init.js',
  '/favicon.ico',
  '/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/site/legacy/i18n/en.js',
  '/site/legacy/i18n/ko.js',
  '/site/legacy/i18n/ja.js',
  '/site/legacy/i18n/zh.js',
  '/site/legacy/i18n/es.js'
];

const APP_SHELL_ASSETS = new Set([
  '/',
  '/index.html',
  '/redesign/',
  '/redesign/index.html',
  '/site/pages/landing.html',
  '/site/pages/login.html',
  '/site/pages/signup.html',
  '/site/pages/privacy.html',
  '/site/pages/terms.html',
  '/site/pages/auth.css',
  '/firebase-init.js',
  '/manifest.json'
]);

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => clients.claim())
  );
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return (await caches.match(request)) || (fallbackUrl ? caches.match(fallbackUrl) : undefined);
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin === self.location.origin && requestUrl.pathname.startsWith('/__/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, '/redesign/'));
    return;
  }

  if (requestUrl.origin === self.location.origin && APP_SHELL_ASSETS.has(requestUrl.pathname)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (
    requestUrl.origin === self.location.origin &&
    ['.js', '.jsx', '.css', '.html'].some(ext => requestUrl.pathname.endsWith(ext))
  ) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
