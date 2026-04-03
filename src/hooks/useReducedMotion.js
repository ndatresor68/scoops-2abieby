import { useEffect, useState } from 'react'

/**
 * Hook pour détecter les préférences de mouvement réduit de l'utilisateur
 * Utilisé pour optimiser les performances sur mobile
 * @returns {boolean} true si les animations doivent être réduites
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Vérifier les préférences initiales
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    // Écouter les changements
    const handleChange = (e) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

/**
 * Utilitaire pour obtenir les styles d'animation optimisés
 * @param {boolean} prefersReducedMotion - Si les animations doivent être réduites
 * @param {object} normalAnimation - Styles d'animation normal
 * @param {object} reducedAnimation - Styles d'animation réduit
 * @returns {object} Styles appropriés selon les préférences
 */
export function getAnimationStyles(prefersReducedMotion, normalAnimation = {}, reducedAnimation = {}) {
  return prefersReducedMotion ? reducedAnimation : normalAnimation
}

/**
 * Optimisation pour les transitions sur mobile
 * Désactive les animations lourdes si battery saver est activé
 */
export function useOptimizedTransition() {
  const [reducedMotion, setReducedMotion] = useState(false)
  const [lowBattery, setLowBattery] = useState(false)

  useEffect(() => {
    // Vérifier prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)

    const handleMotionChange = (e) => {
      setReducedMotion(e.matches)
    }

    // Vérifier battery status (si disponible)
    if ('getBattery' in navigator) {
      navigator.getBattery().then((battery) => {
        const updateBattery = () => {
          setLowBattery(battery.level < 0.2)
        }
        updateBattery()
        battery.addEventListener('levelchange', updateBattery)
      })
    }

    mediaQuery.addEventListener('change', handleMotionChange)
    return () => mediaQuery.removeEventListener('change', handleMotionChange)
  }, [])

  // Si mouvement réduit OU batterie faible, désactiver les animations
  const shouldReduceAnimations = reducedMotion || lowBattery

  return {
    shouldReduceAnimations,
    transitionDuration: shouldReduceAnimations ? '0ms' : '300ms',
    animationDuration: shouldReduceAnimations ? '0ms' : '600ms',
  }
}
