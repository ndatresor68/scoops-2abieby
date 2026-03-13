/**
 * Professional Activity Logger Utility
 * 
 * Logs system activities to the activites table for professional audit tracking.
 * Includes device information, IP address, and location.
 * Falls back gracefully if table doesn't exist.
 */

import { supabase } from "../supabaseClient"
import { captureDeviceInfo, captureBasicDeviceInfo } from "./deviceInfo"

/**
 * Log an activity to the activites table with full device information
 * @param {string} action - Action type (login, user_created, producer_updated, etc.)
 * @param {string} target - Target type (user, centre, producteur, achat, system, pdf, settings)
 * @param {string} details - Details description
 * @param {string|null} userId - User ID who performed the action (optional)
 * @param {string|null} userEmail - User email (optional, will be fetched if not provided)
 * @param {boolean} includeLocation - Whether to request location permission (default: false)
 * @returns {Promise<void>}
 */
export async function logActivity(action, target, details, userId = null, userEmail = null, includeLocation = false) {
  try {
    // Check if activity logging is enabled in settings
    // We need to check this dynamically to avoid circular dependencies
    let activityLoggingEnabled = true // Default to true
    
    try {
      // Try to get settings from localStorage or check Supabase
      const settingsStr = localStorage.getItem("app_settings")
      if (settingsStr) {
        const settings = JSON.parse(settingsStr)
        activityLoggingEnabled = settings.activity_logging !== false
      } else {
        // Check Supabase directly
        const { data } = await import("../supabaseClient").then((m) =>
          m.supabase.from("settings").select("activity_logging").limit(1).maybeSingle()
        )
        if (data) {
          activityLoggingEnabled = data.activity_logging !== false
        }
      }
    } catch (error) {
      console.warn("[activityLogger] Could not check activity_logging setting, defaulting to enabled:", error)
    }

    // If logging is disabled, skip logging
    if (!activityLoggingEnabled) {
      console.log("[activityLogger] Activity logging is disabled, skipping log for:", action)
      return
    }

    // Capture device information
    let deviceInfo
    if (includeLocation) {
      deviceInfo = await captureDeviceInfo(true)
    } else {
      // For most actions, use basic info (faster, no IP lookup)
      deviceInfo = captureBasicDeviceInfo()
      // Still try to get IP in background for important actions
      if (action === "login" || action === "user_created" || action === "producer_deleted") {
        deviceInfo.ipAddress = await import("./deviceInfo").then((m) => m.getIPAddress())
      }
    }

    // Get user email if not provided
    if (!userEmail && userId) {
      try {
        const { data: userData } = await supabase
          .from("utilisateurs")
          .select("email")
          .eq("id", userId) // id is the PRIMARY KEY
          .single()

        if (userData?.email) {
          userEmail = userData.email
        }
      } catch (error) {
        console.warn("[activityLogger] Could not fetch user email:", error)
      }
    }

    // Insert activity log
    const { error } = await supabase.from("activites").insert([
      {
        user_id: userId, // activites.user_id references auth.users.id (not utilisateurs.id)
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

    if (error) {
      // Table might not exist yet - log warning but don't throw
      console.warn("[activityLogger] Failed to log activity:", error.message)
      console.warn("[activityLogger] Action:", action, "Target:", target, "Details:", details)
      // Don't throw - activity logging is non-critical
      return
    }

    console.log("[activityLogger] Activity logged:", { action, target, details })
  } catch (error) {
    // Catch any unexpected errors
    console.warn("[activityLogger] Error logging activity:", error)
    // Don't throw - activity logging should never break the main flow
  }
}

/**
 * Log user login
 */
export async function logUserLogin(userId, userEmail) {
  return logActivity("login", "system", "User logged in", userId, userEmail, false)
}

/**
 * Log user logout
 */
export async function logUserLogout(userId, userEmail) {
  return logActivity("logout", "system", "User logged out", userId, userEmail, false)
}

/**
 * Log user creation
 */
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

/**
 * Log user update
 */
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

/**
 * Log user deletion
 */
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

/**
 * Log user suspension
 */
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

/**
 * Log user ban
 */
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

/**
 * Log user reactivation
 */
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

/**
 * Log producer creation
 */
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

/**
 * Log producer update
 */
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

/**
 * Log producer deletion
 */
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

/**
 * Log centre creation
 */
export async function logCentreCreated(centreId, centreName, createdByUserId = null, createdByEmail = null) {
  return logActivity("centre_created", "centre", `Centre ${centreName} created`, createdByUserId, createdByEmail, false)
}

/**
 * Log centre update
 */
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

/**
 * Log centre deletion
 */
export async function logCentreDeleted(centreId, centreName, deletedByUserId = null, deletedByEmail = null) {
  return logActivity("centre_deleted", "centre", `Centre ${centreName} deleted`, deletedByUserId, deletedByEmail, false)
}

/**
 * Log achat creation
 */
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

/**
 * Log PDF export
 */
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

/**
 * Log settings update
 */
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
