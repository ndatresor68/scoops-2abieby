/**
 * Utilitaires pour localStorage - Mode hors ligne simplifié
 * Stocke les parcelles en attente de synchronisation
 */

const STORAGE_KEY = "scoops_parcelles_pending"

/**
 * Sauvegarder une parcelle en attente de synchronisation
 */
export function saveParcelleOffline(parcelleData) {
  try {
    const pending = getPendingParcelles()
    const data = {
      ...parcelleData,
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      synced: false,
    }
    
    pending.push(data)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending))
    console.log("[localStorage] Parcelle sauvegardée hors ligne:", data)
    return data
  } catch (error) {
    console.error("[localStorage] Erreur lors de la sauvegarde:", error)
    throw error
  }
}

/**
 * Récupérer toutes les parcelles en attente de synchronisation
 */
export function getPendingParcelles() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored).filter((p) => !p.synced)
  } catch (error) {
    console.error("[localStorage] Erreur lors de la récupération:", error)
    return []
  }
}

/**
 * Marquer une parcelle comme synchronisée
 */
export function markParcelleSynced(id) {
  try {
    const pending = getPendingParcelles()
    const updated = pending.map((p) => {
      if (p.id === id) {
        return { ...p, synced: true, syncedAt: Date.now() }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    console.log("[localStorage] Parcelle marquée comme synchronisée:", id)
  } catch (error) {
    console.error("[localStorage] Erreur lors de la mise à jour:", error)
  }
}

/**
 * Supprimer une parcelle synchronisée
 */
export function deleteSyncedParcelle(id) {
  try {
    const pending = getPendingParcelles()
    const filtered = pending.filter((p) => p.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    console.log("[localStorage] Parcelle synchronisée supprimée:", id)
  } catch (error) {
    console.error("[localStorage] Erreur lors de la suppression:", error)
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
