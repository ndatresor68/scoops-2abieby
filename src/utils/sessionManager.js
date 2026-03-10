/**
 * Session timeout manager based on settings
 */

let sessionTimeoutId = null
let lastActivityTime = Date.now()

export function initializeSessionTimeout(timeoutMinutes, onTimeout) {
  // Clear existing timeout
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId)
  }

  const timeoutMs = timeoutMinutes * 60 * 1000

  function resetTimeout() {
    lastActivityTime = Date.now()
    
    if (sessionTimeoutId) {
      clearTimeout(sessionTimeoutId)
    }

    sessionTimeoutId = setTimeout(() => {
      const inactiveTime = Date.now() - lastActivityTime
      if (inactiveTime >= timeoutMs) {
        console.log("[SessionManager] Session timeout reached")
        onTimeout()
      }
    }, timeoutMs)
  }

  // Track user activity
  const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"]
  
  activityEvents.forEach((event) => {
    document.addEventListener(event, resetTimeout, true)
  })

  // Initialize timeout
  resetTimeout()

  return () => {
    if (sessionTimeoutId) {
      clearTimeout(sessionTimeoutId)
    }
    activityEvents.forEach((event) => {
      document.removeEventListener(event, resetTimeout, true)
    })
  }
}

export function resetSessionTimeout() {
  lastActivityTime = Date.now()
}
