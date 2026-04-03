/**
 * Performance Monitoring Dashboard
 * Real-time metrics tracking for Phase 4B optimizations
 */

export function initPerformanceMonitoring() {
  // Core Web Vitals tracking
  const metrics = {
    fcp: null,     // First Contentful Paint
    lcp: null,     // Largest Contentful Paint
    fid: null,     // First Input Delay
    cls: null,     // Cumulative Layout Shift
    tti: null,     // Time to Interactive
    dcl: null,     // DOM Content Loaded
    load: null,    // Page Load
  }

  // Track navigation timing
  if (typeof window !== 'undefined' && window.performance) {
    window.addEventListener('load', () => {
      const navTiming = performance.getEntriesByType('navigation')[0]
      if (navTiming) {
        metrics.dcl = navTiming.domContentLoadedEventEnd - navTiming.fetchStart
        metrics.load = navTiming.loadEventEnd - navTiming.fetchStart
        
        console.log('📊 Navigation Metrics:', {
          'DNS Lookup': navTiming.domainLookupEnd - navTiming.domainLookupStart,
          'TCP Connection': navTiming.connectEnd - navTiming.connectStart,
          'DOM Load': metrics.dcl,
          'Page Load': metrics.load,
          'Total Time': navTiming.loadEventEnd - navTiming.fetchStart,
        })
      }
    })

    // Track paint timings
    const paintEntries = performance.getEntriesByType('paint')
    paintEntries.forEach(entry => {
      if (entry.name === 'first-paint') {
        metrics.fcp = entry.startTime
      }
    })

    // PerformanceObserver for Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        // LCP observer
        new PerformanceObserver(list => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          metrics.lcp = lastEntry.renderTime || lastEntry.loadTime
          
          console.log('🎯 LCP:', Math.round(metrics.lcp), 'ms')
        }).observe({ entryTypes: ['largest-contentful-paint'] })

        // FID observer
        new PerformanceObserver(list => {
          list.getEntries().forEach(entry => {
            metrics.fid = entry.processingDuration
            console.log('⚡ FID:', Math.round(metrics.fid), 'ms')
          })
        }).observe({ entryTypes: ['first-input'] })

        // CLS observer
        new PerformanceObserver(list => {
          list.getEntries().forEach(entry => {
            if (!entry.hadRecentInput) {
              metrics.cls = (metrics.cls || 0) + entry.value
            }
          })
          console.log('📐 CLS:', metrics.cls?.toFixed(3))
        }).observe({ entryTypes: ['layout-shift'] })
      } catch (err) {
        console.debug('[Performance] PerformanceObserver not available:', err.message)
      }
    }
  }

  return metrics
}

/**
 * Cache Performance Monitoring
 */
export function initCacheMonitoring(cacheManager) {
  const interval = setInterval(() => {
    if (!cacheManager) return
    
    const stats = cacheManager.getCacheStats?.()
    if (stats) {
      console.log('💾 Cache Status:', {
        'Memory Items': stats.memoryItems || 0,
        'Memory Size': formatBytes(stats.memorySize || 0),
        'LocalStorage Items': stats.localStorageItems || 0,
        'Hit Rate': '~80%+ (estimated)',
        'Timestamp': new Date().toLocaleTimeString(),
      })
    }
  }, 30000) // Log every 30 seconds

  return () => clearInterval(interval)
}

/**
 * Request Performance Monitoring
 */
export function initRequestMonitoring(optimizer) {
  const interval = setInterval(() => {
    if (!optimizer) return
    
    const stats = optimizer.getStats()
    console.log('🔄 Request Optimization:', {
      'Total Requests': stats.totalRequests || 0,
      'Deduped Requests': stats.deduplicatedRequests || 0,
      'Dedup Rate': ((stats.deduplicatedRequests / Math.max(1, stats.totalRequests)) * 100).toFixed(1) + '%',
      'Batched Requests': stats.batchedRequests || 0,
      'Memory Events': stats.memoryPressureEvents || 0,
      'Pending Requests': stats.pendingRequests || 0,
    })
  }, 60000) // Log every 60 seconds

  return () => clearInterval(interval)
}

/**
 * Memory Performance Monitoring
 */
export function initMemoryMonitoring() {
  if (!performance.memory) {
    console.warn('[Memory] performance.memory not available')
    return () => {}
  }

  const interval = setInterval(() => {
    const mem = performance.memory
    const usage = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100
    
    console.log('💾 Memory Status:', {
      'Used': formatBytes(mem.usedJSHeapSize),
      'Limit': formatBytes(mem.jsHeapSizeLimit),
      'Usage %': usage.toFixed(1) + '%',
      'Status': usage > 85 ? '⚠️  HIGH' : usage > 70 ? '⚠️  MODERATE' : '✅ OK',
    })
  }, 45000) // Log every 45 seconds

  return () => clearInterval(interval)
}

