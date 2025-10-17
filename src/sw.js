const CACHE = 'ne-cache-v2'
const ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.ico', '/vite.svg']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')))
  } else {
    e.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached
        return fetch(req)
          .then((res) => {
            const copy = res.clone()
            caches
              .open(CACHE)
              .then((c) => c.put(req, copy))
              .catch(() => {})
            return res
          })
          .catch(() => cached)
      }),
    )
  }
})
