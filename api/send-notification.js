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

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ success: false, error: "Method not allowed" })
      return
    }

    const { title, body, tokens } = req.body || {}

    if (!title || typeof title !== "string" || !body || typeof body !== "string") {
      res.status(400).json({ success: false, error: "Missing or invalid title/body" })
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

    // Normalize tokens (optional).
    // If tokens aren't provided, fetch active device tokens from Supabase using service role.
    let tokenList = []

    if (tokens !== undefined && tokens !== null) {
      if (Array.isArray(tokens)) {
        tokenList = tokens.map((t) => String(t).trim()).filter(Boolean)
      } else if (typeof tokens === "string") {
        tokenList = tokens
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      }
    } else {
      const { data: tokenRows, error: tokenFetchError } = await supabase
        .from("device_tokens")
        .select("token")
        .eq("status", "active")

      if (tokenFetchError) {
        res.status(500).json({ success: false, error: "Failed to fetch device tokens", details: tokenFetchError.message })
        return
      }

      tokenList = (tokenRows || []).map((r) => r.token).filter(Boolean)
    }

    if (tokenList.length === 0) {
      res.status(400).json({ success: false, error: "No active device tokens found" })
      return
    }

    const tokenChunks = chunkArray(tokenList, MAX_TOKENS_PER_REQUEST)

    const results = []
    const invalidTokens = []
    let successCount = 0
    let failureCount = 0

    for (const chunk of tokenChunks) {
      const payload = {
        registration_ids: chunk,
        notification: {
          title,
          body,
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
        ? chunk.map((token, index) => {
            const result = data.results[index] || {}
            const error = normalizeTokenError(result.error)
            const item = {
              token,
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

    console.log("[api/send-notification] Send summary:", {
      attempted: tokenList.length,
      successCount,
      failureCount,
      invalidTokenCount: [...new Set(invalidTokens)].length,
    })

    res.status(200).json({
      success,
      attemptedTotal: tokenList.length,
      sentTotal: successCount,
      failureTotal: failureCount,
      invalidTokenCount: [...new Set(invalidTokens)].length,
      chunks: results,
    })
  } catch (error) {
    console.error("[api/send-notification] Error:", error)
    res.status(500).json({ success: false, error: "Internal server error" })
  }
}
