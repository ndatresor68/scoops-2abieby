import { messaging } from "./firebase"
import { getToken, onMessage } from "firebase/messaging"
import { supabase } from "./supabaseClient"

const DEVICE_TOKENS_TABLE = "device_tokens"
const FCM_DEBUG_EVENT = "fcm-debug-update"

// Public (non-secret) Web Push VAPID key.
// Configure via environment variable to avoid hardcoding in the repo.
const DEFAULT_VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY
if (typeof window !== "undefined") {
  const masked = DEFAULT_VAPID_KEY ? `${String(DEFAULT_VAPID_KEY).slice(0, 10)}...` : "(missing)"
  console.log("[FCM] VAPID key (masked):", masked)
}

function mergeFcmDebugState(patch) {
  if (typeof window === "undefined") return
  const current = window.__FCM_DEBUG__ || {}
  const next = {
    ...current,
    ...patch,
    steps: {
      ...(current.steps || {}),
      ...(patch.steps || {}),
    },
    updatedAt: new Date().toISOString(),
  }
  window.__FCM_DEBUG__ = next
  window.dispatchEvent(new CustomEvent(FCM_DEBUG_EVENT, { detail: next }))
}

function showFcmDebugAlert(title, details) {
  if (typeof window === "undefined" || typeof window.alert !== "function") return
  const message = typeof details === "string" ? details : JSON.stringify(details, null, 2)
  window.setTimeout(() => {
    window.alert(`${title}\n\n${message}`)
  }, 0)
}

function getErrorMessage(error) {
  if (!error) return null
  if (typeof error === "string") return error
  return error.message || error.code || JSON.stringify(error)
}

function logFcmStep(stepNumber, label, status, details) {
  const prefix = `STEP ${stepNumber} ${status === "ok" ? "OK" : "FAIL"}`
  const payload = {
    label,
    status,
    details: details || null,
    loggedAt: new Date().toISOString(),
  }
  if (status === "ok") {
    console.log(`[FCM] ${prefix}: ${label}`, details || "")
  } else {
    console.error(`[FCM] ${prefix}: ${label}`, details || "")
  }
  mergeFcmDebugState({
    steps: {
      [`step${stepNumber}`]: payload,
    },
  })
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
    if (!messaging) {
      const reason = "Firebase messaging is not initialized"
      console.error("[FCM] getToken() skipped:", reason)
      mergeFcmDebugState({
        token: null,
        tokenFailureReason: reason,
      })
      return null
    }
    if (!vapidKey) {
      const reason = "Missing VAPID key (VITE_FCM_VAPID_KEY)"
      console.warn("[notifications]", reason)
      mergeFcmDebugState({
        token: null,
        tokenFailureReason: reason,
      })
      return null
    }

    const serviceWorkerRegistration = await registerServiceWorkerIfNeeded()

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: serviceWorkerRegistration || undefined,
    })

    console.log("FCM TOKEN:", token)

    if (!token) {
      const reason =
        Notification?.permission !== "granted"
          ? `Notification permission is ${Notification?.permission || "unknown"}`
          : "getToken() returned null without throwing"
      console.error("[FCM] Token generation returned null:", reason)
      mergeFcmDebugState({
        token: null,
        tokenFailureReason: reason,
      })
      return null
    }

    mergeFcmDebugState({
      token,
      tokenFailureReason: null,
    })

    return token
  } catch (error) {
    console.error("[notifications] Error getting FCM token:", error)
    mergeFcmDebugState({
      token: null,
      tokenFailureReason: getErrorMessage(error),
      tokenError: error,
    })
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

    mergeFcmDebugState({
      insertPayload: payload,
      insertResult: null,
      insertError: null,
    })

    console.log("[FCM] Saving token to Supabase", {
      userId,
      platform: payload.platform,
      tokenPreview: `${String(token).slice(0, 12)}...`,
    })
    console.log("SENDING TOKEN TO SUPABASE...")
    console.log("[FCM] Supabase table:", DEVICE_TOKENS_TABLE)
    console.log("[FCM] Supabase payload:", payload)

    const { data, error } = await supabase
      .from(DEVICE_TOKENS_TABLE)
      .upsert(payload, { onConflict: "token" })
      .select("id, user_id, status, created_at")
      .maybeSingle()

    console.log("SUPABASE RESPONSE:", data, error)

    if (error) {
      console.error("[FCM] Token save error:", error)
      console.error("[FCM] Token save error message:", getErrorMessage(error))
      console.error("[FCM] Token save table:", DEVICE_TOKENS_TABLE)
      console.error("[FCM] Token save payload:", payload)
      mergeFcmDebugState({
        insertResult: data,
        insertError: error,
      })
      return { success: false, error }
    }

    if (!data?.id) {
      console.error("[FCM] Token save returned no row")
      mergeFcmDebugState({
        insertResult: data,
        insertError: "missing_saved_row",
      })
      return { success: false, error: "missing_saved_row" }
    }

    console.log("[FCM] Token verified in DB:", data)
    mergeFcmDebugState({
      insertResult: data,
      insertError: null,
    })
    return { success: true, data }
  } catch (error) {
    console.error("[FCM] Exception during token storage:", error)
    console.error("[FCM] Token save exception message:", getErrorMessage(error))
    console.error("[FCM] Token save table:", DEVICE_TOKENS_TABLE)
    mergeFcmDebugState({
      insertResult: null,
      insertError: error,
    })
    return { success: false, error }
  }
}

