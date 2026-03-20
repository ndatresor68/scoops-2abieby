import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const SPAM_TERMS = ["free", "urgent", "click now"]

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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function containsSpamTerms(value) {
  const normalized = String(value || "").toLowerCase()
  return SPAM_TERMS.some((term) => normalized.includes(term))
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim())
}

function buildEmailHtml(subject, message) {
  const safeSubject = escapeHtml(subject)
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />")

  return `
    <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px;">
      <div style="max-width:600px; margin:auto; background:white; border-radius:10px; overflow:hidden;">
        <div style="background:#ff3b3b; color:white; padding:20px; text-align:center;">
          <h1 style="margin:0;">SCOOP ASAB</h1>
          <p style="margin:8px 0 0;">Gestion coopérative intelligente</p>
        </div>
        <div style="padding:20px; color:#333;">
          <h2 style="margin-top:0;">${safeSubject}</h2>
          <p style="margin:0; line-height:1.7;">${safeMessage}</p>
        </div>
        <div style="padding:20px; background:#fafafa; font-size:12px; color:#777;">
          <p>Vous recevez cet email car vous êtes membre de SCOOP ASAB.</p>
          <hr style="margin:15px 0;" />
          <p><strong>Fondateur :</strong> NDA TRESOR (CERVEAU 3.0)</p>
          <p><strong>Rôle :</strong> Créateur et concepteur du système</p>
          <p><strong>Email :</strong> ndatresor68@gmail.com</p>
          <p><strong>Téléphone :</strong> +2250715887556</p>
          <p><strong>WhatsApp :</strong> https://wa.me/2250715887555</p>
        </div>
      </div>
    </div>
  `
}

async function logEmailAction(adminClient, user, details) {
  try {
    await adminClient.from("activity_logs").insert([
      {
        user_id: user.id,
        user_name: user.nom || user.email || "Admin",
        action: "email_sent",
        details,
        page: "/admin/notifications",
      },
    ])
  } catch (error) {
    console.error("[api/send-email] Failed to log email action:", error)
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  if (!process.env.RESEND_API_KEY) {
    res.status(500).json({ error: "RESEND_API_KEY is not configured" })
    return
  }

  try {
    const authHeader = req.headers.authorization || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

    if (!token) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }

    const { adminClient, authClient } = getSupabaseClients()
    const { data: authData, error: authError } = await authClient.auth.getUser(token)

    if (authError || !authData?.user) {
      res.status(401).json({ error: "Invalid session" })
      return
    }

    const { data: profile } = await adminClient
      .from("utilisateurs")
      .select("id, nom, email, role")
      .eq("id", authData.user.id)
      .maybeSingle()

    if (!profile || profile.role !== "ADMIN") {
      res.status(403).json({ error: "Admin access required" })
      return
    }

    const { to, subject, message } = req.body || {}
    const recipients = (Array.isArray(to) ? to : typeof to === "string" ? [to] : [])
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)

    const normalizedSubject = String(subject || "").trim()
    const normalizedMessage = String(message || "").trim()

    if (!recipients.length || !normalizedSubject || !normalizedMessage) {
      res.status(400).json({ error: "Missing recipients, subject or message" })
      return
    }

    const invalidRecipients = recipients.filter((email) => !isValidEmail(email))
    if (invalidRecipients.length > 0) {
      res.status(400).json({ error: "Some recipient emails are invalid" })
      return
    }

    if (containsSpamTerms(normalizedSubject) || containsSpamTerms(normalizedMessage)) {
      res.status(400).json({ error: "Email content contains blocked spam terms" })
      return
    }

    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        resend.emails.send({
          from: "SCOOP ASAB <contact@scoopasab.com>",
          reply_to: "ndatresor68@gmail.com",
          to: recipient,
          subject: normalizedSubject,
          text: normalizedMessage,
          html: buildEmailHtml(normalizedSubject, normalizedMessage),
        }),
      ),
    )

    const successes = results.filter((result) => result.status === "fulfilled").map((result) => result.value)
    const failures = results.filter((result) => result.status === "rejected")

    if (successes.length === 0) {
      res.status(500).json({ error: "Email error" })
      return
    }

    await logEmailAction(
      adminClient,
      profile,
      `Email sent to ${successes.length}/${recipients.length} recipient(s) - ${normalizedSubject}`,
    )

    res.status(200).json({
      success: true,
      sent: successes.length,
      failed: failures.length,
      results: successes,
    })
  } catch (error) {
    console.error("[api/send-email] Error:", error)
    res.status(500).json({ error: "Email error" })
  }
}
