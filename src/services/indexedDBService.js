/**
 * IndexedDB Service pour cache persistant offline
 * Permet de stocker des gigabytes de données localement
 */

const DB_NAME = 'SCOOPS_CACHE'
const DB_VERSION = 1

const STORES = {
  producteurs: 'producteurs',
  achats: 'achats',
  centres: 'centres',
  pesees: 'pesees',
  users: 'users',
  syncQueue: 'syncQueue',
}

class IndexedDBService {
  constructor() {
    this.db = null
    this.isReady = false
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        this.isReady = true
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // Créer les stores avec indexing
        for (const [key, store] of Object.entries(STORES)) {
          if (!db.objectStoreNames.contains(store)) {
            const objStore = db.createObjectStore(store, { keyPath: 'id' })
            objStore.createIndex('timestamp', 'timestamp', { unique: false })
            objStore.createIndex('synced', 'synced', { unique: false })
          }
        }
      }
    })
  }

  async set(store, data) {
    if (!this.isReady) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([store], 'readwrite')
      const objStore = transaction.objectStore(store)
      const request = objStore.add({
        ...data,
        timestamp: Date.now(),
        synced: false,
      })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async get(store, id) {
    if (!this.isReady) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([store], 'readonly')
      const objStore = transaction.objectStore(store)
      const request = objStore.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async getAll(store, limit = 1000) {
    if (!this.isReady) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([store], 'readonly')
      const objStore = transaction.objectStore(store)
      const request = objStore.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        resolve(request.result.slice(0, limit))
      }
    })
  }

  async clear(store) {
    if (!this.isReady) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([store], 'readwrite')
      const objStore = transaction.objectStore(store)
      const request = objStore.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async deleteOldRecords(store, daysOld = 7) {
    if (!this.isReady) await this.init()

    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000
    const allRecords = await this.getAll(store, Infinity)
    const oldRecords = allRecords.filter((r) => r.timestamp < cutoffTime)

    for (const record of oldRecords) {
      await this.delete(store, record.id)
    }

    return oldRecords.length
  }

  async delete(store, id) {
    if (!this.isReady) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([store], 'readwrite')
      const objStore = transaction.objectStore(store)
      const request = objStore.delete(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async bulkSet(store, dataArray) {
    if (!this.isReady) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([store], 'readwrite')
      const objStore = transaction.objectStore(store)

      dataArray.forEach((data) => {
        objStore.add({
          ...data,
          timestamp: Date.now(),
          synced: false,
        })
      })

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve(dataArray.length)
    })
  }
}

// Singleton instance
let dbService = null

export function getIndexedDBService() {
  if (!dbService) {
    dbService = new IndexedDBService()
  }
  return dbService
}

export default IndexedDBService
