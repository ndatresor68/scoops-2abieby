import { supabase } from "../supabaseClient"
import { captureBasicDeviceInfo, captureDeviceInfo } from "./deviceInfo"

const PAGE_BY_TARGET = {
  user: "/admin/users",
  centre: "/admin/centres",
  producteur: "/admin/producteurs",
  achat: "/admin/pesees",
  system: "/dashboard",
  pdf: "/admin/activity",
  settings: "/admin/settings",
}

function getPageFromContext(target, action) {
  if (action === "login" || action === "logout") return "/login"
  return PAGE_BY_TARGET[target] || "/"
}

async function isActivityLoggingEnabled() {
  let activityLoggingEnabled = true

  try {
    const settingsStr = localStorage.getItem("app_settings")
    if (settingsStr) {
      const settings = JSON.parse(settingsStr)
      activityLoggingEnabled = settings.activity_logging !== false
    } else {
      const { data } = await import("../supabaseClient").then((m) =>
        m.supabase.from("settings").select("activity_logging").limit(1).maybeSingle(),
      )
      if (data) {
        activityLoggingEnabled = data.activity_logging !== false
      }
    }
  } catch (error) {
    activityLoggingEnabled = true
  }

  return activityLoggingEnabled
}

async function getUserProfile(userId, fallbackEmail = null) {
  if (!userId) {
    return {
      userName: "System",
      userEmail: fallbackEmail,
    }
  }

  try {
    const { data } = await supabase
      .from("utilisateurs")
      .select("nom, email")
      .eq("id", userId)
      .maybeSingle()

    return {
      userName: data?.nom || data?.email || fallbackEmail || "Utilisateur",
      userEmail: data?.email || fallbackEmail,
    }
  } catch (error) {
    return {
      userName: fallbackEmail || "Utilisateur",
      userEmail: fallbackEmail,
    }
  }
}

async function insertLegacyActivity({
  action,
  target,
  details,
  userId,
  userEmail,
  includeLocation,
}) {
  let deviceInfo
  if (includeLocation) {
    deviceInfo = await captureDeviceInfo(true)
  } else {
    deviceInfo = captureBasicDeviceInfo()
    if (action === "login" || action === "user_created" || action === "producer_deleted") {
      deviceInfo.ipAddress = await import("./deviceInfo").then((m) => m.getIPAddress())
    }
  }

  const { error } = await supabase.from("activites").insert([
    {
      user_id: userId,
      user_email: userEmail,
      action,
      target,
      details,
      ip_address: deviceInfo.ipAddress || null,
      device: deviceInfo.device || null,
      browser: deviceInfo.browser || null,
      os: deviceInfo.os || null,
      location: deviceInfo.location || null,
    },
  ])

  return error
}

async function insertAuditActivity({ userId, userName, action, details, page }) {
  const { error } = await supabase.from("activity_logs").insert([
    {
      user_id: userId,
      user_name: userName,
      action,
      details,
      page,
    },
  ])

  return error
}

async function logLegacySignature(action, target, details, userId = null, userEmail = null, includeLocation = false) {
  const enabled = await isActivityLoggingEnabled()
  if (!enabled) return

  try {
    const profile = await getUserProfile(userId, userEmail)

    await Promise.allSettled([
      insertLegacyActivity({
        action,
        target,
        details,
        userId,
        userEmail: profile.userEmail,
        includeLocation,
      }),
      insertAuditActivity({
        userId,
        userName: profile.userName,
        action,
        details,
        page: getPageFromContext(target, action),
      }),
    ])
  } catch (error) {
    // Logging must never break the app.
  }
}

async function logUserSignature(user, action, details, page = "/") {
  const enabled = await isActivityLoggingEnabled()
  if (!enabled) return

  try {
    const profile = await getUserProfile(user?.id || null, user?.email || null)
    await insertAuditActivity({
      userId: user?.id || null,
      userName: user?.nom || user?.name || profile.userName,
      action,
      details,
      page,
    })
  } catch (error) {
    // Logging must never break the app.
  }
}

export async function logActivity(arg1, arg2, arg3, arg4, arg5, arg6) {
  if (typeof arg1 === "string") {
    return logLegacySignature(arg1, arg2, arg3, arg4, arg5, arg6)
  }

  return logUserSignature(arg1, arg2, arg3, arg4)
}

export async function logAppActivity(user, action, details, page = "/") {
  return logUserSignature(user, action, details, page)
}

