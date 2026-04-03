/**
 * useVirtualScroll - Efficient rendering of large lists
 * Renders only visible items + buffer zone
 * Can handle 10,000+ items with minimal performance impact
 */

import { useState, useRef, useCallback, useEffect } from 'react'

export function useVirtualScroll({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 5, // Extra items to render outside viewport
}) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollRef = useRef(null)

  // Calculate which items are visible
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    itemCount,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = endIndex - startIndex

  // Offset for positioning visible items
  const offsetY = startIndex * itemHeight

  // Handle scroll events with throttling
  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop
    setScrollTop(newScrollTop)
  }, [])

  // Optional: Throttle scroll events for better performance
  const handleScrollThrottled = useCallback(() => {
    let rafId = null
    return (e) => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        handleScroll(e)
      })
    }
  }, [handleScroll])

  return {
    scrollRef,
    handleScroll: handleScrollThrottled(),
    startIndex,
    endIndex,
    visibleItems,
    offsetY,
    totalHeight: itemCount * itemHeight,
  }
}

/**
 * VirtualList Component
 * Usage:
 * <VirtualList
 *   items={largeArray}
 *   itemHeight={50}
 *   containerHeight={600}
 *   renderItem={(item, index) => <div key={index}>{item.name}</div>}
 * />
 */
export function VirtualList({
  items,
  itemHeight,
  containerHeight = 500,
  renderItem,
  className = '',
  style = {},
}) {
  const { scrollRef, handleScroll, startIndex, endIndex, offsetY, totalHeight } = useVirtualScroll({
    itemCount: items.length,
    itemHeight,
    containerHeight,
    overscan: 10,
  })

  const visibleItems = items.slice(startIndex, endIndex)

  return (
    <div
      ref={scrollRef}
      className={`virtual-list ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto',
        ...style,
      }}
      onScroll={handleScroll}
    >
      {/* Spacer before visible items */}
      {offsetY > 0 && <div style={{ height: offsetY }} />}

      {/* Render only visible items */}
      <div>
        {visibleItems.map((item, index) => renderItem(item, startIndex + index))}
      </div>

      {/* Spacer after visible items */}
      {offsetY + visibleItems.length * itemHeight < totalHeight && (
        <div style={{ height: totalHeight - (offsetY + visibleItems.length * itemHeight) }} />
      )}
    </div>
  )
}

/**
 * useInfiniteScroll - Load more items as user scrolls
 * Pairs well with VirtualList
 */
export function useInfiniteScroll({
  onLoadMore,
  threshold = 0.8, // Load when 80% scrolled
}) {
  const containerRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollPercentage = (container.scrollTop + container.clientHeight) / container.scrollHeight
      if (scrollPercentage > threshold && !isLoading) {
        setIsLoading(true)
        onLoadMore?.()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [onLoadMore, threshold, isLoading])

  return {
    containerRef,
    isLoading,
    setIsLoading,
  }
}

export default useVirtualScroll
