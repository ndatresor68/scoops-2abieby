import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { supabase } from "../supabaseClient"
import { logUserLogin, logUserLogout } from "../utils/activityLogger"

const AuthContext = createContext(null)
const ALLOWED_ROLES = new Set(["ADMIN", "AGENT", "CENTRE"])

function getDisplayName(user) {
  // user.nom is merged from profile, so use it directly
  return (
    user?.nom ||
    user?.email?.split("@")[0] ||
    "Utilisateur"
  )
}

function normalizeRole(rawRole) {
  if (!rawRole) {
    console.warn("[AuthContext] normalizeRole: No role provided")
    return null // Return null instead of defaulting to AGENT
  }
  const raw = String(rawRole)
  const normalizedRole = raw.trim().toUpperCase()
  if (ALLOWED_ROLES.has(normalizedRole)) {
    return normalizedRole
  }
  console.warn("[AuthContext] normalizeRole: Invalid role:", rawRole, "-> defaulting to null")
  return null // Return null instead of defaulting to AGENT
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null) // User state includes profile data (role, nom)
  const [loading, setLoading] = useState(true)
  
  console.log("[AuthContext] Provider initialized")

  const loadProfileForUser = useCallback(async (authUser) => {
    if (!authUser || !authUser.id) {
      console.warn("[AuthContext] No authUser or id provided")
      return null
    }

    try {
      console.log("[AuthContext] ===== LOADING PROFILE FROM DB =====")
      console.log("[AuthContext] User ID:", authUser.id)
      console.log("[AuthContext] User email:", authUser.email)
      
      // CRITICAL: ALWAYS read from public.utilisateurs table
      // Try user_id first (foreign key to auth.users.id), then id, then email
      // NEVER use auth.user.role, session.role, or any auth metadata
      let profile = null
      let error = null
      
      // First try: user_id (most common structure)
      const { data: profileByUserId, error: error1 } = await supabase
        .from("utilisateurs")
        .select("*")
        .eq("user_id", authUser.id)
        .single()
      
      if (!error1 && profileByUserId) {
        profile = profileByUserId
        console.log("[AuthContext] Profile found by user_id")
      } else {
        // Second try: id (if id matches auth.users.id)
        const { data: profileById, error: error2 } = await supabase
          .from("utilisateurs")
          .select("*")
          .eq("id", authUser.id)
          .single()
        
        if (!error2 && profileById) {
          profile = profileById
          console.log("[AuthContext] Profile found by id")
        } else {
          error = error2 || error1
        }
      }

      // If profile not found by user_id or id, try email as fallback
      if (!profile && authUser.email) {
        console.log("[AuthContext] Trying fallback with email...")
        const { data: profileByEmail, error: emailError } = await supabase
          .from("utilisateurs")
          .select("*")
          .eq("email", authUser.email)
          .single()
        
        if (!emailError && profileByEmail) {
          profile = profileByEmail
          console.log("[AuthContext] Profile found by email fallback")
        } else {
          error = emailError || error
        }
      }
      
      if (error && !profile) {
        console.error("[AuthContext] ERROR loading profile from utilisateurs:", error)
        console.error("[AuthContext] Error details:", JSON.stringify(error, null, 2))
        console.error("[AuthContext] Error code:", error?.code)
        console.error("[AuthContext] Error message:", error?.message)
        return null
      }

      if (!profile) {
        console.warn("[AuthContext] WARNING: No profile found in utilisateurs table for id:", authUser.id)
        return null
      }

      // CRITICAL DEBUG LOG
      console.log("[AuthContext] ===== PROFILE LOADED FROM DB =====")
      console.log("Loaded profile:", profile)
      console.log("[AuthContext] DB ROLE:", profile.role)
      
      // CRITICAL: Verify role is NOT "authenticated" (PostgreSQL role)
      if (profile.role === "authenticated" || profile.role === "AUTHENTICATED") {
        console.error("[AuthContext] CRITICAL ERROR: Profile role is 'authenticated' - this is a PostgreSQL role, not application role!")
        console.error("[AuthContext] This means the role in utilisateurs table is incorrect")
        console.error("[AuthContext] Expected: ADMIN, AGENT, or CENTRE")
        console.error("[AuthContext] Found:", profile.role)
        return null
      }
      
      console.log("[AuthContext] Profile data:", {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        nom: profile.nom
      })

      // CRITICAL: Merge profile data into user state
      // This ensures user.role comes ONLY from utilisateurs.role (NOT from auth metadata)
      // NEVER use authUser.role, session.role, or any auth metadata
      const mergedUser = {
        ...authUser,
        // Remove any role from authUser (if it exists) - we ONLY use profile.role
        role: undefined,  // Clear any auth role first
        nom: undefined,   // Clear any auth nom first
      }
      
      // Now set ONLY from profile (DB)
      setUser({
        ...mergedUser,
        role: profile.role,  // FROM DB ONLY - NEVER from auth
        nom: profile.nom,    // FROM DB ONLY - NEVER from auth
        centre_id: profile.centre_id,
        avatar_url: profile.avatar_url,
      })
      
      console.log("[AuthContext] User state updated with profile data from DB")
      console.log("[AuthContext] User.role is now:", profile.role, "(from utilisateurs table)")
      console.log("[AuthContext] ===== PROFILE LOAD COMPLETE =====")
      return profile
    } catch (error) {
      console.error("[AuthContext] EXCEPTION loading profile:", error)
      console.error("[AuthContext] Exception stack:", error.stack)
      return null
    }
  }, [])

  const syncAuthState = useCallback(async () => {
    try {
      console.log("[AuthContext] Starting auth state sync...")
      
      // Timeout protection: max 10 seconds for auth check
      const authPromise = supabase.auth.getUser()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Auth timeout")), 10000)
      )
      
      const { data, error } = await Promise.race([authPromise, timeoutPromise]).catch((err) => {
        console.error("[AuthContext] Auth check timeout or error:", err)
        return { data: null, error: err }
      })
      
      if (error) {
        console.error("[AuthContext] Auth error:", error)
        setUser(null)
        return null
      }
      
      const nextUser = data?.user || null
      
      // Load profile from utilisateurs table - this will merge profile data into user
      if (nextUser) {
        console.log("[AuthContext] User authenticated, loading profile from DB...")
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Profile load timeout")), 8000)
          )
          
          // Load profile from utilisateurs table using id
          // This will merge profile data (role, nom) into user state
          // CRITICAL: Do NOT set user until profile is loaded - we need role from DB
          const profileResult = await Promise.race([
            loadProfileForUser(nextUser),
            timeoutPromise
          ]).catch((err) => {
            console.error("[AuthContext] Profile load timeout:", err)
            // Don't set user without profile - wait for retry
            return null
          })
          
          if (profileResult) {
            console.log("[AuthContext] Profile loaded successfully in syncAuthState")
            // User state is already set by loadProfileForUser with merged profile data
          } else {
            console.warn("[AuthContext] Profile not loaded in syncAuthState")
            // Don't set user without profile - we need role from DB
            // User will be set when profile loads successfully
          }
        } catch (err) {
          console.error("[AuthContext] Error loading profile:", err)
          // Don't set user without profile - we need role from DB
        }
      } else {
        console.log("[AuthContext] No user, clearing state")
        setUser(null)
      }
      
      console.log("[AuthContext] Auth state sync completed")
      return nextUser
    } catch (error) {
      console.error("[AuthContext] Error syncing auth state:", error)
      setUser(null)
      return null
    }
  }, [loadProfileForUser])

  const refreshUser = useCallback(async () => {
    return syncAuthState()
  }, [syncAuthState])

  useEffect(() => {
    let mounted = true
    let timeoutId = null

    console.log("[AuthContext] Initializing session...")

    async function initializeSession() {
      try {
        // Safety timeout: always set loading to false after max 12 seconds
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn("[AuthContext] Safety timeout reached, forcing loading to false")
            setLoading(false)
          }
        }, 12000)

        await syncAuthState()
        
        if (mounted) {
          console.log("[AuthContext] Session initialized, setting loading to false")
          setLoading(false)
          if (timeoutId) clearTimeout(timeoutId)
        }
      } catch (error) {
        console.error("[AuthContext] Error in initializeSession:", error)
        if (mounted) {
          setLoading(false)
          if (timeoutId) clearTimeout(timeoutId)
        }
      }
    }

    initializeSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (!mounted) return
      console.log("[AuthContext] Auth state changed:", event)
      
      try {
        await syncAuthState()
        if (mounted) setLoading(false)
      } catch (error) {
        console.error("[AuthContext] Error in auth state change:", error)
        if (mounted) setLoading(false)
      }
    })

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [syncAuthState])


  const signInWithPassword = useCallback(async (email, password) => {
    console.log("[AuthContext] ===== SIGN IN ATTEMPT =====")
    console.log("[AuthContext] Email:", email)
    
    const response = await supabase.auth.signInWithPassword({ email, password })
    
    if (response.error) {
      console.error("[AuthContext] Sign in error:", response.error)
      return response
    }
    
    if (!response.data?.user) {
      console.error("[AuthContext] Sign in succeeded but no user data")
      return response
    }
    
    console.log("[AuthContext] ===== SIGN IN SUCCESSFUL =====")
    console.log("[AuthContext] User ID:", response.data.user.id)
    console.log("[AuthContext] User email:", response.data.user.email)
    
    // CRITICAL: After login, IMMEDIATELY fetch profile from utilisateurs table
    // This will merge profile.role and profile.nom into user state
    console.log("[AuthContext] Loading profile immediately after login...")
    const profileResult = await loadProfileForUser(response.data.user)
    
    if (profileResult) {
      console.log("[AuthContext] Profile loaded after login")
      console.log("Loaded profile:", profileResult)
      console.log("[AuthContext] DB ROLE after login:", profileResult.role)
      // User state is already set by loadProfileForUser with merged profile data
      console.log("[AuthContext] User state now includes role from DB:", profileResult.role)
      
      // Log successful login
      await logUserLogin(response.data.user.id, response.data.user.email)
    } else {
      console.error("[AuthContext] CRITICAL: Profile not loaded after login!")
      // Don't set user without profile - we need role from DB
      // This ensures we never use auth.role or session.role
    }
    
    // Force sync auth state to ensure everything is consistent
    console.log("[AuthContext] Syncing auth state after login...")
    await syncAuthState()
    
    console.log("[AuthContext] ===== SIGN IN COMPLETE =====")
    
    return response
  }, [loadProfileForUser, syncAuthState])

  const signOut = useCallback(async () => {
    console.log("[AuthContext] Signing out...")
    
    // Log logout before signing out
    if (user?.id) {
      await logUserLogout(user.id, user.email)
    }
    
    const response = await supabase.auth.signOut()
    if (!response.error) {
      setUser(null)
    }
    return response
  }, [user])

  // CRITICAL: Role is ALWAYS from user.role (merged from utilisateurs table)
  // user.role comes from profile.role loaded from DB
  // NEVER use auth.user.role, session.role, or any auth metadata
  const effectiveRole = useMemo(() => {
    const roleFromUser = user?.role
    
    // CRITICAL: Reject "authenticated" - this is a PostgreSQL role, not application role
    if (roleFromUser === "authenticated" || roleFromUser === "AUTHENTICATED") {
      console.error("[AuthContext] CRITICAL: user.role is 'authenticated' - this is WRONG!")
      console.error("[AuthContext] This means role is coming from auth metadata, not DB")
      console.error("[AuthContext] Expected role from utilisateurs.role: ADMIN, AGENT, or CENTRE")
      return null
    }
    
    if (roleFromUser) {
      const normalized = normalizeRole(roleFromUser)
      console.log("[AuthContext] Effective role from user.role (from DB):", normalized, "| Raw:", roleFromUser)
      return normalized
    }
    console.log("[AuthContext] No role in user state (waiting for profile load from DB)")
    return null
  }, [user])
  
  const effectiveIsAdmin = effectiveRole === "ADMIN"
  
  // Debug log whenever user/role changes
  useEffect(() => {
    console.log("[AuthContext] ===== USER STATE UPDATE =====")
    console.log("[AuthContext] User exists:", !!user)
    console.log("[AuthContext] User role:", user?.role)
    console.log("[AuthContext] User nom:", user?.nom)
    console.log("[AuthContext] Effective role:", effectiveRole)
    console.log("[AuthContext] Is Admin:", effectiveIsAdmin)
    console.log("[AuthContext] ==============================")
  }, [user, effectiveRole, effectiveIsAdmin])

  const value = useMemo(
    () => {
      const ctxValue = {
        user,
        // Role is ALWAYS from user.role (merged from utilisateurs table)
        role: effectiveRole,
        isAdmin: effectiveIsAdmin,
        loading,
        isAuthenticated: !!user,
        displayName: getDisplayName(user),
        signInWithPassword,
        signOut,
        refreshUser,
      }
      
      // Debug log when context value changes
      console.log("[AuthContext] Context value updated:", {
        hasUser: !!ctxValue.user,
        userRole: ctxValue.user?.role,
        role: ctxValue.role,
        isAdmin: ctxValue.isAdmin,
        displayName: ctxValue.displayName
      })
      
      return ctxValue
    },
    [user, effectiveRole, effectiveIsAdmin, loading, signInWithPassword, signOut, refreshUser],
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
