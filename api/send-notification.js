import { createClient } from "@supabase/supabase-js"
import admin from "firebase-admin"

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
  return [
    "InvalidRegistration",
    "NotRegistered",
    "MismatchSenderId",
    "messaging/invalid-registration-token",
    "messaging/registration-token-not-registered",
    "messaging/mismatched-credential",
  ].includes(error)
}

function normalizeTarget(target) {
  if (target === "user" || target === "specific_user") return "user"
  return "all"
}

function getFirebaseAdmin() {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT

  if (!rawServiceAccount) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured")
  }

  const serviceAccount = JSON.parse(rawServiceAccount)

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  }

  return admin
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

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

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
    const firebaseAdmin = getFirebaseAdmin()
    const messaging = firebaseAdmin.messaging()

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
      const perTokenResults = await Promise.all(
        chunk.map(async (row) => {
          try {
            const messageId = await messaging.send({
              token: row.token,
              notification: {
                title,
                body: normalizedMessage,
              },
            })

            successCount += 1

            return {
              token: row.token,
              user_id: row.user_id,
              ok: true,
              messageId,
              error: null,
            }
          } catch (error) {
            const normalizedError = normalizeTokenError(error?.code || error?.message || error)
            failureCount += 1

            if (isInvalidTokenError(normalizedError)) {
              invalidTokens.push(row.token)
            }

            return {
              token: row.token,
              user_id: row.user_id,
              ok: false,
              messageId: null,
              error: normalizedError,
            }
          }
        }),
      )

      for (const item of perTokenResults) {
        logRows.push({
          notification_id: notificationRow.id,
          user_id: item.user_id,
          token: item.token,
          status: item.ok ? "success" : "failed",
          error_message: item.error,
        })
      }

      results.push({
        ok: perTokenResults.every((item) => item.ok),
        status: perTokenResults.every((item) => item.ok) ? 200 : 207,
        attempted: chunk.length,
        successCount: perTokenResults.filter((item) => item.ok).length,
        failureCount: perTokenResults.filter((item) => !item.ok).length,
        response: null,
        results: perTokenResults,
      })
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
      }
    }

    const success = successCount > 0
    const uniqueRecipientUserCount = new Set(
      tokenRows.map((row) => row.user_id).filter(Boolean),
    ).size

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
    res.status(500).json({ success: false, error: error?.message || "Internal server error" })
  }
}
