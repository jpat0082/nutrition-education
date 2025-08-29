const CACHE = 'ne-cache-v1'
const ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/vite.svg']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')))
  } else {
    e.respondWith(
      caches.match(req).then(
        (res) =>
          res ||
          fetch(req).then((r) => {
            const copy = r.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
            return r
          }),
      ),
    )
  }
})
