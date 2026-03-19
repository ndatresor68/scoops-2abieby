import { messaging } from "./firebase"
import { getToken, onMessage } from "firebase/messaging"
import { supabase } from "./supabaseClient"

// Public (non-secret) Web Push VAPID key.
// Configure via environment variable to avoid hardcoding in the repo.
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

function getPlatformLabel() {
  if (typeof navigator === "undefined") return "web"
  const ua = navigator.userAgent || ""
  if (/android/i.test(ua)) return "android-web"
  if (/iphone|ipad|ipod/i.test(ua)) return "ios-web"
  return "web"
}

export async function getFcmToken(vapidKey = DEFAULT_VAPID_KEY) {
  try {
    if (!messaging) return null
    if (!vapidKey) {
      console.warn("[notifications] Missing VAPID key (VITE_FCM_VAPID_KEY)")
      return null
    }

    const serviceWorkerRegistration = await registerServiceWorkerIfNeeded()

    return await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: serviceWorkerRegistration || undefined,
    })
  } catch (error) {
    console.error("[notifications] Error getting FCM token:", error)
    return null
  }
}

export async function saveFcmToken({ token, userId }) {
  if (!token) {
    console.warn("[FCM] saveFcmToken called without token")
    return { success: false, error: "missing_token" }
  }

  if (!userId) {
    console.warn("[FCM] saveFcmToken called without authenticated userId")
    return { success: false, error: "missing_user_id" }
  }

  try {
    const now = new Date().toISOString()
    const payload = {
      token,
      user_id: userId,
      created_at: now,
      updated_at: now,
      status: "active",
      platform: getPlatformLabel(),
    }

    console.log("[FCM] Saving token to Supabase", {
      userId,
      platform: payload.platform,
      tokenPreview: `${String(token).slice(0, 12)}...`,
    })

    const { data, error } = await supabase
      .from("device_tokens")
      .upsert(payload, { onConflict: "token" })
      .select("id, user_id, status, created_at")
      .maybeSingle()

    if (error) {
      console.error("[FCM] Token save error:", error)
      return { success: false, error }
    }

    if (!data?.id) {
      console.error("[FCM] Token save returned no row")
      return { success: false, error: "missing_saved_row" }
    }

    console.log("[FCM] Token verified in DB:", data)
    return { success: true, data }
  } catch (error) {
    console.error("[FCM] Exception during token storage:", error)
    return { success: false, error }
  }
}

export const requestNotificationPermission = async ({
  vapidKey = DEFAULT_VAPID_KEY,
  userId = null,
  persist = true,
} = {}) => {
  try {
    if (typeof Notification === "undefined") return null
    if (!messaging) return null
    if (persist && !userId) {
      console.warn("[FCM] requestNotificationPermission requires authenticated userId before saving token")
      return null
    }

    const permission =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission()

    if (permission !== "granted") return null

    const token = await getFcmToken(vapidKey)

    console.log("FCM TOKEN:", token)

    if (token && persist) {
      const saveResult = await saveFcmToken({ token, userId })
      if (!saveResult.success) {
        console.warn("[FCM] Token generated but not persisted:", saveResult.error)
      }
    }

    return token
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
