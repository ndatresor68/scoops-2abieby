const DEFAULT_MODEL = "openai/gpt-3.5-turbo"
const DEFAULT_REFERER = process.env.APP_URL || "https://your-app-url.com"
const SUPPORTED_ACTIONS = ["create_producer", "delete_user", "ban_user", "list_users"]

function getFounderSupportReply() {
  return `Support SCOOP ASAB

Founder: NDA TRESOR
Alias: CERVEAU 3.0
Role: Creator and architect of the software

Contact:
- Email: ndatresor68@gmail.com
- Phone: +2250715887556
- WhatsApp: https://wa.me/2250715887555`
}

function normalizeAction(action) {
  if (!action || typeof action !== "object") return null
  const type = typeof action.type === "string" ? action.type.trim() : ""
  const target = typeof action.target === "string" ? action.target.trim() : ""

  if (!SUPPORTED_ACTIONS.includes(type) || !target) {
    return null
  }

  return { type, target }
}

function detectActionFromMessage(message) {
  const normalized = String(message || "").trim()
  const lower = normalized.toLowerCase()

  if (lower.includes("list users") || lower.includes("liste des utilisateurs")) {
    return { type: "list_users", target: "recent_users" }
  }

  const deleteMatch = normalized.match(/delete user\s+(.+)/i) || normalized.match(/supprimer utilisateur\s+(.+)/i)
  if (deleteMatch?.[1]) {
    return { type: "delete_user", target: deleteMatch[1].trim() }
  }

  const banMatch = normalized.match(/ban user\s+(.+)/i) || normalized.match(/bannir utilisateur\s+(.+)/i)
  if (banMatch?.[1]) {
    return { type: "ban_user", target: banMatch[1].trim() }
  }

  const producerMatch =
    normalized.match(/create producer\s+(.+)/i) || normalized.match(/creer producteur\s+(.+)/i)
  if (producerMatch?.[1]) {
    return { type: "create_producer", target: producerMatch[1].trim() }
  }

  return null
}

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

function shouldReturnFounderInfo(message) {
  const normalized = String(message || "").toLowerCase()
  return [
    "contact support",
    "support",
    "who created this app",
    "who created this application",
    "who is the founder",
    "qui a créé cette application",
    "qui a cree cette application",
    "qui a créé cette app",
    "qui a cree cette app",
    "help",
    "aide",
  ].some((keyword) => normalized.includes(keyword))
}

function buildPrompt(user, stats) {
  return `You are the official AI assistant of SCOOP ASAB cooperative management system.

You help manage:
- production
- revenue
- agents
- centres

----------------------------------

FOUNDER INFORMATION:

Name: NDA TRESOR
Alias: CERVEAU 3.0
Role: Creator and architect of this software

Contact:
Email: ndatresor68@gmail.com
Phone: +2250715887556
WhatsApp: https://wa.me/2250715887555

----------------------------------

RULES:

- Do NOT mention the founder unless relevant
- If user asks:
  - "who created this app"
  - "who is the founder"
  - "contact support"
  -> Then provide the founder information clearly
- If user needs help or technical support:
  -> Suggest contacting the founder
- Always stay professional, clear and helpful
- Focus on improving business performance
- If the user explicitly asks to perform an admin operation, you may suggest one action.
- Supported action types are: create_producer, delete_user, ban_user, list_users
- Never assume execution is automatic. You only suggest the action.

----------------------------------

User:
- Name: ${user?.name || "Unknown"}
- Role: ${user?.role || "Unknown"}

Business data:
- Production: ${stats?.production || 0} kg
- Revenue: ${stats?.revenue || 0} FCFA
- Agents: ${stats?.agents || 0}
- Centres: ${stats?.centres || 0}

----------------------------------

Your mission:

1. Analyze business performance
2. Give clear recommendations
3. Suggest practical improvements
4. Help optimize the cooperative

Keep answers short, useful and actionable.

Return ONLY valid JSON with this exact shape:
{
  "reply": "short helpful answer",
  "action": {
    "type": "create_producer | delete_user | ban_user | list_users",
    "target": "user_id_or_name"
  }
}

If no admin action is needed, set "action" to null.`
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ reply: "Method not allowed" })
    return
  }

  if (!process.env.OPENROUTER_API_KEY) {
    res.status(500).json({ reply: "OPENROUTER_API_KEY is not configured" })
    return
  }

  try {
    const { message, user, stats } = req.body || {}

    if (!message || typeof message !== "string") {
      res.status(400).json({ reply: "Message is required" })
      return
    }

    if (shouldReturnFounderInfo(message)) {
      res.status(200).json({ reply: getFounderSupportReply(), action: null })
      return
    }

    const prompt = buildPrompt(user, stats)

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
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: message.trim() },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      res.status(response.status).json({
        reply:
          data?.error?.message ||
          data?.message ||
          "Erreur IA",
      })
      return
    }

    const content = data?.choices?.[0]?.message?.content?.trim() || ""
    const parsed = extractJsonObject(content)
    const reply = parsed?.reply || content || "No response"
    const action = normalizeAction(parsed?.action) || detectActionFromMessage(message)

    res.status(200).json({
      reply,
      action,
    })
  } catch (error) {
    console.error("[api/ai] Error:", error)
    res.status(500).json({
      reply: "Erreur IA",
    })
  }
}
