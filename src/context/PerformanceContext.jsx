/**
 * PerformanceContext
 * Global performance configuration & monitoring
 * Exposes:
 * - PWA installation status
 * - Performance metrics
 * - Animation config (battery/network aware)
 * - Ultra optimizer instance
 * - Cache status
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { useIsPWAInstalled, useRuntime } from '../hooks/useIsPWA'
import { useAnimationOptimization } from '../hooks/useAnimationOptimization'
import { getUltraPerformanceOptimizer } from '../services/ultraPerformanceOptimizer'
import { getCacheManager } from '../services/advancedCacheService'
import { getIndexedDBService } from '../services/indexedDBService'
import { initializeAllMonitoring } from '../services/performanceMonitoring'

const PerformanceContext = createContext(null)

export function PerformanceProvider({ children }) {
  const pwaStatus = useIsPWAInstalled()
  const runtime = useRuntime()
  const animationConfig = useAnimationOptimization()
  const optimizer = getUltraPerformanceOptimizer()
  const cacheManager = getCacheManager()
  const indexedDB = getIndexedDBService()

  const [performanceMetrics, setPerformanceMetrics] = useState({
    fcp: null, // First Contentful Paint
    lcp: null, // Largest Contentful Paint
    fid: null, // First Input Delay
    cls: null, // Cumulative Layout Shift
    tti: null, // Time to Interactive
  })

  const [cacheStatus, setCacheStatus] = useState({
    size: 0,
    items: 0,
    lastCleanup: null,
  })

  // Initialize Web Vitals monitoring
  useEffect(() => {
    // FCP via PerformanceObserver
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              setPerformanceMetrics((prev) => ({
                ...prev,
                fcp: Math.round(entry.startTime),
              }))
            }
          }
        })
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] })

        return () => observer.disconnect()
      } catch (err) {
        console.debug('[Performance] PerformanceObserver not available', err.message)
      }
    }
  }, [])

  // Initialize IndexedDB
  useEffect(() => {
    indexedDB.init().catch((err) => console.error('[IndexedDB] Init failed:', err))
  }, [indexedDB])

  // Monitor cache status
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = cacheManager.getCacheStats?.()
      if (stats) {
        setCacheStatus({
          size: stats.memorySize || 0,
          items: (stats.memoryItems || 0) + (stats.localStorageItems || 0),
          lastCleanup: new Date(),
        })
      }
    }, 10000) // Every 10 seconds

    return () => clearInterval(interval)
  }, [cacheManager])

  // ✅ Initialize performance monitoring on mount
  useEffect(() => {
    const cleanup = initializeAllMonitoring(cacheManager, optimizer)
    
    return () => {
      if (typeof cleanup === 'function') {
        cleanup()
      }
    }
  }, [cacheManager, optimizer])

  // Log performance metrics on production
  useEffect(() => {
    if (!import.meta.env.PROD) return

    const logMetrics = () => {
      const navTiming = performance.getEntriesByType('navigation')[0]
      if (!navTiming) return

      console.log('[Performance] Page Metrics:', {
        fcp: performanceMetrics.fcp,
        lcp: performanceMetrics.lcp,
        domLoaded: navTiming.domContentLoadedEventEnd - navTiming.fetchStart,
        pageLoaded: navTiming.loadEventEnd - navTiming.fetchStart,
        optimizerStats: optimizer.getStats(),
      })
    }

    // Log after page load
    const handleLoad = () => setTimeout(logMetrics, 2000)
    window.addEventListener('load', handleLoad)

    return () => window.removeEventListener('load', handleLoad)
  }, [performanceMetrics, optimizer])

  const value = {
    // PWA Status
    pwaStatus,
    runtime,

    // Animation Config (battery/network aware)
    animationConfig,

    // Performance Metrics
    performanceMetrics,

    // Cache Status
    cacheStatus,

    // Performance Optimizer
    optimizer,

    // Cache Manager
    cacheManager,

    // IndexedDB Service
    indexedDB,

    // Utilities
    getOptimizationStats: () => ({
      pwa: pwaStatus,
      runtime,
      animation: animationConfig,
      performance: performanceMetrics,
      cache: cacheStatus,
      optimizer: optimizer.getStats(),
    }),
  }

  return <PerformanceContext.Provider value={value}>{children}</PerformanceContext.Provider>
}

export function usePerformance() {
  const context = useContext(PerformanceContext)
  if (!context) {
    throw new Error('usePerformance must be used within PerformanceProvider')
  }
  return context
}

export default PerformanceContext
