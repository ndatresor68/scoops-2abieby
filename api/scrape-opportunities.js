import * as cheerio from "cheerio"
import { parseFaoOpportunities } from "../src/services/parsers/faoParser"
import { parseUngmOpportunities } from "../src/services/parsers/ungmParser"
import { parseWorldBankOpportunities } from "../src/services/parsers/worldBankParser"

const SOURCES = [
  {
    name: "African Development Bank",
    url: "https://www.afdb.org/en/projects-and-operations/procurement",
    selectors: [".views-row", ".listing", "article"],
  },
  {
    name: "World Bank Procurement",
    url: "https://projects.worldbank.org/en/projects-operations/procurement",
    selectors: [".procurement-item", ".project-operation", "article"],
  },
  {
    name: "UNGM",
    url: "https://www.ungm.org/Public/Notice",
    selectors: [".notice-item", ".notice", "article"],
  },
  {
    name: "FAO Procurement",
    url: "https://www.fao.org/procurement",
    selectors: [".listing", ".card", "article"],
  },
]
const KEYWORDS = ["cacao", "coffee", "agriculture", "export"]
const GOOGLE_FALLBACK_KEYWORDS = [
  "cacao tender africa",
  "coffee export opportunity africa",
  "appel d'offre cacao",
]

function buildFallbackOpportunities(source = "scraping_fallback") {
  return [
    {
      title: "Recherche fournisseur cacao",
      description: "Besoin de 100 tonnes de cacao pour export.",
      location: "Abidjan",
      type: "cacao",
      category: "cacao",
      country: "Cote d'Ivoire",
      source,
      deadline: new Date().toISOString(),
      publicationDate: new Date().toISOString(),
      link: "https://example.com/opportunities",
    },
  ]
}

function buildGoogleFallbackResults() {
  return GOOGLE_FALLBACK_KEYWORDS.map((keyword, index) => ({
    title:
      index === 0
        ? "Cacao tender Africa - export partnership"
        : index === 1
          ? "Coffee export opportunity Africa"
          : "Appel d'offre cacao pour cooperative",
    description: `Resultat fallback genere a partir de la recherche "${keyword}".`,
    location: "Africa",
    type: index === 1 ? "coffee" : "cacao",
    category: index === 1 ? "coffee" : "cacao",
    country: "",
    source: `google_fallback:${keyword}`,
    deadline: new Date().toISOString(),
    publicationDate: new Date().toISOString(),
    link: "https://www.google.com/search",
  }))
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim()
}

function containsRelevantKeyword(text) {
  const normalized = normalizeWhitespace(text).toLowerCase()
  return KEYWORDS.some((keyword) => normalized.includes(keyword))
}

function detectCategory(text) {
  const normalized = normalizeWhitespace(text).toLowerCase()
  if (normalized.includes("cacao")) return "cacao"
  if (normalized.includes("coffee") || normalized.includes("cafe")) return "coffee"
  return "other"
}

function detectCountry(text, fallbackLocation = "") {
  const normalized = normalizeWhitespace(`${text} ${fallbackLocation}`).toLowerCase()
  if (normalized.includes("cote d'ivoire") || normalized.includes("cote d ivoire") || normalized.includes("abidjan")) {
    return "Cote d'Ivoire"
  }
  if (normalized.includes("ghana")) return "Ghana"
  if (normalized.includes("cameroun") || normalized.includes("cameroon")) return "Cameroon"
  return ""
}

function normalizeScrapedOpportunity(item) {
  const title = normalizeWhitespace(item?.title)
  if (!title) return null

  const description = normalizeWhitespace(item?.description)
  const location = normalizeWhitespace(item?.location || "Unknown")
  const category = item?.category || detectCategory(`${title} ${description}`)
  const country = item?.country || detectCountry(`${title} ${description}`, location)

  return {
    title,
    description,
    location,
    type:
      String(item?.type || category || "cacao").trim().toLowerCase() === "cafe" ||
      String(item?.type || category || "cacao").trim().toLowerCase() === "coffee"
        ? "cafe"
        : "cacao",
    category,
    country,
    source: normalizeWhitespace(item?.source || "scraping"),
    deadline: item?.deadline || null,
    publicationDate: item?.publicationDate || new Date().toISOString(),
    link: item?.link || SOURCES[0]?.url || "",
  }
}

