/**
 * Service d'optimisation pour mobile
 * Gère la compression, le cache intelligente et les stratégies de chargement
 */

/**
 * Détecte si l'utilisateur est sur mobile et la qualité de connexion
 * @returns {object} {isMobile, isLowBandwidth, effectiveType}
 */
export function detectMobileAndBandwidth() {
  // Détection mobile
  const userAgent = navigator.userAgent || navigator.vendor || window.opera || ''
  const isMobile =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()) ||
    window.innerWidth <= 768

  // Détection connexion (Network Information API)
  let effectiveType = '4g'
  let isLowBandwidth = false

  if ('connection' in navigator) {
    const connection = navigator.connection
    effectiveType = connection.effectiveType || '4g'
    isLowBandwidth = effectiveType === '2g' || effectiveType === '3g' || connection.saveData
  }

  return {
    isMobile,
    isLowBandwidth,
    effectiveType,
  }
}

/**
 * Stratégie de cache intelligente pour mobile
 * Adapte la durée du cache selon la connexion
 */
export const CACHE_STRATEGY = {
  // Cache agressif sur connexion faible
  LOW_BANDWIDTH: {
    dashboard: 10 * 60 * 1000, // 10 minutes
    producteurs: 15 * 60 * 1000, // 15 minutes
    default: 5 * 60 * 1000, // 5 minutes
  },
  // Cache modéré sur connexion normale
  NORMAL_BANDWIDTH: {
    dashboard: 5 * 60 * 1000, // 5 minutes
    producteurs: 8 * 60 * 1000, // 8 minutes
    default: 3 * 60 * 1000, // 3 minutes
  },
}

/**
 * Obtient la stratégie de cache appropriée
 */
export function getCacheStrategy() {
  const { isLowBandwidth } = detectMobileAndBandwidth()
  return isLowBandwidth ? CACHE_STRATEGY.LOW_BANDWIDTH : CACHE_STRATEGY.NORMAL_BANDWIDTH
}

/**
 * Compresse les données JSON pour réduire la taille du transfer
 * Utilisé pour les requêtes mobiles
 */
export function compressJsonData(data) {
  // Enlever les champs null/undefined inutiles
  if (Array.isArray(data)) {
    return data.map((item) => compressJsonData(item))
  }

  if (data && typeof data === 'object') {
    const compressed = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        compressed[key] = compressJsonData(value)
      }
    }
    return compressed
  }

  return data
}

/**
 * Optimise les requêtes pour mobile
 * Retourne les données essentielles uniquement
 */
export function getOptimizedQueryFields(entityType) {
  const fields = {
    producteurs: 'id,nom,prenom,email,telephone,centre_id,created_at',
    achats: 'id,producteur_id,quantite,prix_unitaire,created_at,status',
    centres: 'id,nom,email,telephone',
    pesees: 'id,producteur_id,quantite,created_at',
  }

  return fields[entityType] || '*'
}

/**
 * Rate limiter pour les requêtes
 * Prévient de surcharger le réseau mobile
 */
export class RequestThrottler {
  constructor(maxRequests = 5, timeWindow = 1000) {
    this.maxRequests = maxRequests
    this.timeWindow = timeWindow
    this.requests = []
  }

  async throttle(fn) {
    const now = Date.now()

    // Enlever les requêtes anciennes
    this.requests = this.requests.filter((time) => now - time < this.timeWindow)

    // Si limite atteinte, attendre
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0]
      const waitTime = this.timeWindow - (now - oldestRequest)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
      return this.throttle(fn) // Réessayer après le délai
    }

    this.requests.push(now)
    return fn()
  }
}

/**
 * Détecte si le device supporte les performances optimales
 */
export function getDeviceCapabilities() {
  const cores = navigator.hardwareConcurrency || 2
  const memory = navigator.deviceMemory || 4

  return {
    lowEndDevice: cores <= 2 && memory <= 2,
    cores,
    memory,
  }
}

/**
 * Précharge les ressources critiques pour mobile
 */
export function preloadCriticalResources() {
  if (typeof document === 'undefined') return

  // Précharger les fonts
  const fontLink = document.createElement('link')
  fontLink.rel = 'preload'
  fontLink.as = 'font'
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
  fontLink.crossOrigin = 'anonymous'
  document.head.appendChild(fontLink)

  // Précharger les images essentielles
  const criticalImages = ['/logo-scoops.png']
  criticalImages.forEach((src) => {
    const img = document.createElement('link')
    img.rel = 'preload'
    img.as = 'image'
    img.href = src
    document.head.appendChild(img)
  })
}

/**
 * Deferred requests pour batch les requêtes sur mobile
 * Réduit la surcharge réseau
 */
export class DeferredRequestBatcher {
  constructor(batchSize = 5, batchDelay = 200) {
    this.batchSize = batchSize
    this.batchDelay = batchDelay
    this.queue = []
    this.timer = null
  }

  add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject })

      if (this.queue.length >= this.batchSize) {
        this.flush()
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.batchDelay)
      }
    })
  }

  async flush() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    const batch = this.queue.splice(0, this.batchSize)
    if (batch.length === 0) return

    // Exécuter les requêtes en parallèle mais de manière contrôlée
    const promises = batch.map(async ({ fn, resolve, reject }) => {
      try {
        const result = await fn()
        resolve(result)
      } catch (error) {
        reject(error)
      }
    })

    await Promise.allSettled(promises)
  }
}
