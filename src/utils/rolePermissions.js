/**
 * Role-Based Permissions and Data Filtering Utilities
 * 
 * Defines permissions and provides utilities for filtering data based on user roles:
 * - ADMIN: Full access to all data
 * - AGENT: Field work, producer management, no weighing access
 * - CENTRE: Weighing operations, centre-specific data only
 */

import { supabase } from "../supabaseClient"

/**
 * Get user role and centre_id from AuthContext
 * This should be called from components that have access to useAuth()
 */
export function getUserRoleInfo(user) {
  if (!user) {
    return { role: null, centreId: null, isAdmin: false, isAgent: false, isCentre: false }
  }

  const role = user.role || null
  const centreId = user.centre_id || null

  return {
    role,
    centreId,
    isAdmin: role === "ADMIN",
    isAgent: role === "AGENT",
    isCentre: role === "CENTRE",
  }
}

/**
 * Build filtered query for producteurs based on role
 * @param {Object} user - User object with role and centre_id
 * @returns {Object} Supabase query builder
 */
export function getProducteursQuery(user) {
  const { isAdmin, isCentre, isAgent, centreId } = getUserRoleInfo(user)

  let query = supabase.from("producteurs").select("*")

  // CENTRE users: Only see producteurs from their centre
  if (isCentre && centreId) {
    query = query.eq("centre_id", centreId)
  }

  // AGENT users: Only see producteurs from their centre
  if (isAgent && centreId) {
    query = query.eq("centre_id", centreId)
  }

  // ADMIN: See all producteurs (no filter)
  // Default ordering
  return query.order("nom", { ascending: true }).order("code", { ascending: true })
}

/**
 * Build filtered query for achats based on role
 * @param {Object} user - User object with role and centre_id
 * @returns {Object|null} Supabase query builder or null if no access
 */
export function getAchatsQuery(user) {
  const { isAdmin, isCentre, isAgent, centreId } = getUserRoleInfo(user)

  // AGENT: No access to achats (weighing is CENTRE only)
  if (isAgent) {
    return null
  }

  let query = supabase.from("achats").select("*")

  // CENTRE users: Only see achats from their centre
  if (isCentre && centreId) {
    query = query.eq("centre_id", centreId)
  }

  // ADMIN: See all achats (no filter)
  // Default ordering
  return query.order("date_pesee", { ascending: false })
}

/**
 * Build filtered query for parcelles based on role
 * @param {Object} user - User object with role and centre_id
 * @returns {Object|null} Supabase query builder or null if no access
 */
export function getParcellesQuery(user) {
  const { isAdmin, isCentre, isAgent, centreId } = getUserRoleInfo(user)

  let query = supabase.from("parcelles").select("*")

  // CENTRE users: Only see parcelles from their centre
  if (isCentre && centreId) {
    query = query.eq("centre_id", centreId)
  }

  // AGENT users: Only see parcelles from their centre
  if (isAgent && centreId) {
    query = query.eq("centre_id", centreId)
  }

  // ADMIN: See all parcelles (no filter)
  return query.order("created_at", { ascending: false })
}

/**
 * Build filtered query for livraisons based on role
 * @param {Object} user - User object with role and centre_id
 * @returns {Object|null} Supabase query builder or null if no access
 */
export function getLivraisonsQuery(user) {
  const { isAdmin, isCentre, isAgent, centreId } = getUserRoleInfo(user)

  // AGENT: No access to livraisons
  if (isAgent) {
    return null
  }

  let query = supabase.from("livraisons").select("*")

  // CENTRE users: Only see livraisons from their centre
  if (isCentre && centreId) {
    query = query.eq("centre_id", centreId)
  }

  // ADMIN: See all livraisons (no filter)
  return query.order("date_livraison", { ascending: false })
}

/**
 * Build filtered query for centres based on role
 * @param {Object} user - User object with role and centre_id
 * @returns {Object} Supabase query builder
 */
export function getCentresQuery(user) {
  // All roles can read centres
  return supabase.from("centres").select("*").order("nom", { ascending: true })
}

/**
 * Check if user can perform an action
 * @param {Object} user - User object with role and centre_id
 * @param {string} action - Action to check (e.g., 'manage_users', 'weigh_cocoa', 'manage_producers')
 * @param {Object} resource - Optional resource to check (e.g., { centre_id: '...' })
 * @returns {boolean}
 */
