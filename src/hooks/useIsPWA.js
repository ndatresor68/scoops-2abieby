import { useEffect, useState } from 'react'

/**
 * Hook pour détecter si l'application est installée en tant que PWA
 * @returns {object} {isInstalled, displayMode, isPWA}
 */
export function useIsPWAInstalled() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [displayMode, setDisplayMode] = useState('browser')
  const [isPWA, setIsPWA] = useState(false)

  useEffect(() => {
    // Vérifier via display-mode media query
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const isStandalone = mediaQuery.matches

    // Vérifier via window.navigator
    const isIOSPWA = window.navigator.standalone === true
    
    // Vérifier documentElement className (certains PWAs ajoutent une classe)
    const hasAppClass = document.documentElement.classList.contains('pwa-installed')

    // Vérifier la présence de service worker
    const hasServiceWorker = 'serviceWorker' in navigator

    // Déterminer le mode d'affichage
    let mode = 'browser'
    if (isStandalone || isIOSPWA) {
      mode = 'standalone'
    }

    const installed = isStandalone || isIOSPWA || hasAppClass
    setIsInstalled(installed)
    setDisplayMode(mode)
    setIsPWA(hasServiceWorker && installed)

    // Écouter les changements de display-mode
    const handleDisplayModeChange = (e) => {
      setDisplayMode(e.matches ? 'standalone' : 'browser')
      setIsInstalled(e.matches)
    }

    mediaQuery.addEventListener('change', handleDisplayModeChange)
    return () => mediaQuery.removeEventListener('change', handleDisplayModeChange)
  }, [])

  return {
    isInstalled,
    displayMode,
    isPWA,
    isStandaloneApp: displayMode === 'standalone',
  }
}

/**
 * Hook pour obtenir des informations sur l'environnement d'exécution
 */
export function useRuntime() {
  const [runtime, setRuntime] = useState({
    isPWA: false,
    isStandalone: false,
    isPlatform: 'web', // web, android, ios
    isCordova: false,
    isCapacitor: false,
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const isStandalone = mediaQuery.matches || window.navigator.standalone === true

    // Déterminer la plateforme
    const userAgent = navigator.userAgent.toLowerCase()
    let platform = 'web'
    if (userAgent.includes('android')) platform = 'android'
    else if (userAgent.includes('iphone') || userAgent.includes('ipad')) platform = 'ios'

    // Vérifier Cordova/Capacitor
    const isCordova = !!(window.cordova || window.PhoneGap || window.phonegap)
    const isCapacitor = !!(window.Capacitor)

    setRuntime({
      isPWA: isStandalone && 'serviceWorker' in navigator,
      isStandalone,
      isPlatform: platform,
      isCordova,
      isCapacitor,
    })
  }, [])

  return runtime
}

/**
 * Hook pour forcer le refresh de la détection PWA
 * Utile quand on installe l'app dynamiquement
 */
export function usePWARefresh() {
  const [, setRefresh] = useState(0)

  const refresh = () => {
    setRefresh((prev) => prev + 1)
  }

  useEffect(() => {
    // Écouter l'événement beforeinstallprompt et appinstalled
    const handleAppInstalled = () => {
      console.log('PWA App installed!')
      refresh()
    }

    window.addEventListener('appinstalled', handleAppInstalled)
    return () => window.removeEventListener('appinstalled', handleAppInstalled)
  }, [])

  return refresh
}
