import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { supabase } from "../supabaseClient"

const AuthContext = createContext(null)
const ALLOWED_ROLES = new Set(["ADMIN", "AGENT", "CENTRE"])

function getDisplayName(user, profile) {
  const metadata = user?.user_metadata || {}
  return (
    profile?.nom ||
    metadata.full_name ||
    metadata.name ||
    metadata.nom ||
    user?.email?.split("@")[0] ||
    "Utilisateur"
  )
}

function normalizeRole(rawRole) {
  const raw = String(rawRole || "AGENT")
  const normalizedRole = raw.trim().toUpperCase()
  return ALLOWED_ROLES.has(normalizedRole) ? normalizedRole : "AGENT"
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState("AGENT")
  const [loading, setLoading] = useState(true)

  const loadRoleForUser = useCallback(async (authUser) => {
    if (!authUser?.email) {
      setRole("AGENT")
      return "AGENT"
    }

    const { data } = await supabase
      .from("utilisateurs")
      .select("role")
      .eq("email", authUser.email)
      .maybeSingle()

    const nextRole = normalizeRole(data?.role)
    setRole(nextRole)
    return nextRole
  }, [])

  const loadProfileForUser = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null)
      return null
    }

    let row = null

    const { data: byUserId } = await supabase
      .from("utilisateurs")
      .select("id,user_id,nom,email,role,centre_id,avatar_url")
      .eq("user_id", authUser.id)
      .maybeSingle()

    if (byUserId) {
      row = byUserId
    } else {
      const { data: byId } = await supabase
        .from("utilisateurs")
        .select("id,user_id,nom,email,role,centre_id,avatar_url")
        .eq("id", authUser.id)
        .maybeSingle()
      row = byId || null
    }

    setProfile(row)
    return row
  }, [])

  const syncAuthState = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    const nextUser = data?.user || null
    setUser(nextUser)
    await Promise.all([loadProfileForUser(nextUser), loadRoleForUser(nextUser)])
    return nextUser
  }, [loadProfileForUser, loadRoleForUser])

  const refreshUser = useCallback(async () => {
    return syncAuthState()
  }, [syncAuthState])

  useEffect(() => {
    let mounted = true

    async function initializeSession() {
      await syncAuthState()
      if (mounted) setLoading(false)
    }

    initializeSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(async () => {
      if (!mounted) return
      await syncAuthState()
      if (mounted) setLoading(false)
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [syncAuthState])

  useEffect(() => {
    console.log(role)
  }, [role])

  const signInWithPassword = useCallback(async (email, password) => {
    const response = await supabase.auth.signInWithPassword({ email, password })
    if (!response.error) {
      await syncAuthState()
    }
    return response
  }, [syncAuthState])

  const signOut = useCallback(async () => {
    const response = await supabase.auth.signOut()
    if (!response.error) {
      setUser(null)
      setProfile(null)
      setRole("AGENT")
    }
    return response
  }, [])

  const isAdmin = role === "ADMIN"

  const value = useMemo(
    () => ({
      user,
      profile,
      role,
      isAdmin,
      loading,
      isAuthenticated: !!user,
      displayName: getDisplayName(user, profile),
      signInWithPassword,
      signOut,
      refreshUser,
    }),
    [user, profile, role, isAdmin, loading, signInWithPassword, signOut, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}
