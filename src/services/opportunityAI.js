function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function hasTrustedSource(source) {
  const normalized = normalizeText(source)
  return ["worldbank", "un", "ungm", "afdb"].some((keyword) => normalized.includes(keyword))
}

export function analyzeOpportunity(opportunity) {
  let score = 0

  const type = normalizeText(opportunity?.secteur || opportunity?.type)
  const location = normalizeText(opportunity?.localisation || opportunity?.location)
  const description = String(opportunity?.description || "").trim()
  const source = String(opportunity?.source || "").trim()
  const deadline = opportunity?.date_limite || opportunity?.deadline

  if (type === "cacao") {
    score += 30
  }

  if (location.includes("cote d'ivoire") || location.includes("cote d ivoire")) {
    score += 20
  }

  if (description.length > 30) {
    score += 15
  }

  if (deadline) {
    score += 15
  }

  if (hasTrustedSource(source)) {
    score += 20
  }

  score = Math.min(score, 100)

  let recommendation = "IGNORE"
  if (score >= 70) {
    recommendation = "BUY"
  } else if (score >= 40) {
    recommendation = "INTERESTING"
  }

  let risk = "LOW"
  if (description.length <= 30 || !source) {
    risk = "HIGH"
  } else if (!location || location === "unknown") {
    risk = "MEDIUM"
  }

  return {
    score,
    recommendation,
    risk,
  }
}
