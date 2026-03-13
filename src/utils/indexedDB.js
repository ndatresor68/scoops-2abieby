/**
 * Utilitaires pour IndexedDB - Mode hors ligne
 * Stocke les parcelles en attente de synchronisation
 */

const DB_NAME = "scoops_parcelles_db"
const DB_VERSION = 1
const STORE_NAME = "parcelles_pending"

/**
 * Ouvrir la base de données IndexedDB
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error("Erreur lors de l'ouverture de la base de données"))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      // Créer l'object store s'il n'existe pas
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true })
        objectStore.createIndex("timestamp", "timestamp", { unique: false })
        objectStore.createIndex("synced", "synced", { unique: false })
      }
    }
  })
}

/**
 * Sauvegarder une parcelle en attente de synchronisation
 */
export async function saveParcelleOffline(parcelleData) {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    const data = {
      ...parcelleData,
      timestamp: Date.now(),
      synced: false,
    }

    await store.add(data)
    console.log("[IndexedDB] Parcelle sauvegardée hors ligne:", data)
    return data
  } catch (error) {
    console.error("[IndexedDB] Erreur lors de la sauvegarde:", error)
    throw error
  }
}

/**
 * Récupérer toutes les parcelles en attente de synchronisation
 */
export async function getPendingParcelles() {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], "readonly")
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index("synced")

    return new Promise((resolve, reject) => {
      const request = index.getAll(false) // false = non synchronisées
      
      request.onsuccess = () => {
        resolve(request.result || [])
      }
      
      request.onerror = () => {
        reject(new Error("Erreur lors de la récupération des parcelles"))
      }
    })
  } catch (error) {
    console.error("[IndexedDB] Erreur lors de la récupération:", error)
    return []
  }
}

/**
 * Marquer une parcelle comme synchronisée
 */
export async function markParcelleSynced(id) {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    const request = store.get(id)
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const parcelle = request.result
        if (parcelle) {
          parcelle.synced = true
          parcelle.syncedAt = Date.now()
          
          const updateRequest = store.put(parcelle)
          updateRequest.onsuccess = () => {
            console.log("[IndexedDB] Parcelle marquée comme synchronisée:", id)
            resolve()
          }
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          resolve()
        }
      }
      
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error("[IndexedDB] Erreur lors de la mise à jour:", error)
    throw error
  }
}

/**
 * Supprimer une parcelle synchronisée
 */
export async function deleteSyncedParcelle(id) {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    await store.delete(id)
    console.log("[IndexedDB] Parcelle synchronisée supprimée:", id)
  } catch (error) {
    console.error("[IndexedDB] Erreur lors de la suppression:", error)
    throw error
  }
}

/**
 * Vérifier si on est en ligne
 */
export function isOnline() {
  return navigator.onLine
}

/**
 * Écouter les changements de connexion
 */
export function onOnlineStatusChange(callback) {
  window.addEventListener("online", () => callback(true))
  window.addEventListener("offline", () => callback(false))
  
  // Retourner une fonction de nettoyage
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}