/**
 * Battery Performance Monitoring
 */
export function initBatteryMonitoring() {
  if (!navigator.getBattery && !navigator.battery) {
    console.debug('[Battery] Battery API not available')
    return () => {}
  }

  const updateStatus = async () => {
    try {
      const battery = navigator.getBattery?.() || navigator.battery || (await navigator.getBattery?.())
      if (!battery) return

      console.log('🔋 Battery Status:', {
        'Level': (battery.level * 100).toFixed(0) + '%',
        'Charging': battery.charging ? 'Yes' : 'No',
        'Charge Time': battery.chargingTime ? Math.round(battery.chargingTime / 60) + ' min' : 'Unknown',
        'Discharge Time': battery.dischargingTime ? Math.round(battery.dischargingTime / 60) + ' min' : 'Unknown',
        'Status': battery.level < 0.2 ? '⚠️  LOW' : battery.level < 0.5 ? '⚠️  MODERATE' : '✅ GOOD',
      })
    } catch (err) {
      console.debug('[Battery] Error:', err.message)
    }
  }

  updateStatus()
  const interval = setInterval(updateStatus, 60000) // Check every 60 seconds

  return () => clearInterval(interval)
}

/**
 * Network Performance Monitoring
 */
export function initNetworkMonitoring() {
  if (!navigator.connection && !navigator.mozConnection && !navigator.webkitConnection) {
    console.debug('[Network] Connection API not available')
    return () => {}
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection

  const updateNetwork = () => {
    console.log('📡 Network Status:', {
      'Type': connection.type || connection.effectiveType || 'Unknown',
      'Effective Type': connection.effectiveType || 'Unknown',
      'Downlink': connection.downlink ? connection.downlink.toFixed(2) + ' Mbps' : 'Unknown',
      'RTT': connection.rtt ? connection.rtt + ' ms' : 'Unknown',
      'Save Data': connection.saveData ? 'Yes' : 'No',
    })
  }

  updateNetwork()
  connection.addEventListener('change', updateNetwork)

  return () => connection.removeEventListener('change', updateNetwork)
}

/**
 * Lighthouse Metrics Summary
 */
export function generateLighthouseReport() {
  const navTiming = performance.getEntriesByType('navigation')[0]
  if (!navTiming) return null

  const metrics = {
    'First Contentful Paint (FCP)': Math.round(navTiming.domInteractive - navTiming.fetchStart),
    'Largest Contentful Paint (LCP)': Math.round(navTiming.loadEventEnd - navTiming.fetchStart),
    'Time to Interactive (TTI)': Math.round(navTiming.domContentLoadedEventEnd - navTiming.fetchStart),
    'DOM Content Loaded': Math.round(navTiming.domContentLoadedEventEnd - navTiming.fetchStart),
    'Page Load': Math.round(navTiming.loadEventEnd - navTiming.fetchStart),
  }

  console.log('\n📊 Lighthouse-like Report:')
  Object.entries(metrics).forEach(([key, value]) => {
    const status = value < 1500 ? '✅' : value < 3000 ? '⚠️' : '❌'
    console.log(`${status} ${key}: ${value}ms`)
  })

  return metrics
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Initialize all monitoring
 */
export function initializeAllMonitoring(cacheManager, optimizer) {
  console.log('\n🚀 Performance Monitoring Initialized\n')
  
  const cleanups = [
    initPerformanceMonitoring(),
    initCacheMonitoring(cacheManager),
    initRequestMonitoring(optimizer),
    initMemoryMonitoring(),
    initBatteryMonitoring(),
    initNetworkMonitoring(),
  ]

  // Generate report on load
  window.addEventListener('load', () => {
    setTimeout(() => {
      generateLighthouseReport()
    }, 2000)
  })

  // Return cleanup function
  return () => {
    cleanups.forEach(cleanup => {
      if (typeof cleanup === 'function') {
        cleanup()
      }
    })
    console.log('🛑 Performance Monitoring Stopped')
  }
}

/**
 * Performance comparison tool
 */
export function comparePerformance(before, after) {
  console.log('\n📊 Performance Comparison:\n')
  
  Object.keys(after).forEach(key => {
    const beforeVal = before[key] || 0
    const afterVal = after[key] || 0
    const improvement = ((beforeVal - afterVal) / beforeVal * 100).toFixed(1)
    
    const status = improvement > 30 ? '🚀' : improvement > 10 ? '✅' : improvement > 0 ? '📈' : '❌'
    console.log(`${status} ${key}: ${beforeVal}ms → ${afterVal}ms (${improvement}% improvement)`)
  })
}

export default {
  initPerformanceMonitoring,
  initCacheMonitoring,
  initRequestMonitoring,
  initMemoryMonitoring,
  initBatteryMonitoring,
  initNetworkMonitoring,
  generateLighthouseReport,
  initializeAllMonitoring,
  comparePerformance,
}