export function canPerformAction(user, action, resource = null) {
  const { isAdmin, isAgent, isCentre, centreId } = getUserRoleInfo(user)

  // ADMIN: Full access to everything
  if (isAdmin) {
    return true
  }

  // Action-specific checks
  switch (action) {
    case "manage_users":
    case "manage_centres":
    case "view_all_data":
      return isAdmin

    case "manage_producers":
      // AGENT and CENTRE can manage producers
      return isAgent || isCentre

    case "weigh_cocoa":
    case "create_achat":
      // Only CENTRE can perform weighing
      return isCentre

    case "view_achats":
      // ADMIN and CENTRE can view achats
      return isAdmin || isCentre

    case "manage_parcelles":
      // AGENT and CENTRE can manage parcelles
      return isAgent || isCentre

    case "manage_livraisons":
      // Only CENTRE can manage livraisons
      return isCentre

    case "view_livraisons":
      // ADMIN and CENTRE can view livraisons
      return isAdmin || isCentre

    case "manage_centre_data":
      // CENTRE can only manage data from their centre
      if (isCentre && resource?.centre_id) {
        return resource.centre_id === centreId
      }
      return false

    default:
      return false
  }
}

/**
 * Filter data array based on user role
 * @param {Array} data - Data array to filter
 * @param {Object} user - User object with role and centre_id
 * @param {string} dataType - Type of data ('producteurs', 'achats', 'centres', 'parcelles', 'livraisons')
 * @returns {Array} Filtered data array
 */
export function filterDataByRole(data, user, dataType) {
  if (!data || !Array.isArray(data)) {
    return []
  }

  const { isAdmin, isCentre, isAgent, centreId } = getUserRoleInfo(user)

  // ADMIN: No filtering needed
  if (isAdmin) {
    return data
  }

  // Filter based on data type
  switch (dataType) {
    case "producteurs":
      if (isCentre && centreId) {
        return data.filter((item) => String(item.centre_id) === String(centreId))
      }
      if (isAgent && centreId) {
        return data.filter((item) => String(item.centre_id) === String(centreId))
      }
      return data

    case "achats":
      if (isCentre && centreId) {
        return data.filter((item) => String(item.centre_id) === String(centreId))
      }
      return []

    case "centres":
      // All roles can see all centres
      return data

    case "parcelles":
      if (isCentre && centreId) {
        return data.filter((item) => String(item.centre_id) === String(centreId))
      }
      if (isAgent && centreId) {
        return data.filter((item) => String(item.centre_id) === String(centreId))
      }
      return data

    case "livraisons":
      if (isCentre && centreId) {
        return data.filter((item) => String(item.centre_id) === String(centreId))
      }
      return []

    default:
      return data
  }
}

/**
 * Get dashboard statistics query based on role
 * @param {Object} user - User object with role and centre_id
 * @returns {Object} Statistics queries object
 */
export function getDashboardStatsQueries(user) {
  const { isAdmin, isCentre, isAgent, centreId } = getUserRoleInfo(user)

  const queries = {
    producteurs: null,
    centres: null,
    achats: null,
    parcelles: null,
    livraisons: null,
    totalCacao: null,
  }

  // Producteurs query
  if (isAdmin) {
    queries.producteurs = supabase.from("producteurs").select("*", { count: "exact", head: true })
  } else if (isCentre && centreId) {
    queries.producteurs = supabase
      .from("producteurs")
      .select("*", { count: "exact", head: true })
      .eq("centre_id", centreId)
  } else if (isAgent && centreId) {
    queries.producteurs = supabase
      .from("producteurs")
      .select("*", { count: "exact", head: true })
      .eq("centre_id", centreId)
  } else {
    queries.producteurs = supabase.from("producteurs").select("*", { count: "exact", head: true })
  }

  // Centres query (all can read)
  queries.centres = supabase.from("centres").select("*", { count: "exact", head: true })

  // Achats query
  if (isAdmin) {
    queries.achats = supabase.from("achats").select("poids, montant")
    queries.totalCacao = supabase.from("achats").select("poids")
  } else if (isCentre && centreId) {
    queries.achats = supabase.from("achats").select("poids, montant").eq("centre_id", centreId)
    queries.totalCacao = supabase.from("achats").select("poids").eq("centre_id", centreId)
  } else {
    // AGENT: No access to achats
    queries.achats = null
    queries.totalCacao = null
  }

  // Parcelles query
  if (isAdmin) {
    queries.parcelles = supabase.from("parcelles").select("*", { count: "exact", head: true })
  } else if ((isCentre || isAgent) && centreId) {
    queries.parcelles = supabase
      .from("parcelles")
      .select("*", { count: "exact", head: true })
      .eq("centre_id", centreId)
  } else {
    queries.parcelles = null
  }

  // Livraisons query
  if (isAdmin) {
    queries.livraisons = supabase.from("livraisons").select("poids_total, statut")
  } else if (isCentre && centreId) {
    queries.livraisons = supabase
      .from("livraisons")
      .select("poids_total, statut")
      .eq("centre_id", centreId)
  } else {
    // AGENT: No access to livraisons
    queries.livraisons = null
  }

  return queries
}
