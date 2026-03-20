function normalizeLocation(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export function scoreOpportunity(opportunity) {
  let score = 0

  if (opportunity?.secteur === "cacao" || opportunity?.type === "cacao") {
    score += 30
  }

  const location = normalizeLocation(opportunity?.localisation || opportunity?.location)
  if (location.includes("cote d'ivoire") || location.includes("cote d ivoire")) {
    score += 20
  }

  if (opportunity?.date_limite || opportunity?.deadline) {
    score += 20
  }

  const description = String(opportunity?.description || "")
  if (description.trim().length > 20) {
    score += 30
  }

  let recommendation = "LOW"
  if (score >= 70) {
    recommendation = "HIGH"
  } else if (score >= 40) {
    recommendation = "MEDIUM"
  }

  return {
    score,
    recommendation,
  }
}
