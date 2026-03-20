import { createClient } from "@supabase/supabase-js"
import { syncOpportunities } from "../../src/services/opportunitiesFetcher"

function createAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase environment variables not configured")
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function notifyUsers(adminClient, { title, message, type = "info" }) {
  const { data: users, error: usersError } = await adminClient
    .from("utilisateurs")
    .select("id")
    .eq("status", "active")

  if (usersError || !users?.length) return

  const payload = users.map((user) => ({
    title,
    message,
    type,
    user_id: user.id,
    read: false,
  }))

  await adminClient.from("notifications").insert(payload)
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ success: false, error: "Method not allowed" })
    return
  }

  try {
    const adminClient = createAdminClient()
    const result = await syncOpportunities({
      client: adminClient,
      createdBy: "system-cron",
      notify: (payload) => notifyUsers(adminClient, payload),
    })

    res.status(200).json({
      success: true,
      inserted: result.inserted,
      skipped: result.skipped,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Sync failed",
    })
  }
}
