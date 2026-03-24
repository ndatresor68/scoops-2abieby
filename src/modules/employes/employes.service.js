import { supabase } from "../../supabaseClient"

const SESSION_CACHE_TTL_MS = 15_000

let sessionValidationCache = {
  value: null,
  expiresAt: 0,
  promise: null,
}

let employesListPromise = null
let centresListPromise = null

const EMPLOYES_SELECT_WITH_PAYMENT =
  "id, nom_prenom, telephone, poste, centre_id, salaire, statut, statut_paiement, date_embauche, created_at"
const EMPLOYES_SELECT_BASE =
  "id, nom_prenom, telephone, poste, centre_id, salaire, statut, date_embauche, created_at"

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase()
}

function normalizeEmploye(row) {
  const hasPaymentStatus = Object.prototype.hasOwnProperty.call(row || {}, "statut_paiement")

  return {
    ...row,
    salaire: Number(row?.salaire || 0),
    centre_id: row?.centre_id ? String(row.centre_id) : "",
    statut: String(row?.statut || "ACTIF").trim().toUpperCase(),
    statut_paiement: hasPaymentStatus
      ? String(row?.statut_paiement || "NON_PAYE").trim().toUpperCase()
      : "INDISPONIBLE",
  }
}

function clearSessionValidationCache() {
  sessionValidationCache = {
    value: null,
    expiresAt: 0,
    promise: null,
  }
}

function shouldRetryWithoutPaymentStatus(error) {
  return error?.message?.includes("statut_paiement")
}

function invalidateEmployesQueries() {
  employesListPromise = null
}

export async function assertAdminSession({ force = false } = {}) {
  const now = Date.now()

  if (!force && sessionValidationCache.value && sessionValidationCache.expiresAt > now) {
    return sessionValidationCache.value
  }

  if (!force && sessionValidationCache.promise) {
    return sessionValidationCache.promise
  }

  sessionValidationCache.promise = (async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.id) {
      clearSessionValidationCache()
      throw new Error("Session invalide. Veuillez vous reconnecter.")
    }

    const { data: profile, error: profileError } = await supabase
      .from("utilisateurs")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      clearSessionValidationCache()
      throw new Error(profileError.message || "Impossible de valider la session administrateur.")
    }

    if (normalizeRole(profile?.role) !== "ADMIN") {
      clearSessionValidationCache()
      throw new Error("Accès réservé aux administrateurs.")
    }

    const validatedSession = { user, profile }
    sessionValidationCache.value = validatedSession
    sessionValidationCache.expiresAt = Date.now() + SESSION_CACHE_TTL_MS
    return validatedSession
  })()

  try {
    return await sessionValidationCache.promise
  } catch (error) {
    clearSessionValidationCache()
    throw error
  } finally {
    sessionValidationCache.promise = null
  }
}

export async function listEmployes({ force = false } = {}) {
  await assertAdminSession({ force })

  if (!force && employesListPromise) {
    return employesListPromise
  }

  employesListPromise = (async () => {
    let { data, error } = await supabase
      .from("employes")
      .select(EMPLOYES_SELECT_WITH_PAYMENT)
      .order("nom_prenom", { ascending: true })

    if (error && shouldRetryWithoutPaymentStatus(error)) {
      const fallbackResponse = await supabase
        .from("employes")
        .select(EMPLOYES_SELECT_BASE)
        .order("nom_prenom", { ascending: true })

      data = fallbackResponse.data
      error = fallbackResponse.error
    }

    if (error) {
      throw new Error(error.message || "Impossible de charger le personnel.")
    }

    return (data || []).map(normalizeEmploye)
  })()

  try {
    return await employesListPromise
  } finally {
    employesListPromise = null
  }
}