export const requestNotificationPermission = async ({
  vapidKey = DEFAULT_VAPID_KEY,
  userId = null,
  persist = true,
} = {}) => {
  try {
    mergeFcmDebugState({
      requestedUserId: userId,
      permission: typeof Notification === "undefined" ? "unsupported" : Notification.permission,
      token: null,
      authUser: null,
      authUserId: null,
      insertPayload: null,
      insertResult: null,
      insertError: null,
      tokenFailureReason: null,
      lastError: null,
    })

    if (typeof Notification === "undefined") {
      const reason = "Notification API is not available in this environment"
      logFcmStep(1, "permission check", "fail", { reason })
      mergeFcmDebugState({ lastError: reason })
      showFcmDebugAlert("[FCM DEBUG] STEP 1 FAIL", { reason })
      return null
    }
    if (!messaging) {
      const reason = "Firebase messaging is not available"
      logFcmStep(1, "permission check", "fail", { reason })
      mergeFcmDebugState({ lastError: reason })
      showFcmDebugAlert("[FCM DEBUG] STEP 1 FAIL", { reason })
      return null
    }
    if (persist && !userId) {
      const reason = "requestNotificationPermission requires authenticated userId before saving token"
      console.warn("[FCM]", reason)
      logFcmStep(3, "user loaded", "fail", { reason })
      mergeFcmDebugState({ lastError: reason })
      showFcmDebugAlert("[FCM DEBUG] STEP 3 FAIL", { reason })
      return null
    }

    const permission =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission()

    mergeFcmDebugState({ permission })

    if (permission !== "granted") {
      const reason = `Notification permission returned ${permission}`
      logFcmStep(1, "permission granted", "fail", { permission, reason })
      mergeFcmDebugState({ lastError: reason })
      showFcmDebugAlert("[FCM DEBUG] STEP 1 FAIL", { permission, reason })
      return null
    }

    logFcmStep(1, "permission granted", "ok", { permission })

    const token = await getFcmToken(vapidKey)

    console.log("FCM TOKEN:", token)

    if (!token) {
      const reason = window.__FCM_DEBUG__?.tokenFailureReason || "Token is null after getToken()"
      logFcmStep(2, "token generated", "fail", { reason })
      mergeFcmDebugState({ lastError: reason })
      showFcmDebugAlert("[FCM DEBUG] STEP 2 FAIL", {
        token,
        reason,
      })
      return null
    }

    logFcmStep(2, "token generated", "ok", { token })

    const authResponse = await supabase.auth.getUser()
    const authUser = authResponse?.data?.user ?? null
    console.log("AUTH USER:", authUser)
    mergeFcmDebugState({
      authUser,
      authUserId: authUser?.id || null,
      authUserError: authResponse?.error || null,
    })

    if (!authUser) {
      const reason = authResponse?.error
        ? getErrorMessage(authResponse.error)
        : "supabase.auth.getUser() returned null user"
      console.error("[FCM] Auth user is null. Token will not be saved.")
      logFcmStep(3, "user loaded", "fail", {
        reason,
        requestedUserId: userId,
      })
      mergeFcmDebugState({ lastError: reason })
      showFcmDebugAlert("[FCM DEBUG] STEP 3 FAIL", {
        reason,
        requestedUserId: userId,
      })
      return null
    }

    logFcmStep(3, "user loaded", "ok", {
      requestedUserId: userId,
      authUserId: authUser.id,
    })

    if (token && persist) {
      logFcmStep(4, "insert attempted", "ok", {
        table: DEVICE_TOKENS_TABLE,
        userId,
      })
      const saveResult = await saveFcmToken({ token, userId })
      mergeFcmDebugState({ saveResult })
      if (!saveResult.success) {
        console.warn("[FCM] Token generated but not persisted:", saveResult.error)
        logFcmStep(5, "insert result", "fail", {
          table: DEVICE_TOKENS_TABLE,
          payload: window.__FCM_DEBUG__?.insertPayload || null,
          error: saveResult.error,
        })
        mergeFcmDebugState({ lastError: getErrorMessage(saveResult.error) || saveResult.error })
        showFcmDebugAlert("[FCM DEBUG] STEP 5 FAIL", {
          token,
          user_id: userId,
          result: saveResult,
        })
      } else {
        logFcmStep(5, "insert result", "ok", {
          table: DEVICE_TOKENS_TABLE,
          result: saveResult.data,
        })
        showFcmDebugAlert("[FCM DEBUG] STEP 5 OK", {
          token,
          user_id: userId,
          result: saveResult.data,
        })
      }
    }

    return token
  } catch (error) {
    console.error("[notifications] Permission/token error:", error)
    const reason = getErrorMessage(error)
    mergeFcmDebugState({ lastError: reason })
    showFcmDebugAlert("[FCM DEBUG] FLOW EXCEPTION", { reason })
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
