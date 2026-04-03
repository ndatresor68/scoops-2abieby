import { supabase } from '../supabaseClient'

const PAGE_SIZE = 30 // Items per page - adjust after testing

/**
 * Fetch a paginated list of producteurs with filtering
 * @param {number} page - Page number (1-based)
 * @param {string} searchTerm - Search term for name/phone
 * @param {string} centreId - Filter by centre_id
 * @returns {Promise<{producteurs, total, totalPages, pageSize}>}
 */
export async function fetchProducteurs(page = 1, searchTerm = '', centreId = '') {
  const start = (page - 1) * PAGE_SIZE
  const end = start + PAGE_SIZE - 1

  try {
    let query = supabase
      .from('producteurs')
      .select('id, nom, telephone, sexe, localite, statut, centre_id, avatar_url', { count: 'exact' })

    // Apply search filter
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.trim().toLowerCase()
      query = query.or(
        `nom.ilike.%${searchLower}%,telephone.ilike.%${searchLower}%`
      )
    }

    // Apply centre filter
    if (centreId && centreId.trim()) {
      query = query.eq('centre_id', centreId)
    }

    // Apply pagination and sorting
    query = query
      .order('nom', { ascending: true })
      .range(start, end)

    const { data, count, error } = await query

    if (error) {
      console.error('[ProducteursService] Error fetching producteurs:', error)
      throw error
    }

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    return {
      producteurs: data || [],
      total: totalCount,
      totalPages,
      pageSize: PAGE_SIZE,
      page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  } catch (error) {
    console.error('[ProducteursService] Error:', error)
    throw error
  }
}

/**
 * Fetch detailed info for a single producteur
 * @param {string} id - Producteur ID
 * @returns {Promise<object>}
 */
export async function fetchProducteurDetail(id) {
  try {
    const { data, error } = await supabase
      .from('producteurs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('[ProducteursService] Error fetching detail:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('[ProducteursService] Error:', error)
    throw error
  }
}

/**
 * Get total count of producteurs matching filters
 * @param {string} searchTerm - Search term for name/phone
 * @param {string} centreId - Filter by centre_id
 * @returns {Promise<number>}
 */
export async function countProducteurs(searchTerm = '', centreId = '') {
  try {
    let query = supabase
      .from('producteurs')
      .select('id', { count: 'exact', head: true })

    // Apply search filter
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.trim().toLowerCase()
      query = query.or(
        `nom.ilike.%${searchLower}%,telephone.ilike.%${searchLower}%`
      )
    }

    // Apply centre filter
    if (centreId && centreId.trim()) {
      query = query.eq('centre_id', centreId)
    }

    const { count, error } = await query

    if (error) {
      console.error('[ProducteursService] Error counting:', error)
      throw error
    }

    return count || 0
  } catch (error) {
    console.error('[ProducteursService] Error:', error)
    throw error
  }
}

/**
 * Get list of all centres for filtering
 * @returns {Promise<array>}
 */
export async function fetchCentres() {
  try {
    const { data, error } = await supabase
      .from('centres')
      .select('id, nom, code')
      .order('nom', { ascending: true })

    if (error) {
      console.error('[ProducteursService] Error fetching centres:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('[ProducteursService] Error:', error)
    throw error
  }
}
