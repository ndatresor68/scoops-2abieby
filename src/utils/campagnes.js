import { supabase } from "../supabaseClient"

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toDateOnly(value) {
  if (!value) return ""
  return String(value).slice(0, 10)
}

export function getCampagneDateRange(campagne) {
  return {
    startDate: toDateOnly(campagne?.date_debut),
    endDate: toDateOnly(campagne?.date_fin),
  }
}

export function isDateWithinCampagne(dateValue, campagne) {
  const currentDate = toDateOnly(dateValue)
  const { startDate, endDate } = getCampagneDateRange(campagne)

  if (!currentDate || !startDate || !endDate) {
    return false
  }

  return currentDate >= startDate && currentDate <= endDate
}

export function isAchatInCampagne(achat, campagne) {
  if (achat?.campagne_id && campagne?.id) {
    return String(achat.campagne_id) === String(campagne.id)
  }

  return isDateWithinCampagne(achat?.date_pesee || achat?.created_at, campagne)
}

export function calculateUsedKgFromAchats(achats = [], centreId, campagne) {
  if (!Array.isArray(achats) || !centreId || !campagne?.id) {
    return 0
  }

  return achats.reduce((sum, achat) => {
    if (String(achat?.centre_id) !== String(centreId)) {
      return sum
    }

    if (!isAchatInCampagne(achat, campagne)) {
      return sum
    }

    return sum + toNumber(achat?.poids)
  }, 0)
}

export function buildQuotaMetrics(campagne, quota, usedKg = 0) {
  const quotaKg = toNumber(quota?.quota_kg || toNumber(quota?.quota_tonnes) * 1000)
  const normalizedUsedKg = toNumber(usedKg)
  const remainingKg = Math.max(0, quotaKg - normalizedUsedKg)
  const usagePercentage = quotaKg > 0 ? Math.min(100, (normalizedUsedKg / quotaKg) * 100) : 0
  const prixKg = toNumber(campagne?.prix_kg)

  return {
    campagne: campagne || null,
    quota: quota || null,
    quotaKg,
    usedKg: normalizedUsedKg,
    remainingKg,
    usagePercentage,
    isQuotaReached: quotaKg > 0 && normalizedUsedKg >= quotaKg,
    prixKg,
    totalBudget: quotaKg * prixKg,
    usedBudget: normalizedUsedKg * prixKg,
    remainingBudget: remainingKg * prixKg,
  }
}

export function assertQuotaAvailable(metrics, poidsToAdd = 0) {
  const pendingKg = toNumber(poidsToAdd)

  if (!metrics?.campagne?.id) {
    throw new Error("Aucune campagne active n'est disponible pour cette pesée.")
  }

  if (!metrics?.quota?.id) {
    throw new Error("Aucun quota n'est configuré pour ce centre dans la campagne active.")
  }

  if (metrics.quotaKg <= 0) {
    throw new Error("Le quota de ce centre est invalide pour la campagne active.")
  }

  if (metrics.usedKg >= metrics.quotaKg) {
    throw new Error("Quota atteint. Livraison requise.")
  }

  if (pendingKg > metrics.remainingKg) {
    throw new Error(
      `Quota insuffisant pour cette pesée. Reste ${Math.max(0, metrics.remainingKg).toLocaleString("fr-FR")} kg disponibles.`
    )
  }
}

export async function getActiveCampagne() {
  const { data, error } = await supabase
    .from("campagnes")
    .select("*")
    .eq("statut", "ACTIVE")
    .order("date_debut", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

export async function getCentreQuota(centreId, campagneId) {
  if (!centreId || !campagneId) {
    return null
  }

  const { data, error } = await supabase
    .from("campagne_centres")
    .select("*")
    .eq("centre_id", centreId)
    .eq("campagne_id", campagneId)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}
