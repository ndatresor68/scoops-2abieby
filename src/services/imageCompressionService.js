/**
 * Image Compression Service
 * Uses browser-image-compression for client-side compression with Web Workers
 */

const DEFAULT_OPTIONS = {
  maxSizeMB: 1.5, // Maximum output size: 1.5MB
  maxWidthOrHeight: 1920, // Maximum dimension
  useWebWorker: true, // Use Web Worker for non-blocking compression
  maxIteration: 10, // Number of compression iterations
  fileType: 'image/webp' // Convert to WebP for better compression
}

/**
 * Compress a single image file
 * @param {File} file - Image file to compress
 * @param {object} options - Compression options (merged with defaults)
 * @returns {Promise<File>} - Compressed file
 */
export async function compressImage(file, options = {}) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }

  try {
    // Dynamic import to avoid adding to main bundle if not needed
    const imageCompression = (await import('browser-image-compression')).default
    
    const originalSize = file.size
    console.log(`[ImageCompression] Starting: ${file.name} (${formatBytes(originalSize)})`)
    
    const compressedFile = await imageCompression(file, mergedOptions)
    
    const compressedSize = compressedFile.size
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1)
    
    console.log(
      `[ImageCompression] Complete: ${formatBytes(compressedSize)} ` +
      `(saved ${ratio}%)`
    )
    
    return compressedFile
  } catch (error) {
    console.error('[ImageCompression] Compression failed, returning original:', error)
    return file // Fallback to original
  }
}

/**
 * Compress multiple images in parallel
 * @param {File[]} files - Array of image files
 * @param {object} options - Compression options
 * @returns {Promise<File[]>} - Array of compressed files
 */
export async function compressMultipleImages(files, options = {}) {
  try {
    console.log(`[ImageCompression] Compressing ${files.length} images...`)
    
    const compressed = await Promise.all(
      files.map(file => compressImage(file, options))
    )
    
    const originalTotal = files.reduce((sum, f) => sum + f.size, 0)
    const compressedTotal = compressed.reduce((sum, f) => sum + f.size, 0)
    const totalRatio = ((1 - compressedTotal / originalTotal) * 100).toFixed(1)
    
    console.log(
      `[ImageCompression] Batch complete: ${formatBytes(originalTotal)} → ` +
      `${formatBytes(compressedTotal)} (${totalRatio}% reduction)`
    )
    
    return compressed
  } catch (error) {
    console.error('[ImageCompression] Batch compression failed:', error)
    return files // Fallback to originals
  }
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Number of bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Check if browser supports image compression
 * @returns {boolean}
 */
export function isCompressionSupported() {
  // Check for Web Worker support
  if (typeof Worker === 'undefined') {
    console.warn('[ImageCompression] Web Workers not supported')
    return false
  }
  
  // Check for Canvas API
  if (typeof HTMLCanvasElement === 'undefined') {
    console.warn('[ImageCompression] Canvas API not supported')
    return false
  }
  
  return true
}

/**
 * Get recommended compression settings for different use cases
 * @param {string} useCase - 'avatar' | 'document' | 'gallery'
 * @returns {object}
 */
export function getCompressionPreset(useCase) {
  const presets = {
    avatar: {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 512,
      fileType: 'image/webp'
    },
    document: {
      maxSizeMB: 2,
      maxWidthOrHeight: 2048,
      fileType: 'image/jpeg'
    },
    gallery: {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 1920,
      fileType: 'image/webp'
    }
  }
  
  return presets[useCase] || DEFAULT_OPTIONS
}
