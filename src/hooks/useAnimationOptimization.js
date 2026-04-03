/**
 * useAnimationOptimization
 * Smart animations that respect:
 * - User's prefers-reduced-motion setting
 * - Device battery level (disable on low battery)
 * - Network speed (disable on slow networks)
 * - Memory availability
 */

import { useEffect, useState, useCallback } from 'react'

export function useAnimationOptimization() {
  const [config, setConfig] = useState({
    enableAnimations: true,
    enableTransitions: true,
    enableParticles: false,
    animationDuration: 300,
    batteryLevel: 100,
    isLowBattery: false,
    isSlowNetwork: false,
    isLowMemory: false,
    prefersReducedMotion: false,
  })

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (e) => {
      setConfig((prev) => ({
        ...prev,
        prefersReducedMotion: e.matches,
        enableAnimations: !e.matches,
        enableTransitions: !e.matches,
        animationDuration: e.matches ? 0 : 300,
      }))
    }

    handleChange(mediaQuery)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Battery API
  useEffect(() => {
    if (!navigator.getBattery && !navigator.battery) return

    const updateBattery = async () => {
      try {
        const battery =
          navigator.getBattery?.() || navigator.battery || (await navigator.getBattery?.())

        if (!battery) return

        const updateStatus = () => {
          const isLow = battery.level < 0.2
          setConfig((prev) => ({
            ...prev,
            batteryLevel: Math.round(battery.level * 100),
            isLowBattery: isLow,
            enableAnimations: !isLow,
            enableParticles: !isLow,
            animationDuration: isLow ? 100 : 300,
          }))
        }

        updateStatus()
        battery.addEventListener('levelchange', updateStatus)
        battery.addEventListener('chargingtimechange', updateStatus)

        return () => {
          battery.removeEventListener('levelchange', updateStatus)
          battery.removeEventListener('chargingtimechange', updateStatus)
        }
      } catch (err) {
        console.debug('[Animation] Battery API not available')
      }
    }

    updateBattery()
  }, [])

  // Network detection
  useEffect(() => {
    if (!navigator.connection && !navigator.mozConnection && !navigator.webkitConnection) {
      return
    }

    const connection =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection

    const updateNetwork = () => {
      const effectiveType = connection.effectiveType
      const isSlowNetwork = effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g'

      setConfig((prev) => ({
        ...prev,
        isSlowNetwork,
        enableAnimations: !isSlowNetwork,
        enableParticles: false,
        animationDuration: isSlowNetwork ? 100 : 300,
      }))
    }

    updateNetwork()
    connection.addEventListener('change', updateNetwork)

    return () => connection.removeEventListener('change', updateNetwork)
  }, [])

  // Memory pressure
  useEffect(() => {
    const checkMemory = () => {
      if (!performance.memory) return

      const usage = performance.memory.usedJSHeapSize
      const limit = performance.memory.jsHeapSizeLimit
      const percentage = usage / limit

      const isLow = percentage > 0.85

      setConfig((prev) => ({
        ...prev,
        isLowMemory: isLow,
        enableParticles: !isLow,
      }))
    }

    checkMemory()
    const interval = setInterval(checkMemory, 5000)

    return () => clearInterval(interval)
  }, [])

  return config
}

/**
 * Get animation-friendly CSS variable values
 * Use in styled components or inline styles
 */
export function getAnimationStyles(config) {
  return {
    '--transition-duration': config.enableTransitions ? `${config.animationDuration}ms` : '0ms',
    '--animation-duration': config.enableAnimations ? `${config.animationDuration}ms` : '0ms',
    '--animation-timing': config.prefersReducedMotion ? 'linear' : 'cubic-bezier(0.4, 0, 0.2, 1)',
    '--animation-delay': config.isLowBattery ? '100ms' : '0ms',
  }
}

/**
 * Hooks for specific animation types
 */

export function useOptimizedTransition(config) {
  return config.enableTransitions
    ? `all ${config.animationDuration}ms ${getAnimationStyles(config)['--animation-timing']}`
    : 'none'
}

export function useOptimizedAnimation(config, keyframes) {
  return config.enableAnimations ? keyframes : 'none'
}

/**
 * Particle animations (expensive - disable on battery/slow network)
 */
export function useOptimizedParticles(config) {
  return {
    enabled: config.enableParticles && !config.isLowBattery && !config.isSlowNetwork,
    duration: config.animationDuration * 2,
    count: config.enableParticles ? 50 : 0,
  }
}

export default useAnimationOptimization
