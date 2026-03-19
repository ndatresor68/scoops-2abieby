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

export const requestNotificationPermission = async (vapidKey = DEFAULT_VAPID_KEY) => {
  try {
    if (typeof Notification === "undefined") return null
    if (!messaging) return null

    const permission =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission()

    if (permission !== "granted") return null

    const token = await getFcmToken(vapidKey)

    console.log("FCM TOKEN:", token)

    if (token) {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) {
          console.warn("[FCM] Could not fetch current user for token storage:", authError)
        }

        const userId = authData?.user?.id || null

        if (!userId) {
          console.warn("[FCM] No authenticated user; skipping token storage in Supabase.")
        } else {
          const { error: saveError } = await supabase.from("device_tokens").upsert(
            {
              token,
              user_id: userId,
              created_at: new Date().toISOString(),
              status: "active",
            },
            { onConflict: "token" }
          )

          if (saveError) {
            console.error("[FCM] Token save error:", saveError)
          } else {
            console.log("[FCM] Token saved/updated in Supabase successfully.")
          }
        }
      } catch (saveErr) {
        console.error("[FCM] Exception during token storage:", saveErr)
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
