import { createClient } from "@supabase/supabase-js"

function getEnv(name, fallback = null) {
  return process.env[name] || fallback
}

function getSupabaseClients() {
  const supabaseUrl = getEnv("SUPABASE_URL", getEnv("VITE_SUPABASE_URL"))
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY", getEnv("SUPABASE_SERVICE_KEY"))
  const anonKey = getEnv("SUPABASE_ANON_KEY", getEnv("VITE_SUPABASE_ANON_KEY"))

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

function buildProducerCode(name) {
  const prefix = String(name || "PRD")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4) || "PRD"
  return `${prefix}-${Date.now().toString().slice(-6)}`
}

async function logAdminAction(adminClient, user, type, target, details) {
  try {
    await Promise.allSettled([
      adminClient.from("activites").insert([
        {
          user_id: user.id,
          user_email: user.email || null,
          action: `ai_${type}`,
          target: "system",
          details: `${details} (${target})`,
        },
      ]),
      adminClient.from("activity_logs").insert([
        {
          user_id: user.id,
          user_name: user.email || "Admin",
          action: `ai_${type}`,
          details: `${details} (${target})`,
          page: "/admin/activity",
        },
      ]),
    ])
  } catch (error) {
    console.error("[api/admin-action] Failed to log action:", error)
  }
}

async function resolveUser(adminClient, target) {
  const normalizedTarget = String(target || "").trim()
  if (!normalizedTarget) return null

  const { data: byId } = await adminClient
    .from("utilisateurs")
    .select("id, nom, email, role, status")
    .eq("id", normalizedTarget)
    .maybeSingle()

  if (byId) return byId

  const { data: byName } = await adminClient
    .from("utilisateurs")
    .select("id, nom, email, role, status")
    .or(`nom.ilike.%${normalizedTarget}%,email.ilike.%${normalizedTarget}%`)
    .limit(1)

  return byName?.[0] || null
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

    const actor = authData.user
    const { data: adminProfile, error: profileError } = await adminClient
      .from("utilisateurs")
      .select("id, nom, email, role, centre_id")
      .eq("id", actor.id)
      .maybeSingle()

    if (profileError || !adminProfile || adminProfile.role !== "ADMIN") {
      res.status(403).json({ reply: "Admin access required" })
      return
    }

    const { type, target } = req.body || {}

    if (!type || !target) {
      res.status(400).json({ reply: "Missing action payload" })
      return
    }

    if (type === "list_users") {
      const { data: users, error } = await adminClient
        .from("utilisateurs")
        .select("nom, email, role, status")
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) {
        res.status(500).json({ reply: "Unable to list users" })
        return
      }

      await logAdminAction(adminClient, actor, type, target, "AI listed users")
      const list = (users || [])
        .map((user) => `${user.nom || "Sans nom"} - ${user.email || "-"} - ${user.role || "-"} - ${user.status || "active"}`)
        .join("\n")

      res.status(200).json({
        reply: list || "No users found",
      })
      return
    }

    if (type === "create_producer") {
      const payload = {
        nom: String(target).trim(),
        code: buildProducerCode(target),
        telephone: null,
        sexe: null,
        localite: null,
        statut: "ACTIF",
        centre_id: adminProfile.centre_id || null,
      }

      const { data, error } = await adminClient.from("producteurs").insert([payload]).select("id, nom, code").single()

      if (error) {
        res.status(500).json({ reply: error.message || "Unable to create producer" })
        return
      }

      await logAdminAction(adminClient, actor, type, target, "AI created producer")
      res.status(200).json({
        reply: `Producteur créé: ${data?.nom || target} (${data?.code || "code généré"})`,
      })
      return
    }

    if (type === "delete_user" || type === "ban_user") {
      const targetUser = await resolveUser(adminClient, target)

      if (!targetUser) {
        res.status(404).json({ reply: "User not found" })
        return
      }

      if (targetUser.id === actor.id) {
        res.status(400).json({ reply: "You cannot execute this action on yourself" })
        return
      }

      if (type === "delete_user") {
        const { error } = await adminClient.from("utilisateurs").delete().eq("id", targetUser.id)

        if (error) {
          res.status(500).json({ reply: error.message || "Unable to delete user" })
          return
        }

        await logAdminAction(adminClient, actor, type, target, "AI deleted user")
        res.status(200).json({
          reply: `Utilisateur supprimé: ${targetUser.nom || targetUser.email || targetUser.id}`,
        })
        return
      }

      const { error } = await adminClient
        .from("utilisateurs")
        .update({ status: "banned" })
        .eq("id", targetUser.id)

      if (error) {
        res.status(500).json({ reply: error.message || "Unable to ban user" })
        return
      }

      await logAdminAction(adminClient, actor, type, target, "AI banned user")
      res.status(200).json({
        reply: `Utilisateur banni: ${targetUser.nom || targetUser.email || targetUser.id}`,
      })
      return
    }

    res.status(400).json({ reply: "Unsupported action type" })
  } catch (error) {
    console.error("[api/admin-action] Error:", error)
    res.status(500).json({ reply: "Admin action failed" })
  }
}
