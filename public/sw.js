// ForwarderOS Service Worker v1.0
// Strategi caching:
//   - App shell (HTML, CSS, JS): Cache First → fast load
//   - API data: Network First dengan fallback → selalu fresh
//   - Static assets (icons, fonts): Cache First → tidak berubah
//   - Halaman offline: fallback jika network dan cache gagal

const CACHE_VERSION  = 'v1'
const SHELL_CACHE    = `fos-shell-${CACHE_VERSION}`
const DATA_CACHE     = `fos-data-${CACHE_VERSION}`
const STATIC_CACHE   = `fos-static-${CACHE_VERSION}`

// File yang selalu di-cache saat install (app shell)
const SHELL_URLS = [
  '/',
  '/dashboard',
  '/shipments',
  '/offline',
]

// Prefix URL yang dianggap API / data (Network First)
const API_PREFIXES = ['/api/']

// Prefix URL yang merupakan static asset (Cache First, long TTL)
const STATIC_PREFIXES = [
  '/_next/static/',
  '/icons/',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
]

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache =>
      cache.addAll(SHELL_URLS).catch(err => {
        // Jangan gagal install jika beberapa URL tidak bisa di-cache
        console.warn('[SW] Beberapa shell URL gagal di-cache:', err)
      })
    ).then(() => self.skipWaiting())
  )
})

// ─── Activate — hapus cache lama ──────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  const validCaches = new Set([SHELL_CACHE, DATA_CACHE, STATIC_CACHE])

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => !validCaches.has(key))
          .map(key => {
            console.log('[SW] Hapus cache lama:', key)
            return caches.delete(key)
          })
      )
    ).then(() => self.clients.claim())
  )
})

// ─── Fetch — strategi per URL ─────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests, browser extensions, Sentry tunnel
  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/monitoring')) return
  if (!url.protocol.startsWith('http')) return

  // 1. Static assets → Cache First (CSS, JS bundles, fonts, icons)
  if (STATIC_PREFIXES.some(p => request.url.startsWith(p) || url.pathname.startsWith(p))) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // 2. API routes → Network First (data harus fresh)
  if (API_PREFIXES.some(p => url.pathname.startsWith(p))) {
    event.respondWith(networkFirst(request, DATA_CACHE))
    return
  }

  // 3. Page navigation → Network First dengan offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(navigateWithFallback(request))
    return
  }

  // 4. Lainnya → Network First
  event.respondWith(networkFirst(request, SHELL_CACHE))
})

// ─── Strategi ─────────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Resource tidak tersedia offline', { status: 503 })
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok && response.status !== 206) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Network gagal → coba dari cache
    const cached = await caches.match(request)
    if (cached) return cached
    // API gagal offline → return JSON error
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tidak ada koneksi internet', offline: true }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }
    return new Response('Tidak ada koneksi', { status: 503 })
  }
}

async function navigateWithFallback(request) {
  try {
    // Coba network dulu
    const response = await fetch(request)
    // Cache halaman yang berhasil diload
    const cache = await caches.open(SHELL_CACHE)
    cache.put(request, response.clone())
    return response
  } catch {
    // Network gagal → coba cache
    const cached = await caches.match(request)
    if (cached) return cached
    // Tidak ada cache → halaman offline
    const offlinePage = await caches.match('/offline')
    if (offlinePage) return offlinePage
    return new Response(OFFLINE_HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try { payload = event.data.json() }
  catch { payload = { title: 'ForwarderOS', body: event.data.text() } }

  const options = {
    body:    payload.body ?? '',
    icon:    '/icons/icon-192x192.png',
    badge:   '/icons/icon-96x96.png',
    tag:     payload.tag ?? 'forwarderos-notif',
    data:    payload.data ?? {},
    actions: payload.actions ?? [],
    requireInteraction: payload.requireInteraction ?? false,
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'ForwarderOS', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      const existing = windowClients.find(c => c.url.includes(url) && 'focus' in c)
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})

// ─── Inline offline page ──────────────────────────────────────────────────────

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offline — ForwarderOS</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #f8fafc; color: #1e293b;
    min-height: 100vh; display: flex;
    align-items: center; justify-content: center;
    padding: 2rem;
  }
  .card {
    background: white; border-radius: 1.5rem;
    border: 1px solid #e2e8f0; padding: 3rem 2.5rem;
    max-width: 400px; width: 100%; text-align: center;
  }
  .icon {
    width: 64px; height: 64px; border-radius: 50%;
    background: #fef3c7; display: flex;
    align-items: center; justify-content: center;
    margin: 0 auto 1.5rem;
    font-size: 2rem;
  }
  h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
  p { font-size: 0.875rem; color: #64748b; line-height: 1.6; margin-bottom: 1.5rem; }
  button {
    background: #3b82f6; color: white;
    border: none; padding: 0.75rem 2rem;
    border-radius: 0.75rem; font-size: 0.875rem;
    font-weight: 600; cursor: pointer; width: 100%;
  }
  button:hover { background: #2563eb; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h1>Tidak Ada Koneksi</h1>
    <p>ForwarderOS membutuhkan koneksi internet untuk menampilkan data terbaru. Periksa koneksi Anda dan coba lagi.</p>
    <button onclick="location.reload()">Coba Lagi</button>
  </div>
</body>
</html>`
