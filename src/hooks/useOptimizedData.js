/**
 * useOptimizedData
 * Custom hook that combines all ultra-performance optimizations
 * - Deduplication + batching via ultraPerformanceOptimizer
 * - Multi-tier caching via advancedCacheService
 * - Prefetching hints
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { getCacheManager } from '../services/advancedCacheService'
import { getUltraPerformanceOptimizer } from '../services/ultraPerformanceOptimizer'

export function useOptimizedData(key, fetchFn, options = {}) {
  const {
    strategy = 'cache-first', // 'cache-first' | 'network-first'
    ttl = 300000, // 5 minutes
    deduplicate = true,
    batch = false,
    prefetch = false,
    onSuccess,
    onError,
  } = options

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isMountedRef = useRef(true)

  const cacheManager = getCacheManager()
  const optimizer = getUltraPerformanceOptimizer()

  // Main fetch function
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let result

      if (strategy === 'cache-first') {
        result = await cacheManager.getWithCacheFirst(key, fetchFn, {
          ttl,
          store: 'producteurs',
        })
      } else {
        result = await cacheManager.getWithNetworkFirst(key, fetchFn, {
          ttl,
          store: 'producteurs',
          timeout: 3000,
        })
      }

      if (isMountedRef.current) {
        setData(result)
        onSuccess?.(result)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err)
        onError?.(err)
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [key, fetchFn, strategy, ttl, cacheManager, onSuccess, onError])

  // Fetch on mount
  useEffect(() => {
    isMountedRef.current = true
    fetchData()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    optimizer: optimizer.getStats(),
  }
}

/**
 * useBatchedRequests
 * Batch multiple API requests into fewer network calls
 */
export function useBatchedRequests() {
  const optimizer = getUltraPerformanceOptimizer()

  const addRequest = useCallback((key, requestFn) => {
    return optimizer.batchRequest(key, requestFn)
  }, [optimizer])

  return {
    addRequest,
    stats: optimizer.getStats(),
  }
}

/**
 * useDedupedRequest
 * Prevent duplicate concurrent requests
 */
export function useDedupedRequest(key, requestFn) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const optimizer = getUltraPerformanceOptimizer()

  const execute = useCallback(async () => {
    try {
      setLoading(true)
      const result = await optimizer.deduplicateRequest(key, requestFn)
      setData(result)
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [key, requestFn, optimizer])

  return {
    execute,
    data,
    loading,
    error,
  }
}

/**
 * usePrefetch
 * Prefetch data that user might need soon
 * Useful for pagination, search results, etc.
 */
export function usePrefetch() {
  const optimizer = getUltraPerformanceOptimizer()
  const cacheManager = getCacheManager()

  const prefetch = useCallback((key, fetchFn) => {
    optimizer.prefetchData(key, fetchFn, cacheManager)
  }, [optimizer, cacheManager])

  return { prefetch }
}

export default useOptimizedData