export async function logUserLogin(userId, userEmail) {
  return logActivity("login", "system", "User logged in", userId, userEmail, false)
}

export async function logUserLogout(userId, userEmail) {
  return logActivity("logout", "system", "User logged out", userId, userEmail, false)
}

export async function logUserCreated(userId, userName, role, createdByUserId = null, createdByEmail = null) {
  return logActivity(
    "user_created",
    "user",
    `User ${userName} created with role ${role}`,
    createdByUserId,
    createdByEmail,
    false,
  )
}

export async function logUserUpdated(userId, userName, changes, updatedByUserId = null, updatedByEmail = null) {
  return logActivity(
    "user_updated",
    "user",
    `User ${userName} updated: ${changes}`,
    updatedByUserId,
    updatedByEmail,
    false,
  )
}

export async function logUserDeleted(userId, userName, deletedByUserId = null, deletedByEmail = null) {
  return logActivity(
    "user_deleted",
    "user",
    `User ${userName} deleted`,
    deletedByUserId,
    deletedByEmail,
    false,
  )
}

export async function logUserSuspended(userId, userName, suspendedByUserId = null, suspendedByEmail = null) {
  return logActivity(
    "user_suspended",
    "user",
    `User ${userName} suspended`,
    suspendedByUserId,
    suspendedByEmail,
    false,
  )
}

export async function logUserBanned(userId, userName, bannedByUserId = null, bannedByEmail = null) {
  return logActivity(
    "user_banned",
    "user",
    `User ${userName} banned`,
    bannedByUserId,
    bannedByEmail,
    false,
  )
}

export async function logUserReactivated(userId, userName, reactivatedByUserId = null, reactivatedByEmail = null) {
  return logActivity(
    "user_reactivated",
    "user",
    `User ${userName} reactivated`,
    reactivatedByUserId,
    reactivatedByEmail,
    false,
  )
}

export async function logProducerCreated(
  producerId,
  producerName,
  producerCode,
  createdByUserId = null,
  createdByEmail = null,
) {
  return logActivity(
    "producer_created",
    "producteur",
    `Producer ${producerName} (${producerCode}) created`,
    createdByUserId,
    createdByEmail,
    false,
  )
}

export async function logProducerUpdated(
  producerId,
  producerName,
  changes,
  updatedByUserId = null,
  updatedByEmail = null,
) {
  return logActivity(
    "producer_updated",
    "producteur",
    `Producer ${producerName} updated: ${changes}`,
    updatedByUserId,
    updatedByEmail,
    false,
  )
}

export async function logProducerDeleted(producerId, producerName, deletedByUserId = null, deletedByEmail = null) {
  return logActivity(
    "producer_deleted",
    "producteur",
    `Producer ${producerName} deleted`,
    deletedByUserId,
    deletedByEmail,
    false,
  )
}

export async function logCentreCreated(centreId, centreName, createdByUserId = null, createdByEmail = null) {
  return logActivity("centre_created", "centre", `Centre ${centreName} created`, createdByUserId, createdByEmail, false)
}

export async function logCentreUpdated(centreId, centreName, changes, updatedByUserId = null, updatedByEmail = null) {
  return logActivity(
    "centre_updated",
    "centre",
    `Centre ${centreName} updated: ${changes}`,
    updatedByUserId,
    updatedByEmail,
    false,
  )
}

export async function logCentreDeleted(centreId, centreName, deletedByUserId = null, deletedByEmail = null) {
  return logActivity("centre_deleted", "centre", `Centre ${centreName} deleted`, deletedByUserId, deletedByEmail, false)
}

export async function logAchatCreated(
  achatId,
  producerName,
  poids,
  montant,
  createdByUserId = null,
  createdByEmail = null,
) {
  return logActivity(
    "achat_created",
    "achat",
    `Purchase of ${poids}kg for ${producerName} - ${Number(montant || 0).toLocaleString()} FCFA`,
    createdByUserId,
    createdByEmail,
    false,
  )
}

export async function logPDFExported(pdfType, details, exportedByUserId = null, exportedByEmail = null) {
  return logActivity(
    "pdf_exported",
    "pdf",
    `PDF exported: ${pdfType} - ${details}`,
    exportedByUserId,
    exportedByEmail,
    false,
  )
}

export async function logSettingsUpdated(settings, updatedByUserId = null, updatedByEmail = null) {
  return logActivity(
    "settings_updated",
    "settings",
    `Settings updated: ${settings}`,
    updatedByUserId,
    updatedByEmail,
    false,
  )
}
