import { supabase } from "../supabaseClient"
import { logActivity } from "../utils/activityLogger"

const DEVICE_ID_KEY = "app_device_id"
const SESSION_CACHE_KEY = "app_device_session_cache"
const GRACE_PERIOD_DAYS = 7

function nowIso() {
  return new Date().toISOString()
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next.toISOString()
}

function isFuture(dateString) {
  return !!dateString && new Date(dateString).getTime() > Date.now()
}

function readSessionCache() {
  try {
    const raw = window.localStorage.getItem(SESSION_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    return null
  }
}

function writeSessionCache(payload) {
  window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(payload))
}

export function getOrCreateDeviceId() {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing

  const deviceId = crypto.randomUUID()
  window.localStorage.setItem(DEVICE_ID_KEY, deviceId)
  return deviceId
}

export function clearSessionCache() {
  window.localStorage.removeItem(SESSION_CACHE_KEY)
}

export function getSessionCache() {
  return readSessionCache()
}

async function deactivateExpiredGraceSessions(userId, currentDeviceId) {
  const { data: sessions } = await supabase
    .from("user_sessions")
    .select("id, grace_until")
    .eq("user_id", userId)
    .neq("device_id", currentDeviceId)
    .eq("is_active", true)

  const expiredIds = (sessions || [])
    .filter((session) => session.grace_until && new Date(session.grace_until).getTime() <= Date.now())
    .map((session) => session.id)

  if (expiredIds.length) {
    await supabase
      .from("user_sessions")
      .update({ is_active: false, status: "expired" })
      .in("id", expiredIds)
  }
}

export async function registerDeviceSession(userId) {
  const deviceId = getOrCreateDeviceId()
  const timestamp = nowIso()

  await deactivateExpiredGraceSessions(userId, deviceId)

  const { data: existingCurrent } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .maybeSingle()

  const { data: activeOthers } = await supabase
    .from("user_sessions")
    .select("id, device_id, status, grace_until")
    .eq("user_id", userId)
    .neq("device_id", deviceId)
    .eq("is_active", true)

  const isNewDevice = !existingCurrent && (activeOthers || []).length > 0

  if (isNewDevice && activeOthers?.length) {
    const ids = activeOthers.map((session) => session.id)
    await supabase
      .from("user_sessions")
      .update({
        status: "replaced",
        grace_until: timestamp,
        is_active: false,
      })
      .in("id", ids)

    await logActivity("session_replaced", "system", `New device ${deviceId} replaced ${ids.length} existing session(s)`, userId, null, false)
  }

  const payload = {
    user_id: userId,
    device_id: deviceId,
    created_at: existingCurrent?.created_at || timestamp,
    last_active: timestamp,
    is_active: true,
    status: "active",
    grace_until: null,
  }

  await supabase.from("user_sessions").upsert([payload], { onConflict: "user_id,device_id" })

  writeSessionCache({
    userId,
    deviceId,
    isActive: true,
    status: "active",
    graceUntil: null,
    lastActive: timestamp,
  })

  return {
    deviceId,
    isNewDevice,
  }
}

export async function touchCurrentSession(userId) {
  const deviceId = getOrCreateDeviceId()
  const timestamp = nowIso()

  writeSessionCache({
    ...(readSessionCache() || {}),
    userId,
    deviceId,
    isActive: true,
    lastActive: timestamp,
  })

  if (!navigator.onLine || !userId) {
    return { success: true, offline: true }
  }

  const { error } = await supabase
    .from("user_sessions")
    .update({ last_active: timestamp })
    .eq("user_id", userId)
    .eq("device_id", deviceId)

  if (error) {
    throw new Error(error.message || "Impossible de mettre à jour la session")
  }

  return { success: true }
}

export async function validateDeviceSession(userId) {
  const deviceId = getOrCreateDeviceId()

  if (!navigator.onLine) {
    const cached = readSessionCache()
    const isValidOffline =
      cached?.userId === userId &&
      cached?.deviceId === deviceId &&
      cached?.isActive &&
      (!cached?.graceUntil || isFuture(cached.graceUntil))

    return { valid: !!isValidOffline, deviceId, source: "offline" }
  }

  await deactivateExpiredGraceSessions(userId, deviceId)

  const { data: session } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .maybeSingle()

  const isValid = !!session?.is_active && (!session?.grace_until || isFuture(session.grace_until))

  if (isValid) {
    await supabase
      .from("user_sessions")
      .update({ last_active: nowIso() })
      .eq("id", session.id)

    writeSessionCache({
      userId,
      deviceId,
      isActive: true,
      status: session.status || "active",
      graceUntil: session.grace_until || null,
      lastActive: nowIso(),
    })
  }

  return {
    valid: isValid,
    deviceId,
    source: "online",
  }
}

export async function deactivateCurrentSession(userId) {
  const deviceId = getOrCreateDeviceId()
  clearSessionCache()

  if (!navigator.onLine || !userId) return

  await supabase
    .from("user_sessions")
    .update({ is_active: false, status: "logged_out", last_active: nowIso() })
    .eq("user_id", userId)
    .eq("device_id", deviceId)
}

export async function listUserSessions(userId) {
  if (!userId) return []

  if (!navigator.onLine) {
    const cached = readSessionCache()
    if (!cached || cached.userId !== userId) return []
    return [
      {
        device_id: cached.deviceId,
        status: cached.status || "active",
        is_active: cached.isActive,
        grace_until: cached.graceUntil || null,
        last_active: cached.lastActive || null,
        current_device: true,
      },
    ]
  }

  const currentDeviceId = getOrCreateDeviceId()
  const { data, error } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("last_active", { ascending: false })

  if (error) {
    throw new Error(error.message || "Impossible de charger les sessions")
  }

  return (data || []).map((session) => ({
    ...session,
    current_device: session.device_id === currentDeviceId,
  }))
}

export async function listAllActiveSessions() {
  if (!navigator.onLine) return []

  const { data, error } = await supabase
    .from("user_sessions")
    .select("*")
    .order("last_active", { ascending: false })

  if (error) {
    throw new Error(error.message || "Impossible de charger les sessions globales")
  }

  return data || []
}

export async function revokeSession(sessionId) {
  if (!navigator.onLine || !sessionId) {
    throw new Error("Connexion requise pour révoquer une session")
  }

  const { error } = await supabase
    .from("user_sessions")
    .update({ is_active: false, status: "revoked", last_active: nowIso() })
    .eq("id", sessionId)

  if (error) {
    throw new Error(error.message || "Impossible de révoquer la session")
  }

  await logActivity("session_revoked", "system", `Session ${sessionId} revoked`, null, null, false)
  return { success: true }
}

export async function revokeOtherSessions(userId) {
  if (!navigator.onLine || !userId) {
    throw new Error("Connexion requise pour fermer les autres sessions")
  }

  const deviceId = getOrCreateDeviceId()
  const { data: sessions } = await supabase
    .from("user_sessions")
    .select("id")
    .eq("user_id", userId)
    .neq("device_id", deviceId)
    .eq("is_active", true)

  const ids = (sessions || []).map((session) => session.id)
  if (!ids.length) {
    return { success: true, count: 0 }
  }

  const { error } = await supabase
    .from("user_sessions")
    .update({ is_active: false, status: "revoked", last_active: nowIso() })
    .in("id", ids)

  if (error) {
    throw new Error(error.message || "Impossible de fermer les autres sessions")
  }

  await logActivity("session_revoke_others", "system", `User revoked ${ids.length} other session(s)`, userId, null, false)
  return { success: true, count: ids.length }
}
