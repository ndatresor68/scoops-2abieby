/**
 * Service avancé pour cache et synchronisation offline
 * Combine localStorage, IndexedDB, et Service Worker
 */

import { getIndexedDBService } from './indexedDBService'

const CACHE_VERSION = 'v1'
const CACHE_NAMES = {
  api: `api-${CACHE_VERSION}`,
  static: `static-${CACHE_VERSION}`,
  images: `images-${CACHE_VERSION}`,
}

/**
 * Stratégie de cache hybride
 */
export class HybridCacheManager {
  constructor() {
    this.db = getIndexedDBService()
    this.memoryCache = new Map()
    this.maxMemoryCacheSize = 50 // MB
  }

  async init() {
    await this.db.init()
  }

  /**
   * Cache-First strategy: cherche en cache d'abord
   */
  async getWithCacheFirst(key, fetchFn, options = {}) {
    const { ttl = 5 * 60 * 1000, store = 'producteurs' } = options

    // 1. Vérifier memory cache
    const memCached = this.memoryCache.get(key)
    if (memCached && memCached.expires > Date.now()) {
      return memCached.value
    }

    // 2. Vérifier localStorage pour données petites
    const lsKey = `cache_${key}`
    const lsCached = localStorage.getItem(lsKey)
    if (lsCached) {
      const data = JSON.parse(lsCached)
      if (data.expires > Date.now()) {
        this.memoryCache.set(key, { value: data.value, expires: data.expires })
        return data.value
      }
    }

    // 3. Vérifier IndexedDB pour données volumineuses
    try {
      const dbCached = await this.db.get(store, key)
      if (dbCached && dbCached.expires > Date.now()) {
        this.memoryCache.set(key, { value: dbCached.value, expires: dbCached.expires })
        return dbCached.value
      }
    } catch (e) {
      console.warn('IndexedDB get failed:', e)
    }

    // 4. Fetch from network
    try {
      const value = await fetchFn()

      const expires = Date.now() + ttl

      // Stocker en cache (multi-tier)
      this.memoryCache.set(key, { value, expires })

      // Stocker en localStorage si petit
      const size = new Blob([JSON.stringify(value)]).size
      if (size < 1024 * 100) {
        // < 100KB
        localStorage.setItem(lsKey, JSON.stringify({ value, expires }))
      } else {
        // Stocker en IndexedDB si gros
        try {
          await this.db.set(store, { id: key, value, expires })
        } catch (e) {
          console.warn('IndexedDB set failed:', e)
        }
      }

      return value
    } catch (error) {
      console.error('Fetch failed and no cache available:', error)
      throw error
    }
  }

  /**
   * Network-First strategy: cherche réseau d'abord
   */
  async getWithNetworkFirst(key, fetchFn, options = {}) {
    const { ttl = 5 * 60 * 1000, store = 'producteurs', timeout = 3000 } = options

    // Essayer réseau avec timeout
    try {
      const promise = fetchFn()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )

      const value = await Promise.race([promise, timeoutPromise])
      const expires = Date.now() + ttl

      // Mettre en cache le résultat
      this.memoryCache.set(key, { value, expires })

      const size = new Blob([JSON.stringify(value)]).size
      if (size < 1024 * 100) {
        localStorage.setItem(`cache_${key}`, JSON.stringify({ value, expires }))
      }

      return value
    } catch (error) {
      // Fallback sur cache
      const lsCached = localStorage.getItem(`cache_${key}`)
      if (lsCached) {
        const data = JSON.parse(lsCached)
        return data.value
      }

      throw error
    }
  }

  /**
   * Invalider le cache
   */
  invalidateCache(pattern = null) {
    if (!pattern) {
      this.memoryCache.clear()
      return
    }

    for (const [key] of this.memoryCache.entries()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key)
      }
    }
  }

  /**
   * Nettoyer les anciens caches
   */
  async cleanup() {
    const expired = []

    for (const [key, data] of this.memoryCache.entries()) {
      if (data.expires < Date.now()) {
        expired.push(key)
      }
    }

    expired.forEach((key) => this.memoryCache.delete(key))

    // Nettoyer localStorage
    const now = Date.now()
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith('cache_')) {
        const data = JSON.parse(localStorage.getItem(key) || '{}')
        if (data.expires && data.expires < now) {
          localStorage.removeItem(key)
        }
      }
    }
  }

  /**
   * Obtenir les stats du cache
   */
  getCacheStats() {
    let memorySize = 0
    for (const [, data] of this.memoryCache.entries()) {
      memorySize += new Blob([JSON.stringify(data.value)]).size
    }

    return {
      memoryItems: this.memoryCache.size,
      memorySize: `${(memorySize / 1024 / 1024).toFixed(2)} MB`,
      localStorageItems: Object.keys(localStorage).filter((k) =>
        k.startsWith('cache_')
      ).length,
    }
  }
}

// Singleton
let cacheManager = null

export function getCacheManager() {
  if (!cacheManager) {
    cacheManager = new HybridCacheManager()
    cacheManager.init()
  }
  return cacheManager
}

/**
 * Background Sync pour uploads offline
 */
export class BackgroundSyncManager {
  constructor() {
    this.queue = []
    this.isOnline = navigator.onLine
  }

  async init() {
    window.addEventListener('online', () => this.onOnline())
    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  async enqueue(fn, metadata = {}) {
    const item = {
      id: Date.now(),
      fn,
      metadata,
      retries: 0,
      maxRetries: 3,
    }

    this.queue.push(item)

    // Si online, synchroniser immédiatement
    if (this.isOnline) {
      await this.sync()
    }
  }

  async onOnline() {
    this.isOnline = true
    await this.sync()
  }

  async sync() {
    const failed = []

    for (const item of this.queue) {
      try {
        await item.fn()
        // Succès: retirer de la queue
        this.queue = this.queue.filter((i) => i.id !== item.id)
      } catch (error) {
        item.retries++
        if (item.retries >= item.maxRetries) {
          failed.push(item)
          this.queue = this.queue.filter((i) => i.id !== item.id)
        }
      }
    }

    return { synced: this.queue.length, failed }
  }

  getQueueSize() {
    return this.queue.length
  }
}

// Singleton
let bgSync = null

export function getBackgroundSyncManager() {
  if (!bgSync) {
    bgSync = new BackgroundSyncManager()
    bgSync.init()
  }
  return bgSync
}
