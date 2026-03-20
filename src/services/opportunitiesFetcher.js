import { analyzeOpportunity } from "./opportunityAI"

function getScraperUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/api/scrape-opportunities`
  }

  const appUrl = process.env.APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (appUrl) {
    const normalized = appUrl.startsWith("http") ? appUrl : `https://${appUrl}`
    return `${normalized.replace(/\/$/, "")}/api/scrape-opportunities`
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/scrape-opportunities`
  }

  return "/api/scrape-opportunities"
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase()
}

function createOpportunityKey(title, source) {
  return `${normalizeText(title)}::${normalizeText(source)}`
}

function getFallbackOpportunities(source = "fallback") {
  return [
    {
      title: "Recherche fournisseur cacao",
      description: "Besoin de 100 tonnes de cacao",
      location: "Abidjan",
      type: "cacao",
      source,
      deadline: new Date(),
    },
  ]
}

function normalizeFetchedOpportunity(item) {
  const title = String(item?.title || item?.titre || "").trim()
  const description = String(item?.description || item?.details || "").trim()
  const location = String(item?.location || item?.localisation || "").trim()
  const source = String(item?.source || "external").trim()
  const rawType = String(item?.type || item?.category || item?.secteur || "cacao").trim().toLowerCase()
  const deadline = item?.deadline || item?.date_limite || null
  const publicationDate = item?.publicationDate || item?.date_publication || new Date()
  const link = String(item?.link || item?.lien || "").trim()

  if (!title) return null

  return {
    title,
    description,
    location,
    type: rawType === "cafe" || rawType === "coffee" ? "cafe" : "cacao",
    source,
    deadline,
    publicationDate,
    link: link || null,
  }
}

function mapExternalOpportunity(item) {
  const publicationDate = item.publicationDate || new Date()
  const deadline = item.deadline || null
  const baseOpportunity = {
    titre: String(item.title || "").trim(),
    description: String(item.description || "").trim(),
    source: String(item.source || "manual").trim(),
    localisation: String(item.location || "").trim(),
    secteur: item.type === "cafe" ? "cafe" : "cacao",
    date_publication: new Date(publicationDate).toISOString().slice(0, 10),
    date_limite: deadline ? new Date(deadline).toISOString().slice(0, 10) : null,
    lien: item.link || null,
  }
  const analysis = analyzeOpportunity(baseOpportunity)

  return {
    ...baseOpportunity,
    score: analysis.score,
    recommendation: analysis.recommendation,
    risk: analysis.risk,
  }
}

export async function fetchOpportunities() {
  try {
    const response = await fetch(getScraperUrl())
    const data = await response.json().catch(() => [])

    const normalizedData = (Array.isArray(data) ? data : [])
      .map(normalizeFetchedOpportunity)
      .filter(Boolean)

    if (!response.ok || normalizedData.length === 0) {
      const fallbackData = getFallbackOpportunities("fallback")
      console.log("OPPORTUNITIES FETCHED:", fallbackData.length)
      return fallbackData
    }

    console.log("OPPORTUNITIES FETCHED:", normalizedData.length)
    return normalizedData
  } catch (err) {
    console.error("FETCH ERROR:", err)
    const fallbackData = [
      {
        title: "Opportunite cacao locale",
        description: "Exportateur recherche cooperative",
        location: "Cote d'Ivoire",
        type: "cacao",
        source: "error_fallback",
      },
    ]

    console.log("OPPORTUNITIES FETCHED:", fallbackData.length)
    return fallbackData
  }
}

export async function syncOpportunities({
  client,
  createdBy = null,
  notify = null,
} = {}) {
  if (!client) {
    throw new Error("A Supabase client is required to sync opportunities")
  }

  const externalOpportunities = await fetchOpportunities()
  const uniqueFetchedOpportunities = Array.from(
    new Map(
      externalOpportunities
        .map(normalizeFetchedOpportunity)
        .filter(Boolean)
        .map((item) => [createOpportunityKey(item.title, item.source), item]),
    ).values(),
  )

  const normalizedOpportunities = uniqueFetchedOpportunities
    .map(mapExternalOpportunity)
    .filter((item) => item.titre && item.source)

  const { data: existingRows, error: existingError } = await client
    .from("appels_offres")
    .select("titre, source")

  if (existingError) throw existingError

  const existingKeys = new Set(
    (existingRows || []).map((item) => createOpportunityKey(item.titre, item.source)),
  )

  const rowsToInsert = normalizedOpportunities.filter(
    (item) => !existingKeys.has(createOpportunityKey(item.titre, item.source)),
  )

  if (rowsToInsert.length === 0) {
    return { inserted: 0, skipped: normalizedOpportunities.length, items: [] }
  }

  const { data, error } = await client.from("appels_offres").insert(rowsToInsert).select("*")
  if (error) throw error

  if (createdBy && data?.length && typeof notify === "function") {
    await notify({
      title: "Nouvelles opportunites synchronisees",
      message: `${data.length} appel(s) d'offres ont ete ajoutes automatiquement.`,
      type: "info",
      createdBy,
    })
  }

  return {
    inserted: data?.length || 0,
    skipped: normalizedOpportunities.length - (data?.length || 0),
    items: data || [],
  }
}
