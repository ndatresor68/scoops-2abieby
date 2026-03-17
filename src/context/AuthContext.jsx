import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from "react"
import { supabase } from "../supabaseClient"
import { logUserLogin, logUserLogout } from "../utils/activityLogger"

const AuthContext = createContext(null)
const ALLOWED_ROLES = new Set(["ADMIN", "AGENT", "CENTRE"])

// Configuration constants
const AUTH_CHECK_TIMEOUT = 15000 // 15 seconds (increased from 5)
const PROFILE_LOAD_TIMEOUT = 15000 // 15 seconds (increased from 5)
const SAFETY_TIMEOUT = 20000 // 20 seconds (increased from 8)
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

function getDisplayName(user) {
  return (
    user?.nom ||
    user?.email?.split("@")[0] ||
    "Utilisateur"
  )
}

function normalizeRole(rawRole) {
  if (!rawRole) {
    return null
  }
  const raw = String(rawRole)
  const normalizedRole = raw.trim().toUpperCase()
  if (ALLOWED_ROLES.has(normalizedRole)) {
    return normalizedRole
  }
  console.warn("[AuthContext] normalizeRole: Invalid role:", rawRole)
  return null
}

/**
 * Check if a valid session exists in localStorage
 * This prevents clearing user state when session actually exists
 */
async function checkSessionExists() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  } catch (error) {
    console.error("[AuthContext] Error checking session:", error)
    return false
  }
}

/**
 * Retry a function with exponential backoff
 */
