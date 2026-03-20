import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

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

function buildEmailHtml(message) {
  const safeMessage = String(message || "").replace(/\n/g, "<br />")

  return `
    <div style="margin:0;padding:32px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 24px 50px rgba(15,23,42,0.08);">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#991b1b 0%,#dc2626 100%);color:#ffffff;">
          <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;opacity:.82;font-weight:700;">Cooperative Communication</div>
          <h2 style="margin:10px 0 0;font-size:28px;line-height:1.1;">SCOOP ASAB</h2>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.6;opacity:.9;">Message officiel envoye depuis le systeme de gestion cooperative.</p>
        </div>
        <div style="padding:32px;">
          <div style="font-size:15px;line-height:1.8;color:#334155;">${safeMessage}</div>
        </div>
        <div style="padding:18px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:12px;color:#64748b;">
          Powered by SCOOP ASAB System
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
    const recipients = Array.isArray(to) ? to.filter(Boolean) : typeof to === "string" ? [to] : []

    if (!recipients.length || !subject || !message) {
      res.status(400).json({ error: "Missing recipients, subject or message" })
      return
    }

    const response = await resend.emails.send({
      from: "SCOOP ASAB <onboarding@resend.dev>",
      to: recipients,
      subject: String(subject).trim(),
      html: buildEmailHtml(message),
    })

    await logEmailAction(
      adminClient,
      profile,
      `Email sent to ${recipients.length} recipient(s) - ${String(subject).trim()}`,
    )

    res.status(200).json(response)
  } catch (error) {
    console.error("[api/send-email] Error:", error)
    res.status(500).json({ error: "Email error" })
  }
}
