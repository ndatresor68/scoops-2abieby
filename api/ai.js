const DEFAULT_MODEL = "openai/gpt-3.5-turbo"
const DEFAULT_REFERER = process.env.APP_URL || "https://your-app-url.com"

function buildPrompt(user, stats) {
  return `You are a business advisor specialized in agricultural cooperatives.

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
