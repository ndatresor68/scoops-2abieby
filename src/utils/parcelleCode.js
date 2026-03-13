import { supabase } from "../supabaseClient"

/**
 * Génère un code parcelle unique au format PARC-{centre_code}-{timestamp}
 * Exemple: PARC-ABJ-1712345678
 * 
 * @param {String} centreCode - Code du centre (ex: "ABJ")
 * @returns {String} Code parcelle généré
 */
export async function generateParcelleCode(centreCode = null) {
  try {
    // Si pas de code centre, utiliser un code par défaut
    const code = centreCode || "UNK"
    const timestamp = Date.now()
    
    return `PARC-${code.toUpperCase()}-${timestamp}`
  } catch (error) {
    console.error("[generateParcelleCode] Exception:", error)
    // En cas d'erreur, générer un code avec timestamp
    const code = centreCode || "UNK"
    return `PARC-${code.toUpperCase()}-${Date.now()}`
  }
}