export async function listEmployeCentres({ force = false } = {}) {
  await assertAdminSession({ force })

  if (!force && centresListPromise) {
    return centresListPromise
  }

  centresListPromise = (async () => {
    const { data, error } = await supabase.from("centres").select("id, nom").order("nom")

    if (error) {
      throw new Error(error.message || "Impossible de charger les centres.")
    }

    return data || []
  })()

  try {
    return await centresListPromise
  } finally {
    centresListPromise = null
  }
}

export async function listEmployesPageData({ force = false } = {}) {
  const [employes, centres] = await Promise.all([
    listEmployes({ force }),
    listEmployeCentres({ force }),
  ])

  return { employes, centres }
}

function sanitizePayload(payload) {
  return {
    nom_prenom: String(payload?.nom_prenom || "").trim(),
    telephone: String(payload?.telephone || "").trim() || null,
    poste: String(payload?.poste || "").trim() || null,
    centre_id: payload?.centre_id ? String(payload.centre_id) : null,
    salaire: Number(payload?.salaire || 0),
    statut: String(payload?.statut || "ACTIF").trim().toUpperCase() || "ACTIF",
    statut_paiement: String(payload?.statut_paiement || "NON_PAYE").trim().toUpperCase() || "NON_PAYE",
  }
}

export async function createEmploye(payload) {
  await assertAdminSession()

  const sanitizedPayload = sanitizePayload(payload)
  let { data, error } = await supabase
    .from("employes")
    .insert([sanitizedPayload])
    .select(EMPLOYES_SELECT_WITH_PAYMENT)
    .single()

  if (error && shouldRetryWithoutPaymentStatus(error)) {
    const { statut_paiement, ...fallbackPayload } = sanitizedPayload
    const fallbackResponse = await supabase
      .from("employes")
      .insert([fallbackPayload])
      .select(EMPLOYES_SELECT_BASE)
      .single()

    data = fallbackResponse.data
    error = fallbackResponse.error
  }

  if (error) {
    throw new Error(error.message || "Impossible de créer l'employé.")
  }

  invalidateEmployesQueries()
  return normalizeEmploye(data)
}

export async function updateEmploye(employeId, payload) {
  await assertAdminSession()

  const sanitizedPayload = sanitizePayload(payload)
  let { data, error } = await supabase
    .from("employes")
    .update(sanitizedPayload)
    .eq("id", employeId)
    .select(EMPLOYES_SELECT_WITH_PAYMENT)
    .single()

  if (error && shouldRetryWithoutPaymentStatus(error)) {
    const { statut_paiement, ...fallbackPayload } = sanitizedPayload
    const fallbackResponse = await supabase
      .from("employes")
      .update(fallbackPayload)
      .eq("id", employeId)
      .select(EMPLOYES_SELECT_BASE)
      .single()

    data = fallbackResponse.data
    error = fallbackResponse.error
  }

  if (error) {
    throw new Error(error.message || "Impossible de mettre à jour l'employé.")
  }

  invalidateEmployesQueries()
  return normalizeEmploye(data)
}

export async function deleteEmploye(employeId) {
  await assertAdminSession()

  const { error } = await supabase.from("employes").delete().eq("id", employeId)

  if (error) {
    throw new Error(error.message || "Impossible de supprimer l'employé.")
  }

  invalidateEmployesQueries()
}

export async function getEmployeDashboardStats({ force = false } = {}) {
  const employes = await listEmployes({ force })

  return {
    totalEmployes: employes.length,
    activeEmployes: employes.filter((entry) => normalizeRole(entry.statut) === "ACTIF").length,
    inactiveEmployes: employes.filter((entry) => normalizeRole(entry.statut) !== "ACTIF").length,
    totalSalaires: employes.reduce((total, entry) => total + (Number(entry.salaire) || 0), 0),
    unpaidEmployes: employes.filter((entry) => normalizeRole(entry.statut_paiement) === "NON_PAYE").length,
    advancedEmployes: employes.filter((entry) => normalizeRole(entry.statut_paiement) === "AVANCE").length,
  }
}
