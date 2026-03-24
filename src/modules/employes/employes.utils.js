export const EMPLOYE_STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "ACTIF", label: "Actif" },
  { value: "INACTIF", label: "Inactif" },
  { value: "SUSPENDU", label: "Suspendu" },
]

export const EMPLOYE_FORM_STATUS_OPTIONS = EMPLOYE_STATUS_OPTIONS.filter((option) => option.value)

export const PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "Tous les paiements" },
  { value: "PAYE", label: "Payé" },
  { value: "NON_PAYE", label: "Non payé" },
  { value: "AVANCE", label: "Avance" },
]

export const PAYMENT_FORM_STATUS_OPTIONS = PAYMENT_STATUS_OPTIONS.filter((option) => option.value)

export function normalizeEmployeStatus(value) {
  return String(value || "ACTIF").trim().toUpperCase()
}

export function normalizePaymentStatus(value) {
  if (value === null || value === undefined || value === "") {
    return ""
  }
  return String(value).trim().toUpperCase()
}

export function formatEmployeCurrency(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`
}

export function formatEmployeDate(value) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("fr-FR")
}

export function getEmployeStatusLabel(value) {
  const normalized = normalizeEmployeStatus(value)
  return EMPLOYE_FORM_STATUS_OPTIONS.find((option) => option.value === normalized)?.label || normalized
}

export function getPaymentStatusLabel(value) {
  const normalized = normalizePaymentStatus(value)
  if (!normalized) return "Indisponible"
  return PAYMENT_FORM_STATUS_OPTIONS.find((option) => option.value === normalized)?.label || normalized
}

export function getEmployeStatusStyles(statut) {
  const normalized = normalizeEmployeStatus(statut)

  if (normalized === "ACTIF") {
    return {
      color: "#166534",
      background: "rgba(34, 197, 94, 0.14)",
      border: "1px solid rgba(34, 197, 94, 0.22)",
    }
  }

  if (normalized === "SUSPENDU") {
    return {
      color: "#b91c1c",
      background: "rgba(239, 68, 68, 0.14)",
      border: "1px solid rgba(239, 68, 68, 0.2)",
    }
  }

  return {
    color: "#92400e",
    background: "rgba(245, 158, 11, 0.14)",
    border: "1px solid rgba(245, 158, 11, 0.22)",
  }
}

export function getPaymentStatusStyles(status) {
  const normalized = normalizePaymentStatus(status)

  if (!normalized || normalized === "INDISPONIBLE") {
    return {
      color: "#475569",
      background: "rgba(148, 163, 184, 0.14)",
      border: "1px solid rgba(148, 163, 184, 0.22)",
    }
  }

  if (normalized === "PAYE") {
    return {
      color: "#166534",
      background: "rgba(34, 197, 94, 0.14)",
      border: "1px solid rgba(34, 197, 94, 0.22)",
    }
  }

  if (normalized === "AVANCE") {
    return {
      color: "#1d4ed8",
      background: "rgba(59, 130, 246, 0.14)",
      border: "1px solid rgba(59, 130, 246, 0.22)",
    }
  }

  return {
    color: "#b91c1c",
    background: "rgba(239, 68, 68, 0.14)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
  }
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export function getEmployePosteOptions(employes = []) {
  return Array.from(
    new Set(
      employes
        .map((entry) => String(entry?.poste || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "fr"))
}

export function filterEmployes(
  employes = [],
  {
    query = "",
    centreId = "",
    poste = "",
    statut = "",
    statutPaiement = "",
  } = {}
) {
  const normalizedQuery = normalizeText(query)
  const normalizedPoste = normalizeText(poste)
  const normalizedStatut = String(statut || "").trim().toUpperCase()
  const normalizedStatutPaiement = String(statutPaiement || "").trim().toUpperCase()

  return employes.filter((entry) => {
    const matchesSearch =
      !normalizedQuery ||
      normalizeText(entry.nom_prenom).includes(normalizedQuery) ||
      normalizeText(entry.telephone).includes(normalizedQuery)

    const matchesCentre = !centreId || String(entry.centre_id || "") === String(centreId)
    const matchesPoste = !normalizedPoste || normalizeText(entry.poste) === normalizedPoste
    const matchesStatut = !normalizedStatut || normalizeEmployeStatus(entry.statut) === normalizedStatut
    const matchesStatutPaiement =
      !normalizedStatutPaiement || normalizePaymentStatus(entry.statut_paiement) === normalizedStatutPaiement

    return matchesSearch && matchesCentre && matchesPoste && matchesStatut && matchesStatutPaiement
  })
}

export function buildEmployesPerCentre(employes = [], centres = []) {
  const centreMap = Object.fromEntries(
    centres.map((centre) => [String(centre.id), centre.nom || `Centre ${centre.id}`])
  )

  const counts = employes.reduce((accumulator, entry) => {
    const key = String(entry.centre_id || "unassigned")
    const current = accumulator[key] || {
      centre: key === "unassigned" ? "Non assigné" : centreMap[key] || "Centre inconnu",
      count: 0,
      totalSalary: 0,
    }

    current.count += 1
    current.totalSalary += Number(entry.salaire || 0)
    accumulator[key] = current
    return accumulator
  }, {})

  return Object.values(counts).sort((a, b) => b.count - a.count)
}

export function buildEmployeAlerts(employes = []) {
  const unpaid = employes.filter((entry) => normalizePaymentStatus(entry.statut_paiement) === "NON_PAYE").length
  const advances = employes.filter((entry) => normalizePaymentStatus(entry.statut_paiement) === "AVANCE").length
  const suspended = employes.filter((entry) => normalizeEmployeStatus(entry.statut) === "SUSPENDU").length

  return [
    unpaid > 0
      ? {
          id: "non-paye",
          tone: "danger",
          title: `${unpaid} employé${unpaid > 1 ? "s" : ""} non payé${unpaid > 1 ? "s" : ""}`,
          description: "Des salaires restent à régulariser.",
        }
      : null,
    advances > 0
      ? {
          id: "avance",
          tone: "info",
          title: `${advances} employé${advances > 1 ? "s" : ""} en avance`,
          description: "Des paiements partiels ou anticipés sont enregistrés.",
        }
      : null,
    suspended > 0
      ? {
          id: "suspendu",
          tone: "warning",
          title: `${suspended} employé${suspended > 1 ? "s" : ""} suspendu${suspended > 1 ? "s" : ""}`,
          description: "Vérifiez la situation RH et les accès associés.",
        }
      : null,
  ].filter(Boolean)
}

export function buildEmployeExportRows(employes = [], centresMap = {}) {
  return employes.map((entry) => ({
    nom_prenom: entry.nom_prenom || "",
    poste: entry.poste || "-",
    telephone: entry.telephone || "-",
    centre: centresMap[String(entry.centre_id)] || "Non assigné",
    salaire: Number(entry.salaire || 0),
    statut: getEmployeStatusLabel(entry.statut),
    statut_paiement: getPaymentStatusLabel(entry.statut_paiement),
    date_embauche: formatEmployeDate(entry.date_embauche),
  }))
}
