import { useEffect, useRef, useState } from "react"

/**
 * Hook personnalisé pour tracker la position GPS en temps réel
 * Utilise navigator.geolocation.watchPosition() pour suivre les déplacements
 * 
 * @param {Function} onPositionUpdate - Callback appelé à chaque mise à jour de position
 * @param {Boolean} isTracking - Si true, démarre le tracking
 * @param {Number} accuracyThreshold - Seuil de précision en mètres (défaut: 10)
 * @returns {Object} { currentPosition, error, accuracy }
 */
export default function useGpsTracker({ onPositionUpdate, isTracking, accuracyThreshold = 20 }) {
  const [currentPosition, setCurrentPosition] = useState(null)
  const [error, setError] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [lowAccuracyWarning, setLowAccuracyWarning] = useState(false)
  const watchIdRef = useRef(null)
  const errorTimeoutRef = useRef(null)
  const lastUpdateTimeRef = useRef(0)
  const MIN_UPDATE_INTERVAL = 3000 // 3 secondes entre chaque point
  const ERROR_DELAY = 10000 // 10 secondes avant d'afficher l'erreur

  useEffect(() => {
    if (!isTracking) {
      // Arrêter le tracking
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      // Nettoyer le timeout d'erreur
      if (errorTimeoutRef.current !== null) {
        clearTimeout(errorTimeoutRef.current)
        errorTimeoutRef.current = null
      }
      setError(null)
      setLowAccuracyWarning(false)
      return
    }

    // Vérifier que la géolocalisation est disponible
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre navigateur")
      return
    }

    // Options pour une meilleure précision GPS
    const options = {
      enableHighAccuracy: true,
      maximumAge: 0, // Ne pas utiliser de position en cache
      timeout: 10000,
    }

    // Réinitialiser l'erreur et l'avertissement
    setError(null)
    setLowAccuracyWarning(false)

    // Démarrer un timer pour afficher l'erreur après 10 secondes si pas de position
    errorTimeoutRef.current = setTimeout(() => {
      if (!currentPosition) {
        setError("Position GPS indisponible")
      }
    }, ERROR_DELAY)

    // Fonction de succès
    const successCallback = (position) => {
      // Annuler le timeout d'erreur car on a reçu une position
      if (errorTimeoutRef.current !== null) {
        clearTimeout(errorTimeoutRef.current)
        errorTimeoutRef.current = null
      }

      const now = Date.now()
      
      // Limiter à 1 point toutes les 3 secondes pour performance
      if (now - lastUpdateTimeRef.current < MIN_UPDATE_INTERVAL) {
        return
      }
      
      const { latitude, longitude, accuracy: posAccuracy } = position.coords
      
      // Vérifier la précision (seuil: 20 mètres)
      if (posAccuracy > accuracyThreshold) {
        // Afficher un avertissement mais continuer à tracker
        setLowAccuracyWarning(true)
        console.warn(`[GpsTracker] Précision faible: ${posAccuracy}m (seuil: ${accuracyThreshold}m)`)
        // Ne pas bloquer complètement, mais avertir l'utilisateur
      } else {
        setLowAccuracyWarning(false)
      }

      const newPosition = {
        lat: latitude,
        lng: longitude,
        accuracy: posAccuracy,
        timestamp: position.timestamp,
      }

      lastUpdateTimeRef.current = now
      setCurrentPosition(newPosition)
      setAccuracy(posAccuracy)
      setError(null) // Effacer l'erreur si on reçoit une position

      // Notifier le composant parent
      if (onPositionUpdate) {
        onPositionUpdate(newPosition)
      }
    }

    // Fonction d'erreur
    const errorCallback = (err) => {
      // Attendre 10 secondes avant d'afficher l'erreur
      if (errorTimeoutRef.current === null) {
        errorTimeoutRef.current = setTimeout(() => {
          let errorMessage = "Position GPS indisponible"
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = "Permission de géolocalisation refusée. Veuillez autoriser l'accès dans les paramètres."
              break
            case err.POSITION_UNAVAILABLE:
              errorMessage = "Position GPS indisponible"
              break
            case err.TIMEOUT:
              errorMessage = "Position GPS indisponible"
              break
            default:
              errorMessage = "Position GPS indisponible"
          }

          setError(errorMessage)
          console.error("[GpsTracker] Error:", err)
        }, ERROR_DELAY)
      }
    }

    // Démarrer le watch
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        successCallback,
        errorCallback,
        options
      )
    } catch (err) {
      setError(`Erreur lors du démarrage du tracking: ${err.message}`)
    }

    // Cleanup
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (errorTimeoutRef.current !== null) {
        clearTimeout(errorTimeoutRef.current)
        errorTimeoutRef.current = null
      }
    }
  }, [isTracking, onPositionUpdate, accuracyThreshold, currentPosition])

  return {
    currentPosition,
    error,
    accuracy,
    lowAccuracyWarning,
  }
}
