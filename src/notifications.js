import { messaging } from "./firebase"
import { getToken as firebaseGetToken, onMessage } from "firebase/messaging"

// VAPID public key (configure in env, not hardcoded in the repo)
const DEFAULT_VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY
if (typeof window !== "undefined") {
  const masked = DEFAULT_VAPID_KEY ? `${String(DEFAULT_VAPID_KEY).slice(0, 10)}...` : "(missing)"
  console.log("[FCM] VAPID key (masked):", masked)
}

async function registerServiceWorkerIfNeeded() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null
  try {
    // Default location for the Firebase Messaging service worker.
    return await navigator.serviceWorker.register("/firebase-messaging-sw.js")
  } catch (error) {
    console.warn("[notifications] Service worker registration failed:", error)
    return null
  }
}

export async function getFcmToken(vapidKey = DEFAULT_VAPID_KEY) {
  try {
    if (!messaging) return null
    if (!vapidKey) {
      console.warn("[notifications] Missing VAPID key (VITE_FCM_VAPID_KEY)")
      return null
    }

    const serviceWorkerRegistration = await registerServiceWorkerIfNeeded()

    const token = await firebaseGetToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: serviceWorkerRegistration || undefined,
    })
    if (token) {
      console.log("FCM TOKEN:", token)
    }
    return token
  } catch (error) {
    console.error("[notifications] Error getting FCM token:", error)
    return null
  }
}

// Alias for convenience
export const getToken = getFcmToken

export const requestNotificationPermission = async (vapidKey = DEFAULT_VAPID_KEY) => {
  try {
    if (typeof Notification === "undefined") return null
    if (!messaging) return null

    const permission =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission()

    if (permission !== "granted") return null

    return await getFcmToken(vapidKey)
  } catch (error) {
    console.error("[notifications] Permission/token error:", error)
    return null
  }
}

/**
 * Foreground-only listener.
 * Background handling happens in `public/firebase-messaging-sw.js`.
 */
export function listenNotifications(onPayload) {
  if (!messaging || typeof onMessage !== "function") return () => {}

  // Firebase onMessage returns an unsubscribe function.
  const unsubscribe = onMessage(messaging, (payload) => {
    onPayload?.(payload)
  })

  return unsubscribe
}
