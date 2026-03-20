import { messaging } from "./firebase"
import { getToken, onMessage } from "firebase/messaging"
import { supabase } from "./supabaseClient"

const DEVICE_TOKENS_TABLE = "device_tokens"
const DEFAULT_VAPID_KEY =
  import.meta.env.VITE_FCM_VAPID_KEY ||
  "BNjWLklI2oSWyebaq217FTcMSf836uoG9thZ4h130_hoZDGOMgl7wErmGgwhiICLQImewAQi_29VeesMWEWHpGg"

function getPlatformLabel() {
  if (typeof navigator === "undefined") return "web"
  const ua = navigator.userAgent || ""
  if (/android/i.test(ua)) return "android-web"
  if (/iphone|ipad|ipod/i.test(ua)) return "ios-web"
  return "web"
}

async function registerServiceWorkerIfNeeded() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null

  try {
    return await navigator.serviceWorker.register("/firebase-messaging-sw.js")
  } catch (error) {
    console.error("[notifications] Service worker registration failed:", error)
    return null
  }
}

export async function getFcmToken(vapidKey = DEFAULT_VAPID_KEY) {
  try {
    if (!messaging || !vapidKey || typeof Notification === "undefined") {
      return null
    }

    const serviceWorkerRegistration = await registerServiceWorkerIfNeeded()

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: serviceWorkerRegistration || undefined,
    })

    return token || null
  } catch (error) {
    console.error("[notifications] Error getting FCM token:", error)
    return null
  }
}

export async function saveFcmToken({ token, userId }) {
  if (!token || !userId) {
    return { success: false, error: !token ? "missing_token" : "missing_user_id" }
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

    const { data, error } = await supabase
      .from(DEVICE_TOKENS_TABLE)
      .upsert(payload, { onConflict: "token" })
      .select("id, user_id, status, created_at")
      .maybeSingle()

    if (error || !data?.id) {
      return { success: false, error: error || "missing_saved_row" }
    }

    return { success: true, data }
  } catch (error) {
    console.error("[notifications] Exception during token storage:", error)
    return { success: false, error }
  }
}

export const requestNotificationPermission = async ({
  vapidKey = DEFAULT_VAPID_KEY,
  userId = null,
  persist = true,
} = {}) => {
  try {
    if (typeof Notification === "undefined" || !messaging) {
      return null
    }

    const permission =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission()

    if (permission !== "granted") {
      return null
    }

    const token = await getFcmToken(vapidKey)
    if (!token) {
      return null
    }

    if (persist) {
      if (!userId) {
        return null
      }

      const authResponse = await supabase.auth.getUser()
      const authUser = authResponse?.data?.user ?? null

      if (!authUser || authUser.id !== userId) {
        return null
      }

      const saveResult = await saveFcmToken({ token, userId })
      if (!saveResult.success) {
        return null
      }
    }

    return token
  } catch (error) {
    console.error("[notifications] Permission/token error:", error)
    return null
  }
}

export function listenNotifications(onPayload) {
  if (!messaging || typeof onMessage !== "function") return () => {}

  return onMessage(messaging, (payload) => {
    onPayload?.(payload)
  })
}
