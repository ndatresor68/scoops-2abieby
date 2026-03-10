/**
 * Device Information Capture Utility
 * 
 * Captures device, browser, OS, IP address, and location information
 * for professional audit logging.
 */

/**
 * Parse user agent string to extract browser and OS information
 * @param {string} userAgent - navigator.userAgent string
 * @returns {Object} Object with browser, os, and device information
 */
export function parseUserAgent(userAgent = navigator.userAgent) {
  const ua = userAgent.toLowerCase()

  // Detect Browser
  let browser = "Unknown"
  let browserVersion = ""

  if (ua.includes("firefox")) {
    browser = "Firefox"
    const match = ua.match(/firefox\/(\d+\.\d+)/)
    browserVersion = match ? match[1] : ""
  } else if (ua.includes("chrome") && !ua.includes("edg")) {
    browser = "Chrome"
    const match = ua.match(/chrome\/(\d+\.\d+)/)
    browserVersion = match ? match[1] : ""
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    browser = "Safari"
    const match = ua.match(/version\/(\d+\.\d+)/)
    browserVersion = match ? match[1] : ""
  } else if (ua.includes("edg")) {
    browser = "Edge"
    const match = ua.match(/edg\/(\d+\.\d+)/)
    browserVersion = match ? match[1] : ""
  } else if (ua.includes("opera") || ua.includes("opr")) {
    browser = "Opera"
    const match = ua.match(/(?:opera|opr)\/(\d+\.\d+)/)
    browserVersion = match ? match[1] : ""
  }

  const browserInfo = browserVersion ? `${browser} ${browserVersion}` : browser

  // Detect OS
  let os = "Unknown"
  if (ua.includes("windows")) {
    os = "Windows"
    if (ua.includes("windows nt 10")) os = "Windows 10/11"
    else if (ua.includes("windows nt 6.3")) os = "Windows 8.1"
    else if (ua.includes("windows nt 6.2")) os = "Windows 8"
    else if (ua.includes("windows nt 6.1")) os = "Windows 7"
  } else if (ua.includes("mac os x") || ua.includes("macintosh")) {
    os = "macOS"
    const match = ua.match(/mac os x (\d+[._]\d+)/)
    if (match) os = `macOS ${match[1].replace("_", ".")}`
  } else if (ua.includes("linux")) {
    os = "Linux"
  } else if (ua.includes("android")) {
    os = "Android"
    const match = ua.match(/android (\d+\.\d+)/)
    if (match) os = `Android ${match[1]}`
  } else if (ua.includes("iphone") || ua.includes("ipad")) {
    os = ua.includes("ipad") ? "iOS (iPad)" : "iOS (iPhone)"
    const match = ua.match(/os (\d+[._]\d+)/)
    if (match) os = `${os.includes("iPad") ? "iOS (iPad)" : "iOS (iPhone)"} ${match[1].replace("_", ".")}`
  }

  // Detect Device Type
  let device = "desktop"
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    device = "mobile"
  } else if (ua.includes("tablet") || ua.includes("ipad")) {
    device = "tablet"
  }

  return {
    browser: browserInfo,
    os,
    device,
  }
}

/**
 * Get IP address using a public API
 * @returns {Promise<string|null>} IP address or null if failed
 */
export async function getIPAddress() {
  try {
    // Try multiple IP detection services for reliability
    const services = [
      "https://api.ipify.org?format=json",
      "https://api64.ipify.org?format=json",
      "https://ipapi.co/json/",
    ]

    for (const service of services) {
      try {
        const response = await fetch(service, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(3000), // 3 second timeout
        })

        if (!response.ok) continue

        const data = await response.json()
        const ip = data.ip || data.query || null

        if (ip) {
          return ip
        }
      } catch (error) {
        console.warn(`[deviceInfo] IP service ${service} failed:`, error)
        continue
      }
    }

    return null
  } catch (error) {
    console.warn("[deviceInfo] Failed to get IP address:", error)
    return null
  }
}

/**
 * Get geographic location using browser geolocation API
 * @returns {Promise<string|null>} Location string or null if permission denied/failed
 */
export async function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    const timeout = setTimeout(() => {
      resolve(null)
    }, 5000) // 5 second timeout

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout)
        const { latitude, longitude } = position.coords

        // Try to get city name using reverse geocoding
        fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}`)
          .then((res) => res.json())
          .then((data) => {
            const locationParts = []
            if (data.city) locationParts.push(data.city)
            if (data.principalSubdivision) locationParts.push(data.principalSubdivision)
            if (data.countryName) locationParts.push(data.countryName)

            const locationString = locationParts.length > 0 ? locationParts.join(", ") : `${latitude}, ${longitude}`
            resolve(locationString)
          })
          .catch(() => {
            // Fallback to coordinates if reverse geocoding fails
            resolve(`${latitude}, ${longitude}`)
          })
      },
      (error) => {
        clearTimeout(timeout)
        // Permission denied or error - return null silently
        resolve(null)
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000, // 5 minutes cache
      },
    )
  })
}

/**
 * Capture all device information for audit logging
 * @param {boolean} includeLocation - Whether to request location permission (default: false)
 * @returns {Promise<Object>} Object with all device information
 */
export async function captureDeviceInfo(includeLocation = false) {
  const userAgent = navigator.userAgent || ""
  const { browser, os, device } = parseUserAgent(userAgent)

  const [ipAddress, location] = await Promise.all([
    getIPAddress(),
    includeLocation ? getLocation() : Promise.resolve(null),
  ])

  return {
    browser,
    os,
    device,
    ipAddress,
    location,
    userAgent, // Store raw user agent for reference
  }
}

/**
 * Quick capture for non-critical logging (no IP/location)
 * @returns {Object} Basic device info without async calls
 */
export function captureBasicDeviceInfo() {
  const userAgent = navigator.userAgent || ""
  const { browser, os, device } = parseUserAgent(userAgent)

  return {
    browser,
    os,
    device,
    userAgent,
  }
}
