const DEFAULT_MODEL = "openai/gpt-3.5-turbo"
const DEFAULT_REFERER = process.env.APP_URL || "https://your-app-url.com"

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

function shouldReturnFounderInfo(message) {
  const normalized = String(message || "").toLowerCase()
  return [
    "contact support",
    "support",
    "who created this app",
    "who created this application",
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

Application founder:
- Name: NDA TRESOR
- Alias: CERVEAU 3.0
- Role: Creator and architect of the software

Contact:
- Email: ndatresor68@gmail.com
- Phone: +2250715887556
- WhatsApp: https://wa.me/2250715887555

Rules:
- Do NOT mention founder unless relevant
- If user asks who created this app, answer with founder info
- If user needs support, suggest contacting founder
- Stay professional and helpful

You are also a business advisor specialized in agricultural cooperatives.
You act like an internal business assistant for the cooperative.
You understand company structure including centres, agents, production, revenue and field operations.

User:
- Name: ${user?.name || "Unknown"}
- Role: ${user?.role || "Unknown"}

Business data:
- Production: ${stats?.production || 0} kg
- Revenue: ${stats?.revenue || 0} FCFA
- Agents: ${stats?.agents || 0}
- Centres: ${stats?.centres || 0}

Your task:
- Analyze the situation
- Give clear recommendations
- Suggest actions to improve performance
- Be concise and practical.`
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
      res.status(200).json({ reply: getFounderSupportReply() })
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

    res.status(200).json({
      reply: data?.choices?.[0]?.message?.content?.trim() || "No response",
    })
  } catch (error) {
    console.error("[api/ai] Error:", error)
    res.status(500).json({
      reply: "Erreur IA",
    })
  }
}