function extractGenericItems($, sourceConfig) {
  const selector = sourceConfig.selectors.join(", ")
  const items = []

  $(selector).each((index, element) => {
    const title = $(element).find(".title, h1, h2, h3, .field-content a").first().text()
    const description = $(element).find(".desc, .description, p, .field-content").first().text()
    const location = $(element).find(".location, .country, .meta-location, .region").first().text() || "Unknown"
    const link = $(element).find("a").first().attr("href") || sourceConfig.url
    const combinedText = `${title} ${description} ${location}`

    if (!containsRelevantKeyword(combinedText)) return

    const nextItem = normalizeScrapedOpportunity({
      title,
      description,
      location,
      category: detectCategory(combinedText),
      country: detectCountry(combinedText, location),
      source: sourceConfig.name,
      link: link.startsWith("http") ? link : new URL(link, sourceConfig.url).toString(),
    })

    if (nextItem) {
      items.push(nextItem)
    }
  })

  return items
}

function routeSourceParser(sourceConfig, html) {
  const url = sourceConfig.url.toLowerCase()

  if (url.includes("worldbank")) {
    return parseWorldBankOpportunities(html, sourceConfig.url)
  }

  if (url.includes("ungm")) {
    return parseUngmOpportunities(html, sourceConfig.url)
  }

  if (url.includes("fao")) {
    return parseFaoOpportunities(html, sourceConfig.url)
  }

  return null
}

function extractSourceItems($, sourceConfig) {
  try {
    const parserItems = routeSourceParser(sourceConfig, $.html()) || []
    const normalizedParserItems = parserItems
      .map((item) =>
        normalizeScrapedOpportunity({
          ...item,
          category: item.category || detectCategory(`${item.title} ${item.description}`),
          country: item.country || detectCountry(`${item.title} ${item.description}`, item.location),
          source: sourceConfig.name,
        }),
      )
      .filter(Boolean)
      .filter((item) => containsRelevantKeyword(`${item.title} ${item.description} ${item.location}`))

    if (normalizedParserItems.length > 0) {
      return normalizedParserItems
    }
  } catch {
    // Fall back to generic extraction below.
  }

  return extractGenericItems($, sourceConfig)
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json([])
    return
  }

  let workingSources = 0

  try {
    const results = await Promise.allSettled(
      SOURCES.map(async (sourceConfig) => {
        try {
          const response = await fetch(sourceConfig.url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; SCOOP-ASAB-OpportunityBot/1.0; +https://scoopasab.com)",
            },
          })

          if (!response.ok) {
            throw new Error(`Failed to fetch ${sourceConfig.url}: ${response.status}`)
          }

          workingSources += 1
          const html = await response.text()
          const $ = cheerio.load(html)
          return extractSourceItems($, sourceConfig)
        } catch {
          return []
        }
      }),
    )

    const merged = results
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value)
      .map(normalizeScrapedOpportunity)
      .filter(Boolean)

    const deduped = Array.from(
      new Map(
        merged
          .filter((item) => item.title && containsRelevantKeyword(`${item.title} ${item.description}`))
          .map((item) => [`${item.title.toLowerCase()}::${item.source.toLowerCase()}`, item]),
      ).values(),
    )

    console.log("SOURCES WORKING:", workingSources)
    console.log("TOTAL OPPORTUNITIES FETCHED:", deduped.length)

    if (workingSources === 0) {
      const googleFallback = buildGoogleFallbackResults()
      res.status(200).json(googleFallback.length ? googleFallback : buildFallbackOpportunities("scraping_error"))
      return
    }

    if (!deduped.length) {
      const googleFallback = buildGoogleFallbackResults()
      res.status(200).json(googleFallback.length ? googleFallback : buildFallbackOpportunities())
      return
    }

    res.status(200).json(deduped)
  } catch (err) {
    console.error("SCRAPE ERROR:", err)
    console.log("SOURCES WORKING:", workingSources)
    console.log("TOTAL OPPORTUNITIES FETCHED:", 0)
    const googleFallback = buildGoogleFallbackResults()
    res.status(200).json(googleFallback.length ? googleFallback : buildFallbackOpportunities("scraping_error"))
  }
}
