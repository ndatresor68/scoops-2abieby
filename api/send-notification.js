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
    if (!serverKey) {
      res.status(500).json({ success: false, error: "FCM_SERVER_KEY is not configured" })
      return
    }

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
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

      if (!supabaseUrl || !supabaseServiceKey) {
        res.status(500).json({
          success: false,
          error: "Supabase server configuration missing (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required)",
        })
        return
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

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

      results.push({
        ok: fcmRes.ok,
        status: fcmRes.status,
        sent: chunk.length,
        response: data,
      })

      if (!fcmRes.ok) {
        // Continue sending other chunks, but mark failure.
        continue
      }
    }

    const successChunks = results.filter((r) => r.ok)
    const sentTotal = results.reduce((sum, r) => sum + (r.sent || 0), 0)

    res.status(200).json({
      success: successChunks.length > 0,
      sentTotal,
      chunks: results,
    })
  } catch (error) {
    console.error("[api/send-notification] Error:", error)
    res.status(500).json({ success: false, error: "Internal server error" })
  }
}

