/**
 * Notification system using Supabase Realtime
 */

import { supabase } from "../supabaseClient"
import { logActivity } from "./activityLogger"

const NOTIFICATIONS_TABLE = "notifications"

/**
 * Create a notification
 */
export async function createNotification({
  title,
  message,
  type = "info",
  userId = null,
  targetUserId = null,
  link = null,
  createdBy = null,
}) {
  try {
    const { data, error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .insert([
        {
          title,
          message,
          type,
          user_id: targetUserId,
          created_by: createdBy,
          link,
          read: false,
        },
      ])
      .select()

    if (error) {
      console.error("[notifications] Create error:", error)
      throw error
    }

    return data?.[0]
  } catch (error) {
    console.error("[notifications] Exception:", error)
    throw error
  }
}

/**
 * Send notification to all users
 */
export async function broadcastNotification({ title, message, type = "info", createdBy = null }) {
  try {
    // Get all active users
    const { data: users } = await supabase.from("utilisateurs").select("id").eq("status", "active")

    if (!users || users.length === 0) {
      return { success: false, message: "No active users found" }
    }

    // Create notification for each user
    const notifications = users.map((user) => ({
      title,
      message,
      type,
      user_id: user.id, // notifications.user_id references auth.users.id (same as utilisateurs.id)
      created_by: createdBy,
      read: false,
    }))

    const { error } = await supabase.from(NOTIFICATIONS_TABLE).insert(notifications)

    if (error) {
      console.error("[notifications] Broadcast error:", error)
      throw error
    }

    // Log activity
    await logActivity(
      "notification_sent",
      "system",
      `Notification broadcasted: ${title}`,
      createdBy,
      null,
    )

    return { success: true, count: users.length }
  } catch (error) {
    console.error("[notifications] Broadcast exception:", error)
    throw error
  }
}

/**
 * Get notifications for current user
 */
export async function getUserNotifications(userId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[notifications] Fetch error:", error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error("[notifications] Fetch exception:", error)
    return []
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId) {
  try {
    const { error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)

    if (error) {
      console.error("[notifications] Mark read error:", error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("[notifications] Mark read exception:", error)
    throw error
  }
}

/**
 * Subscribe to real-time notifications
 */
export function subscribeToNotifications(userId, callback) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: NOTIFICATIONS_TABLE,
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log("[notifications] New notification:", payload)
        callback(payload.new)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
