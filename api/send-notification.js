/**
 * Secure FCM sender endpoint (server-side only).
 *
 * Receives:
 * - title (string)
 * - body (string)
 * - tokens (array<string>) optional. If omitted, the endpoint fetches active device tokens from Supabase.
 *
 * Uses:
 * - process.env.FCM_SERVER_KEY (FCM server key MUST be kept server-side)
 */

import { createClient } from "@supabase/supabase-js"

const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send"
const MAX_TOKENS_PER_REQUEST = 500 // conservative to avoid payload limits
const LOG_INSERT_CHUNK_SIZE = 500

function chunkArray(arr, chunkSize) {
  const out = []
  for (let i = 0; i < arr.length; i += chunkSize) {
    out.push(arr.slice(i, i + chunkSize))
  }
  return out
}

function normalizeTokenError(error) {
  if (!error) return null
  return String(error)
}

function isInvalidTokenError(error) {
  return ["InvalidRegistration", "NotRegistered", "MismatchSenderId"].includes(error)
}

function normalizeTarget(target) {
  if (target === "user" || target === "specific_user") return "user"
  return "all"
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ success: false, error: "Method not allowed" })
      return
    }

    const {
      title,
      body,
      message,
      tokens,
      target,
      user_id: requestedUserId,
      admin_id: adminId,
    } = req.body || {}
    const normalizedMessage = message || body
    const normalizedTarget = normalizeTarget(target)

    if (
      !title ||
      typeof title !== "string" ||
      !normalizedMessage ||
      typeof normalizedMessage !== "string"
    ) {
      res.status(400).json({ success: false, error: "Missing or invalid title/message" })
      return
    }

    if (normalizedTarget === "user" && !requestedUserId) {
      res.status(400).json({ success: false, error: "user_id is required for target=user" })
      return
    }

    const serverKey = process.env.FCM_SERVER_KEY
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

    if (!serverKey) {
      res.status(500).json({ success: false, error: "FCM_SERVER_KEY is not configured" })
      return
    }

    if (!supabaseUrl) {
      res.status(500).json({ success: false, error: "SUPABASE_URL is not configured" })
      return
    }

    if (!supabaseServiceKey) {
      res.status(500).json({ success: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured" })
      return
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    let tokenRows = []

    if (tokens !== undefined && tokens !== null) {
      if (Array.isArray(tokens)) {
        tokenRows = tokens
          .map((token) => ({ token: String(token).trim(), user_id: requestedUserId || null }))
          .filter((row) => row.token)
      } else if (typeof tokens === "string") {
        tokenRows = tokens
          .split(",")
          .map((token) => ({ token: token.trim(), user_id: requestedUserId || null }))
          .filter((row) => row.token)
      }
    } else {
      let tokenQuery = supabase.from("device_tokens").select("token, user_id").eq("status", "active")

      if (normalizedTarget === "user") {
        tokenQuery = tokenQuery.eq("user_id", requestedUserId)
      }

      const { data, error: tokenFetchError } = await tokenQuery

      if (tokenFetchError) {
        res.status(500).json({
          success: false,
          error: "Failed to fetch device tokens",
          details: tokenFetchError.message,
        })
        return
      }

      tokenRows = (data || []).filter((row) => row.token)
    }

    const tokenRowsByToken = new Map()
    for (const row of tokenRows) {
      if (!row?.token) continue
      tokenRowsByToken.set(row.token, row)
    }
    tokenRows = [...tokenRowsByToken.values()]

    if (tokenRows.length === 0) {
      res.status(400).json({ success: false, error: "No active device tokens found" })
      return
    }

    const notificationPayload = {
      title,
      message: normalizedMessage,
      admin_id: adminId || null,
      target_type: normalizedTarget,
      target_user_id: normalizedTarget === "user" ? requestedUserId : null,
      created_by: adminId || null,
    }

    const { data: notificationRow, error: notificationError } = await supabase
      .from("notifications")
      .insert([notificationPayload])
      .select("id")
      .single()

    if (notificationError || !notificationRow?.id) {
      console.error("[api/send-notification] Failed to insert notification:", notificationError)
      res.status(500).json({ success: false, error: "Failed to save notification" })
      return
    }

    const tokenChunks = chunkArray(tokenRows, MAX_TOKENS_PER_REQUEST)

    const results = []
    const invalidTokens = []
    const logRows = []
    let successCount = 0
    let failureCount = 0

    for (const chunk of tokenChunks) {
      const chunkTokens = chunk.map((row) => row.token)
      const payload = {
        registration_ids: chunkTokens,
        notification: {
          title,
          body: normalizedMessage,
        },
        priority: "high",
      }

      const fcmRes = await fetch(FCM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${serverKey}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await fcmRes.json().catch(() => ({}))

      const perTokenResults = Array.isArray(data?.results)
        ? chunk.map((row, index) => {
            const result = data.results[index] || {}
            const error = normalizeTokenError(result.error)
            const item = {
              token: row.token,
              user_id: row.user_id,
              ok: !error,
              messageId: result.message_id || null,
              registrationId: result.registration_id || null,
              error,
            }

            if (item.ok) {
              successCount += 1
            } else {
              failureCount += 1
              if (isInvalidTokenError(item.error)) {
                invalidTokens.push(token)
              }
            }

            return item
          })
        : []

      if (!perTokenResults.length) {
        if (fcmRes.ok) {
          successCount += chunk.length
        } else {
          failureCount += chunk.length
        }

        const genericStatus = fcmRes.ok ? "success" : "failed"
        const genericError = fcmRes.ok ? null : `FCM HTTP ${fcmRes.status}`
        for (const row of chunk) {
          logRows.push({
            notification_id: notificationRow.id,
            user_id: row.user_id,
            token: row.token,
            status: genericStatus,
            error_message: genericError,
          })
        }
      } else {
        for (const item of perTokenResults) {
          logRows.push({
            notification_id: notificationRow.id,
            user_id: item.user_id,
            token: item.token,
            status: item.ok ? "success" : "failed",
            error_message: item.error,
          })
        }
      }

      results.push({
        ok: fcmRes.ok,
        status: fcmRes.status,
        attempted: chunk.length,
        successCount: perTokenResults.filter((item) => item.ok).length,
        failureCount: perTokenResults.filter((item) => !item.ok).length,
        response: data,
        results: perTokenResults,
      })

      if (!fcmRes.ok) {
        console.error("[api/send-notification] FCM HTTP error:", {
          status: fcmRes.status,
          response: data,
        })
        // Continue sending other chunks, but mark failure.
        continue
      }
    }

    for (const chunk of chunkArray(logRows, LOG_INSERT_CHUNK_SIZE)) {
      if (!chunk.length) continue
      const { error: logInsertError } = await supabase.from("notification_logs").insert(chunk)
      if (logInsertError) {
        console.error("[api/send-notification] Failed to insert notification logs:", logInsertError)
      }
    }

    if (invalidTokens.length > 0) {
      const uniqueInvalidTokens = [...new Set(invalidTokens)]
      const { error: deactivateError } = await supabase
        .from("device_tokens")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .in("token", uniqueInvalidTokens)

      if (deactivateError) {
        console.error("[api/send-notification] Failed to deactivate invalid tokens:", deactivateError)
      } else {
        console.warn("[api/send-notification] Deactivated invalid tokens:", uniqueInvalidTokens.length)
      }
    }

    const success = successCount > 0
    const uniqueRecipientUserCount = new Set(
      tokenRows.map((row) => row.user_id).filter(Boolean),
    ).size

    console.log("[api/send-notification] Send summary:", {
      attempted: tokenRows.length,
      successCount,
      failureCount,
      invalidTokenCount: [...new Set(invalidTokens)].length,
      notificationId: notificationRow.id,
      recipientUserCount: uniqueRecipientUserCount,
      target: normalizedTarget,
    })

    res.status(200).json({
      success,
      notificationId: notificationRow.id,
      attemptedTotal: tokenRows.length,
      sentTotal: successCount,
      failureTotal: failureCount,
      recipientUserCount: uniqueRecipientUserCount,
      invalidTokenCount: [...new Set(invalidTokens)].length,
      chunks: results,
    })
  } catch (error) {
    console.error("[api/send-notification] Error:", error)
    res.status(500).json({ success: false, error: "Internal server error" })
  }
}
