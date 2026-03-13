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
      // id is the PRIMARY KEY and matches auth.users.id
      // NEVER use auth.user.role, session.role, or any auth metadata
      let profile = null
      let error = null
      
      // Primary lookup: id matches auth.users.id
      const { data: profileById, error: error1 } = await supabase
        .from("utilisateurs")
        .select("*")
        .eq("id", authUser.id)
        .single()
      
      if (!error1 && profileById) {
        profile = profileById
        console.log("[AuthContext] Profile found by id")
      } else {
        // Fallback: try email if id lookup fails
        if (authUser.email) {
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
            error = emailError || error1
          }
        } else {
          error = error1
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
      
      // Timeout protection: max 5 seconds for auth check (reduced from 10)
      const authPromise = supabase.auth.getUser()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Auth timeout")), 5000)
      )
      
      let authResult
      try {
        authResult = await Promise.race([authPromise, timeoutPromise])
      } catch (err) {
        console.error("[AuthContext] Auth check timeout or error:", err)
        // On timeout/error, assume no user - allow app to render login
        setUser(null)
        return null
      }
      
      const { data, error } = authResult || { data: null, error: null }
      
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
          // Reduced timeout to 5 seconds
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Profile load timeout")), 5000)
          )
          
          // Load profile from utilisateurs table using id
          // This will merge profile data (role, nom) into user state
          const profileResult = await Promise.race([
            loadProfileForUser(nextUser),
            timeoutPromise
          ]).catch((err) => {
            console.error("[AuthContext] Profile load timeout or error:", err)
            // If profile load fails, still set user with basic auth data
            // This allows the app to render, user can retry login
            setUser({
              ...nextUser,
              role: null, // Will be set when profile loads
              nom: nextUser.email?.split("@")[0] || "User",
            })
            return null
          })
          
          if (profileResult) {
            console.log("[AuthContext] Profile loaded successfully in syncAuthState")
            // User state is already set by loadProfileForUser with merged profile data
          } else {
            console.warn("[AuthContext] Profile not loaded - user set with basic auth data")
            // User is already set above with basic data
          }
        } catch (err) {
          console.error("[AuthContext] Error loading profile:", err)
          // Set user with basic auth data to allow app to render
          setUser({
            ...nextUser,
            role: null,
            nom: nextUser.email?.split("@")[0] || "User",
          })
        }
      } else {
        console.log("[AuthContext] No user, clearing state")
        setUser(null)
      }
      
      console.log("[AuthContext] Auth state sync completed")
      return nextUser
    } catch (error) {
      console.error("[AuthContext] Error syncing auth state:", error)
      // Always clear user on error to allow login screen
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
        // Safety timeout: always set loading to false after max 8 seconds (reduced)
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn("[AuthContext] Safety timeout reached, forcing loading to false")
            setLoading(false)
          }
        }, 8000)

        await syncAuthState()
        
        if (mounted) {
          console.log("[AuthContext] Session initialized, setting loading to false")
          setLoading(false)
          if (timeoutId) clearTimeout(timeoutId)
        }
      } catch (error) {
        console.error("[AuthContext] Error in initializeSession:", error)
        // Always set loading to false on error to allow app to render
        if (mounted) {
          setLoading(false)
          setUser(null) // Clear user on error
          if (timeoutId) clearTimeout(timeoutId)
        }
      }
    }

    initializeSession()

    // Set up auth state change listener with error handling
    let authListener = null
    try {
      const listenerData = supabase.auth.onAuthStateChange(async (event) => {
        if (!mounted) return
        console.log("[AuthContext] Auth state changed:", event)
        
        try {
          await syncAuthState()
          if (mounted) setLoading(false)
        } catch (error) {
          console.error("[AuthContext] Error in auth state change:", error)
          // Always set loading to false on error
          if (mounted) {
            setLoading(false)
            setUser(null)
          }
        }
      })
      authListener = listenerData
    } catch (error) {
      console.error("[AuthContext] Error setting up auth listener:", error)
      // If listener setup fails, still allow app to render
      if (mounted) {
        setLoading(false)
      }
    }

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      if (authListener?.data?.subscription) {
        try {
          authListener.data.subscription.unsubscribe()
        } catch (err) {
          console.warn("[AuthContext] Error unsubscribing auth listener:", err)
        }
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

  const effectiveIsAgent = effectiveRole === "AGENT"
  const effectiveIsCentre = effectiveRole === "CENTRE"

  const value = useMemo(
    () => {
      // Safe fallbacks for role-based checks
      const safeRole = effectiveRole || null
      const safeIsAdmin = effectiveIsAdmin || false
      const safeIsAgent = effectiveIsAgent || false
      const safeIsCentre = effectiveIsCentre || false
      
      const ctxValue = {
        user,
        // Role is ALWAYS from user.role (merged from utilisateurs table)
        role: safeRole,
        isAdmin: safeIsAdmin,
        isAgent: safeIsAgent,
        isCentre: safeIsCentre,
        centreId: user?.centre_id || null,
        loading,
        isAuthenticated: !!user,
        displayName: getDisplayName(user),
        signInWithPassword,
        signOut,
        refreshUser,
      }
      
      // Debug log when context value changes (only in dev)
      if (import.meta.env.DEV) {
        console.log("[AuthContext] Context value updated:", {
          hasUser: !!ctxValue.user,
          userRole: ctxValue.user?.role,
          role: ctxValue.role,
          isAdmin: ctxValue.isAdmin,
          isAgent: ctxValue.isAgent,
          isCentre: ctxValue.isCentre,
          centreId: ctxValue.centreId,
          loading: ctxValue.loading,
        })
      }
      
      return ctxValue
    },
    [user, effectiveRole, effectiveIsAdmin, effectiveIsAgent, effectiveIsCentre, loading, signInWithPassword, signOut, refreshUser],
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
