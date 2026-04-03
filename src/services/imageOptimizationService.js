/**
 * Service d'optimisation des images pour mobile
 * - AVIF/WebP support automatique
 * - Responsive images
 * - Lazy loading
 * - Intersection Observer
 */

/**
 * Détecte les formats d'images supportés
 */
export function getOptimalImageFormat() {
  const formats = {
    avif: false,
    webp: false,
    jpeg: true, // Support universel
  }

  // Créer des canvas pour tester les formats
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1

  // Test AVIF
  try {
    const avifData =
      'image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAG1pZmZBAABtbWV0AAAAAAAA'
    if (canvas.toDataURL('image/avif').startsWith('data:image/avif')) {
      formats.avif = true
    }
  } catch (e) {
    // AVIF not supported
  }

  // Test WebP
  try {
    if (
      canvas
        .toDataURL('image/webp')
        .startsWith('data:image/webp')
    ) {
      formats.webp = true
    }
  } catch (e) {
    // WebP not supported
  }

  return formats
}

/**
 * Génère les source optimales pour une image
 */
export function getOptimizedImageSources(baseUrl) {
  const formats = getOptimalImageFormat()
  const sources = []

  // Préférence: AVIF > WebP > JPEG
  if (formats.avif) {
    sources.push({
      format: 'avif',
      src: baseUrl.replace(/\.[^.]+$/, '.avif'),
      type: 'image/avif',
    })
  }

  if (formats.webp) {
    sources.push({
      format: 'webp',
      src: baseUrl.replace(/\.[^.]+$/, '.webp'),
      type: 'image/webp',
    })
  }

  // Fallback JPEG/PNG
  sources.push({
    format: 'jpeg',
    src: baseUrl,
    type: 'image/jpeg',
  })

  return sources
}

/**
 * Hook pour lazy loading des images
 * Utilise Intersection Observer pour charger les images à la demande
 */
export function useLazyImage(ref) {
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    if (!ref?.current || !('IntersectionObserver' in window)) {
      setIsLoaded(true)
      return
    }

    const img = ref.current
    const originalSrc = img.dataset.src
    const originalSrcset = img.dataset.srcset

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Charger l'image
            if (originalSrc) {
              img.src = originalSrc
            }
            if (originalSrcset) {
              img.srcSet = originalSrcset
            }

            img.onload = () => {
              setIsLoaded(true)
              img.classList.add('loaded')
              observer.unobserve(img)
            }

            img.onerror = () => {
              setError(true)
              observer.unobserve(img)
            }
          }
        })
      },
      {
        rootMargin: '50px', // Charger 50px avant d'être visible
      }
    )

    observer.observe(img)

    return () => {
      if (img) {
        observer.unobserve(img)
      }
    }
  }, [ref])

  return { isLoaded, error }
}

/**
 * Classe pour gérer le lazy loading batch
 * Charge plusieurs images en batch pour ne pas surcharger
 */
export class ImageBatchLoader {
  constructor(batchSize = 10, delayMs = 200) {
    this.batchSize = batchSize
    this.delayMs = delayMs
    this.queue = []
    this.loading = false
  }

  add(imageElement, src, srcset) {
    return new Promise((resolve, reject) => {
      this.queue.push({ imageElement, src, srcset, resolve, reject })

      if (this.queue.length >= this.batchSize || !this.loading) {
        this.processBatch()
      }
    })
  }

  async processBatch() {
    if (this.loading || this.queue.length === 0) return

    this.loading = true
    const batch = this.queue.splice(0, this.batchSize)

    const promises = batch.map(
      ({ imageElement, src, srcset, resolve, reject }) =>
        new Promise((res) => {
          setTimeout(() => {
            try {
              if (src) imageElement.src = src
              if (srcset) imageElement.srcSet = srcset

              imageElement.onload = () => {
                resolve()
                res()
              }

              imageElement.onerror = () => {
                reject(new Error('Image load failed'))
                res()
              }

              // Timeout après 10s
              setTimeout(() => {
                res()
              }, 10000)
            } catch (e) {
              reject(e)
              res()
            }
          }, Math.random() * this.delayMs) // Stagger requests
        })
    )

    await Promise.allSettled(promises)
    this.loading = false

    // Continuer avec les images suivantes
    if (this.queue.length > 0) {
      setTimeout(() => this.processBatch(), this.delayMs)
    }
  }
}

/**
 * Image placeholder optimisé (LQIP - Low Quality Image Placeholder)
 */
export function generateBlurPlaceholder(color = '#f0f0f0', width = 1, height = 1) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = color
    ctx.fillRect(0, 0, width, height)
  }

  return canvas.toDataURL('image/png')
}

/**
 * Comprime les images côté client avant upload
 * Réutilise le service existant mais avec profils optimisés
 */
export async function compressImageForMobile(file, profileType = 'mobile') {
  const profiles = {
    mobile: {
      maxSizeMB: 1,
      maxWidthOrHeight: 800,
      useWebWorker: false,
      quality: 0.6,
    },
    thumbnail: {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 200,
      useWebWorker: false,
      quality: 0.5,
    },
    gallery: {
      maxSizeMB: 2,
      maxWidthOrHeight: 1200,
      useWebWorker: false,
      quality: 0.7,
    },
  }

  const profile = profiles[profileType] || profiles.mobile

  try {
    // Utiliser browser-image-compression si disponible
    if (window.imageCompression) {
      return await window.imageCompression.compress(file, profile)
    }

    // Fallback: simple resize via canvas
    return await resizeImageViaCanvas(file, profile)
  } catch (error) {
    console.error('Image compression failed:', error)
    return file // Return original if compression fails
  }
}

/**
 * Fallback: resize image via canvas
 */
function resizeImageViaCanvas(file, { maxWidthOrHeight, quality }) {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidthOrHeight) {
            height = Math.round((height * maxWidthOrHeight) / width)
            width = maxWidthOrHeight
          }
        } else {
          if (height > maxWidthOrHeight) {
            width = Math.round((width * maxWidthOrHeight) / height)
            height = maxWidthOrHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            blob.name = file.name
            resolve(blob)
          },
          'image/jpeg',
          quality
        )
      }

      img.src = e.target.result
    }

    reader.readAsDataURL(file)
  })
}
