// Service Worker pour SCOOPS PWA
const CACHE_VERSION = 'v1'
const CACHE_NAME = `scoops-${CACHE_VERSION}`

// Assets à mettre en cache au démarrage
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/cacao.png',
  '/cacao.svg',
]

// Installation
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  self.clients.claim()
})

// Fetch - Stratégie: Network First, fallback Cache
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Traiter les requêtes API différemment
  if (request.url.includes('/api') || request.url.includes('supabase')) {
    event.respondWith(networkFirst(request))
  } else {
    // Pour les assets, utiliser cache first
    event.respondWith(cacheFirst(request))
  }
})

// Network first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    })
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.log('[SW] Fetch failed:', request.url)
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    })
  }
}

// Gérer les notifications push si nécessaire
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/cacao.png',
      badge: '/cacao.svg',
      tag: data.tag || 'notification',
      requireInteraction: data.requireInteraction || false,
    }
    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

// Gérer les clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Vérifier si un onglet est déjà ouvert
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url === '/' && 'focus' in clientList[i]) {
          return clientList[i].focus()
        }
      }
      // Sinon ouvrir un nouvel onglet
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})
