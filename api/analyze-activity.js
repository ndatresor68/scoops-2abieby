import { createClient } from "@supabase/supabase-js"

const DEFAULT_MODEL = "openai/gpt-3.5-turbo"
const DEFAULT_REFERER = process.env.APP_URL || "https://your-app-url.com"

function extractJsonObject(content) {
  if (!content) return null
  const start = content.indexOf("{")
  const end = content.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null

  try {
    return JSON.parse(content.slice(start, end + 1))
  } catch (error) {
    return null
  }
}

function getSupabaseClients() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !serviceKey || !anonKey) {
    throw new Error("Supabase environment is not configured")
  }

  return {
    adminClient: createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    authClient: createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  }
}

function buildFallbackAnalysis(logs) {
  const suspiciousActions = logs.filter((log) =>
    ["user_deleted", "user_banned", "ai_delete_user", "ai_ban_user"].includes(log.action),
  )

  return {
    summary: `Analyse de ${logs.length} logs. ${suspiciousActions.length} action(s) sensible(s) détectée(s).`,
    highlights: suspiciousActions.slice(0, 5).map((log) => `${log.action} • ${log.user_name || "Unknown"} • ${log.details || "-"}`),
    anomalies: suspiciousActions.slice(0, 5).map((log) => ({
      title: log.action,
      reason: log.details || "Sensitive action detected",
    })),
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ reply: "Method not allowed" })
    return
  }

  try {
    const authHeader = req.headers.authorization || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (!token) {
      res.status(401).json({ reply: "Unauthorized" })
      return
    }

    const { adminClient, authClient } = getSupabaseClients()
    const { data: authData, error: authError } = await authClient.auth.getUser(token)

    if (authError || !authData?.user) {
      res.status(401).json({ reply: "Invalid session" })
      return
    }

    const { data: profile } = await adminClient
      .from("utilisateurs")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle()

    if (!profile || profile.role !== "ADMIN") {
      res.status(403).json({ reply: "Admin access required" })
      return
    }

    const logs = Array.isArray(req.body?.logs) ? req.body.logs.slice(0, 200) : []
    if (logs.length === 0) {
      res.status(400).json({ reply: "No logs provided" })
      return
    }

    if (!process.env.OPENROUTER_API_KEY) {
      res.status(200).json(buildFallbackAnalysis(logs))
      return
    }

    const prompt = `You are an audit monitoring assistant.
Review the following business activity logs and return ONLY valid JSON:
{
  "summary": "short summary",
  "highlights": ["important action 1", "important action 2"],
  "anomalies": [{"title": "issue", "reason": "why suspicious"}]
}

Focus on:
- suspicious behaviour
- destructive actions
- unusual activity patterns
- important actions taken by users

Logs:
${JSON.stringify(logs)}`

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": DEFAULT_REFERER,
        "X-Title": "SCOOP ASAB APP",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [{ role: "system", content: prompt }],
        max_tokens: 400,
        temperature: 0.3,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      res.status(200).json(buildFallbackAnalysis(logs))
      return
    }

    const content = data?.choices?.[0]?.message?.content?.trim() || ""
    const parsed = extractJsonObject(content) || buildFallbackAnalysis(logs)
    res.status(200).json(parsed)
  } catch (error) {
    console.error("[api/analyze-activity] Error:", error)
    res.status(500).json({ reply: "Activity analysis failed" })
  }
}