async function retryOperation(operation, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)))
    }
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  
  // Track ongoing operations to prevent race conditions
  const syncInProgressRef = useRef(false)
  const mountedRef = useRef(true)

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
        return null
      }

      if (!profile) {
        console.warn("[AuthContext] WARNING: No profile found in utilisateurs table for id:", authUser.id)
        return null
      }

      console.log("[AuthContext] ===== PROFILE LOADED FROM DB =====")
      console.log("[AuthContext] DB ROLE:", profile.role)
      
      // Verify role is NOT "authenticated" (PostgreSQL role)
      if (profile.role === "authenticated" || profile.role === "AUTHENTICATED") {
        console.error("[AuthContext] CRITICAL ERROR: Profile role is 'authenticated' - this is a PostgreSQL role, not application role!")
        return null
      }
      
      // Merge profile data into user state
      const mergedUser = {
        ...authUser,
        role: profile.role,
        nom: profile.nom,
        centre_id: profile.centre_id,
        avatar_url: profile.avatar_url,
      }
      
      setUser(mergedUser)
      
      console.log("[AuthContext] User state updated with profile data from DB")
      console.log("[AuthContext] ===== PROFILE LOAD COMPLETE =====")
      return profile
    } catch (error) {
      console.error("[AuthContext] EXCEPTION loading profile:", error)
      return null
    }
  }, [])

  /**
   * Sync auth state with proper error handling and session verification
   * FIX: Only clear user if session actually doesn't exist
   */
  const syncAuthState = useCallback(async (skipRetry = false) => {
    // Prevent multiple simultaneous syncs
    if (syncInProgressRef.current) {
      console.log("[AuthContext] Sync already in progress, skipping...")
      return null
    }

    syncInProgressRef.current = true

    try {
      console.log("[AuthContext] Starting auth state sync...")
      
      // FIX #1: Increased timeout and added retry logic
      const authOperation = async () => {
        const authPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Auth timeout")), AUTH_CHECK_TIMEOUT)
        )
        return await Promise.race([authPromise, timeoutPromise])
      }

      let authResult
      try {
        if (skipRetry) {
          authResult = await authOperation()
        } else {
          authResult = await retryOperation(authOperation)
        }
      } catch (err) {
        console.error("[AuthContext] Auth check failed after retries:", err)
        
        // FIX #2: Check if session exists before clearing user
        const sessionExists = await checkSessionExists()
        if (sessionExists) {
          console.warn("[AuthContext] Session exists but getUser() failed - keeping user state")
          syncInProgressRef.current = false
          return user // Return current user instead of clearing
        }
        
        // Only clear user if session actually doesn't exist
        console.log("[AuthContext] No session found, clearing user state")
        if (mountedRef.current) {
          setUser(null)
        }
        syncInProgressRef.current = false
        return null
      }
      
      const { data, error } = authResult || { data: null, error: null }
      
      // FIX #2: Distinguish between "no session" vs "temporary error"
      if (error) {
        console.error("[AuthContext] Auth error:", error)
        
        // Check if this is a real auth error or just a temporary issue
        const isAuthError = error.message?.includes("JWT") || 
                           error.message?.includes("session") ||
                           error.message?.includes("token")
        
        if (!isAuthError) {
          // Temporary error - check if session exists
          const sessionExists = await checkSessionExists()
          if (sessionExists) {
            console.warn("[AuthContext] Temporary error but session exists - keeping user state")
            syncInProgressRef.current = false
            return user
          }
        }
        
        // Real auth error or no session - clear user
        if (mountedRef.current) {
          setUser(null)
        }
        syncInProgressRef.current = false
        return null
      }
      
      const nextUser = data?.user || null
      
      if (nextUser) {
        console.log("[AuthContext] User authenticated, loading profile from DB...")
        
        // FIX #1: Increased timeout for profile loading
        const profileOperation = async () => {
          const profilePromise = loadProfileForUser(nextUser)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Profile load timeout")), PROFILE_LOAD_TIMEOUT)
          )
          return await Promise.race([profilePromise, timeoutPromise])
        }

        try {
          let profileResult
          if (skipRetry) {
            profileResult = await profileOperation()
          } else {
            profileResult = await retryOperation(profileOperation)
          }
          
          if (profileResult) {
            console.log("[AuthContext] Profile loaded successfully")
            // User state is already set by loadProfileForUser
          } else {
            // FIX #6: Better handling when profile load fails
            // Keep user with basic auth data but log warning
            console.warn("[AuthContext] Profile not loaded - user set with basic auth data")
            if (mountedRef.current) {
              setUser({
                ...nextUser,
                role: null,
                nom: nextUser.email?.split("@")[0] || "User",
              })
            }
          }
        } catch (err) {
          console.error("[AuthContext] Profile load failed:", err)
          // Set user with basic auth data to allow app to render
          if (mountedRef.current) {
            setUser({
              ...nextUser,
              role: null,
              nom: nextUser.email?.split("@")[0] || "User",
            })
          }
        }
      } else {
        console.log("[AuthContext] No user, clearing state")
        if (mountedRef.current) {
          setUser(null)
        }
      }
      
      console.log("[AuthContext] Auth state sync completed")
      syncInProgressRef.current = false
      return nextUser
    } catch (error) {
      console.error("[AuthContext] Error syncing auth state:", error)
      
      // FIX #2: Check session before clearing user on error
      const sessionExists = await checkSessionExists()
      if (sessionExists) {
        console.warn("[AuthContext] Error occurred but session exists - keeping user state")
        syncInProgressRef.current = false
        return user
      }
      
      // Only clear if session doesn't exist
      if (mountedRef.current) {
        setUser(null)
      }
      syncInProgressRef.current = false
      return null
    }
  }, [loadProfileForUser, user])

  const refreshUser = useCallback(async () => {
    return syncAuthState(true) // Skip retry for manual refresh
  }, [syncAuthState])

  /**
   * Initialize session and set up auth listener
   * FIX #3, #4, #7: Proper initialization and auth state change handling
   */
  useEffect(() => {
    mountedRef.current = true
    let timeoutId = null
    let authListener = null

    console.log("[AuthContext] Initializing session...")

    async function initializeSession() {
      try {
        // FIX #1: Increased safety timeout
        timeoutId = setTimeout(() => {
          if (mountedRef.current && !initialized) {
            console.warn("[AuthContext] Safety timeout reached, setting loading to false")
            setLoading(false)
            setInitialized(true)
          }
        }, SAFETY_TIMEOUT)

        await syncAuthState()
        
        if (mountedRef.current) {
          console.log("[AuthContext] Session initialized")
          setLoading(false)
          setInitialized(true)
          if (timeoutId) clearTimeout(timeoutId)
        }
      } catch (error) {
        console.error("[AuthContext] Error in initializeSession:", error)
        
        // FIX #2: Check session before clearing user
        const sessionExists = await checkSessionExists()
        if (!sessionExists && mountedRef.current) {
          setUser(null)
        }
        
        if (mountedRef.current) {
          setLoading(false)
          setInitialized(true)
          if (timeoutId) clearTimeout(timeoutId)
        }
      }
    }

    initializeSession()

    // FIX #4: Implement correct onAuthStateChange listener
    try {
      const listenerData = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mountedRef.current) return
        
        console.log("[AuthContext] Auth state changed:", event, session ? "session exists" : "no session")
        
        try {
          // Handle different auth events properly
          switch (event) {
            case "SIGNED_IN":
              console.log("[AuthContext] User signed in")
              // Sync state to load profile
              await syncAuthState()
              if (mountedRef.current) {
                setLoading(false)
              }
              break
              
            case "SIGNED_OUT":
              console.log("[AuthContext] User signed out")
              // Clear user state on explicit sign out
              if (mountedRef.current) {
                setUser(null)
                setLoading(false)
              }
              break
              
            case "TOKEN_REFRESHED":
              console.log("[AuthContext] Token refreshed")
              // FIX #6: Don't clear user on token refresh - session is still valid
              // Only sync if user state is missing
              if (!user && session?.user) {
                await syncAuthState()
              }
              if (mountedRef.current) {
                setLoading(false)
              }
              break
              
            case "USER_UPDATED":
              console.log("[AuthContext] User updated")
              // Sync to get latest user data
              await syncAuthState()
              if (mountedRef.current) {
                setLoading(false)
              }
              break
              
            default:
              console.log("[AuthContext] Other auth event:", event)
              // For other events, sync state
              await syncAuthState()
              if (mountedRef.current) {
                setLoading(false)
              }
          }
        } catch (error) {
          console.error("[AuthContext] Error handling auth state change:", error)
          
          // FIX #2: Don't clear user on error - check session first
          const sessionExists = await checkSessionExists()
          if (!sessionExists && mountedRef.current) {
            setUser(null)
          }
          
          if (mountedRef.current) {
            setLoading(false)
          }
        }
      })
      
      authListener = listenerData
    } catch (error) {
      console.error("[AuthContext] Error setting up auth listener:", error)
      if (mountedRef.current) {
        setLoading(false)
        setInitialized(true)
      }
    }

    return () => {
      mountedRef.current = false
      syncInProgressRef.current = false
      if (timeoutId) clearTimeout(timeoutId)
      if (authListener?.data?.subscription) {
        try {
          authListener.data.subscription.unsubscribe()
        } catch (err) {
          console.warn("[AuthContext] Error unsubscribing auth listener:", err)
        }
      }
    }
  }, [syncAuthState, user, initialized])

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
    
    // Load profile immediately after login
    console.log("[AuthContext] Loading profile immediately after login...")
    const profileResult = await loadProfileForUser(response.data.user)
    
    if (profileResult) {
      console.log("[AuthContext] Profile loaded after login")
      console.log("[AuthContext] DB ROLE after login:", profileResult.role)
      
      // Log successful login
      await logUserLogin(response.data.user.id, response.data.user.email)
    } else {
      console.error("[AuthContext] CRITICAL: Profile not loaded after login!")
    }
    
    // Sync auth state to ensure consistency
    console.log("[AuthContext] Syncing auth state after login...")
    await syncAuthState(true) // Skip retry for immediate sync after login
    
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

  // Role calculation
  const effectiveRole = useMemo(() => {
    const roleFromUser = user?.role
    
    if (roleFromUser === "authenticated" || roleFromUser === "AUTHENTICATED") {
      console.error("[AuthContext] CRITICAL: user.role is 'authenticated' - this is WRONG!")
      return null
    }
    
    if (roleFromUser) {
      return normalizeRole(roleFromUser)
    }
    return null
  }, [user])
  
  const effectiveIsAdmin = effectiveRole === "ADMIN"
  const effectiveIsAgent = effectiveRole === "AGENT"
  const effectiveIsCentre = effectiveRole === "CENTRE"

  // Debug log whenever user/role changes
  useEffect(() => {
    console.log("[AuthContext] ===== USER STATE UPDATE =====")
    console.log("[AuthContext] User exists:", !!user)
    console.log("[AuthContext] User role:", user?.role)
    console.log("[AuthContext] Effective role:", effectiveRole)
    console.log("[AuthContext] Loading:", loading)
    console.log("[AuthContext] Initialized:", initialized)
    console.log("[AuthContext] ==============================")
  }, [user, effectiveRole, loading, initialized])

  const value = useMemo(
    () => ({
      user,
      role: effectiveRole,
      isAdmin: effectiveIsAdmin,
      isAgent: effectiveIsAgent,
      isCentre: effectiveIsCentre,
      centreId: user?.centre_id || null,
      loading,
      isAuthenticated: !!user,
      displayName: getDisplayName(user),
      signInWithPassword,
      signOut,
      refreshUser,
    }),
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
