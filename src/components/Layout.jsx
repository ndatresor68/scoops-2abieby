import { useEffect, useMemo, useRef, useState } from "react"
import { FaBars, FaChevronLeft, FaChevronRight } from "react-icons/fa"
import Achats from "../achats"
import Centres from "../Centres"
import DashboardCentral from "../DashboardCentral"
import Login from "../Login"
import Parametres from "../Parametres"
import Producteurs from "../Producteurs"
import Parcelles from "../Parcelles"
import GestionParcelles from "../pages/GestionParcelles"
import Livraisons from "../Livraisons"
import { useAuth } from "../context/AuthContext"
import { useSettings, useSessionTimeout } from "../context/SettingsContext"
import AdminUsers from "../pages/AdminUsers"
import AdminDashboard from "../pages/AdminDashboard"
import AdminDashboardRole from "../pages/dashboards/AdminDashboard"
import CentreDashboardEnhanced from "../pages/dashboards/CentreDashboardEnhanced"
import AgentDashboard from "../pages/dashboards/AgentDashboard"
import Profile from "../pages/Profile"
import Navbar from "./Navbar"
import UserMenu from "./UserMenu"
import { initializeSessionTimeout } from "../utils/sessionManager"
import { useToast } from "./ui/Toast"
import { t } from "../utils/i18n"
import { supabase } from "../supabaseClient"
import { listenNotifications, requestNotificationPermission } from "../notifications"

const TITLES = {
  dashboard: "Tableau de Bord",
  centres: "Gestion des Centres",
  producteurs: "Gestion des Producteurs",
  achats: "Gestion des Achats",
  parametres: "Paramètres",
  profile: "Mon Profil",
  admin: "Administration",
  "admin-users": "Gestion des Utilisateurs",
}

export default function Layout() {
  const { user, loading, displayName, isAdmin, isAgent, isCentre, role, signOut } = useAuth()
  const { showToast } = useToast()
  const sessionTimeoutMinutes = useSessionTimeout()
  const [fcmDebug, setFcmDebug] = useState(() => {
    if (typeof window === "undefined") return null
    return window.__FCM_DEBUG__ || null
  })
  
  // Debug log to verify role source
  useEffect(() => {
    console.log("[Layout] User role:", user?.role)
    console.log("[Layout] Role from AuthContext:", role)
    console.log("[Layout] Is Admin:", isAdmin)
  }, [user, role, isAdmin])
  const [activePage, setActivePage] = useState("dashboard")
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const fcmListenerSetupRef = useRef(false)
  const fcmTokenSetupRef = useRef(false)

  // Initialize session timeout
  useEffect(() => {
    if (!user || !sessionTimeoutMinutes) return

    console.log(`[Layout] Initializing session timeout: ${sessionTimeoutMinutes} minutes`)

    const cleanup = initializeSessionTimeout(sessionTimeoutMinutes, async () => {
      console.log("[Layout] Session timeout reached, logging out...")
      showToast(t("sessionExpired"), "warning")
      await signOut()
    })

    return cleanup
  }, [user, sessionTimeoutMinutes, signOut, showToast])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900)
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return undefined
    const handleFcmDebugUpdate = (event) => {
      setFcmDebug(event.detail || window.__FCM_DEBUG__ || null)
    }
    window.addEventListener("fcm-debug-update", handleFcmDebugUpdate)
    setFcmDebug(window.__FCM_DEBUG__ || null)
    return () => window.removeEventListener("fcm-debug-update", handleFcmDebugUpdate)
  }, [])

  // FCM: listen for foreground messages + register device token in DB.
  // This is best-effort: it must never break the app if FCM isn't available/configured.
  useEffect(() => {
    if (!user) return
    if (fcmListenerSetupRef.current) return
    fcmListenerSetupRef.current = true

    const unsubscribe = listenNotifications((payload) => {
      const title = payload?.notification?.title || payload?.data?.title || "Notification"
      const body = payload?.notification?.body || payload?.data?.body || ""
      const text = body ? `${title} - ${body}` : title
      showToast(text, "info", 4500)
    })

    return () => {
      if (typeof unsubscribe === "function") unsubscribe()
      fcmListenerSetupRef.current = false
    }
  }, [user?.id, showToast])

  useEffect(() => {
    if (!user?.id) return
    if (fcmTokenSetupRef.current) return
    fcmTokenSetupRef.current = true

    ;(async () => {
      try {
        console.log("[FCM] Starting authenticated token registration", {
          userId: user.id,
          role: user.role,
          isAdmin,
        })

        // Avoid prompting permission if a token already exists.
        const { data: existing, error: existingError } = await supabase
          .from("device_tokens")
          .select("token")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle()

        if (existingError && existingError.code !== "PGRST116") {
          console.warn("[FCM] Existing token lookup failed:", existingError)
        } else if (existing?.token) {
          console.log("[FCM] Active token already registered for user:", user.id)
          return
        }

        const token = await requestNotificationPermission({ userId: user.id })
        if (!token) {
          console.warn("[FCM] Token registration returned no token for user:", user.id)
          return
        }

        console.log("[FCM] Token registration flow completed for user:", user.id)
      } catch (error) {
        console.warn("[FCM] Token registration error:", error)
      } finally {
        fcmTokenSetupRef.current = false
      }
    })()
  }, [user?.id, user?.role, isAdmin])

  const sidebarWidth = useMemo(() => {
    if (isMobile) return 0
    return collapsed ? 86 : 268
  }, [collapsed, isMobile])

  // FIX #3: Check session before showing login screen
  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSessionChecked(true)
      } catch (error) {
        console.error("[Layout] Error checking session:", error)
        setSessionChecked(true)
      }
    }
    
    if (!user && !loading) {
      checkSession()
    } else {
      setSessionChecked(true)
    }
  }, [user, loading])

  // Show loading screen while auth is initializing
  if (loading) {
    return (
      <div style={loadingScreen}>
        <div style={spinner}></div>
        <p style={{ marginTop: 20, fontSize: 16, color: "#6b7280" }}>Chargement de la session...</p>
        <p style={{ marginTop: 10, fontSize: 12, color: "#9ca3af" }}>
          Si cette page ne se charge pas, vérifiez votre connexion internet
        </p>
      </div>
    )
  }

  // FIX #3: Only show login if no user AND session check is complete
  // The session check verifies no session exists before showing login
  if (!user && sessionChecked) {
    return <Login />
  }

  // If user is null but session check hasn't completed, show loading
  if (!user && !sessionChecked) {
    return (
      <div style={loadingScreen}>
        <div style={spinner}></div>
        <p style={{ marginTop: 20, fontSize: 16, color: "#6b7280" }}>Vérification de la session...</p>
      </div>
    )
  }

  // ADMIN users: Show only the AdminDashboard interface (no regular Layout)
  if (isAdmin) {
    return <AdminDashboard />
  }

  function renderPage() {
    switch (activePage) {
      case "dashboard":
        // Role-specific dashboards (non-admin only)
        if (isCentre) {
          return <CentreDashboardEnhanced />
        } else if (isAgent) {
          return <AgentDashboard />
        }
        return <DashboardCentral />
      case "centres":
        return <DashboardCentral />
      case "producteurs":
        return <Producteurs />
      case "achats":
        // Only CENTRE can access achats (admin uses AdminDashboard)
        if (isCentre) {
          return <Achats />
        }
        return <DashboardCentral />
      case "parametres":
        return <Parametres onOpenAdminUsers={() => setActivePage("admin-users")} isAdmin={isAdmin} />
      case "profile":
        return <Profile />
      case "parcelles":
        // Parcelles management (AGENT and CENTRE) - Nouvelle version avec GPS
        if (isAgent || isCentre) {
          return <GestionParcelles />
        }
        return <DashboardCentral />
      case "livraisons":
        // Livraisons management (CENTRE only)
        if (isCentre) {
          return <Livraisons />
        }
        return <DashboardCentral />
      case "activites":
        // Field activities (AGENT only)
        return isAgent ? <DashboardCentral /> : <DashboardCentral />
      default:
        return <DashboardCentral />
    }
  }

  return (
    <div style={shell}>
      <Navbar
        activePage={activePage}
        onNavigate={setActivePage}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        isMobile={isMobile}
        isAdmin={isAdmin}
      />

      <div
        style={{
          ...mainArea,
          marginLeft: sidebarWidth,
        }}
      >
        <header style={{
          ...header,
          padding: isMobile ? "16px 20px" : "0 32px",
          minHeight: isMobile ? 80 : 80,
        }}>
          <div style={{
            ...headerLeft,
            gap: isMobile ? 12 : 16,
          }}>
            {isMobile ? (
              <button style={{
                ...iconBtn,
                width: 44,
                height: 44,
                minWidth: 44,
              }} onClick={() => setMobileOpen(true)}>
                <FaBars />
              </button>
            ) : (
              <button style={iconBtn} onClick={() => setCollapsed((v) => !v)}>
                {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
              </button>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                ...title,
                fontSize: isMobile ? "20px" : "24px",
              }}>{TITLES[activePage] || "Application"}</h1>
              {!isMobile && (
                <p style={subtitle}>
                  Connecté en tant que {displayName} {user?.role ? `(${user.role})` : ""}
                </p>
              )}
            </div>
          </div>

          <UserMenu
            onOpenProfile={() => setActivePage("profile")}
            onOpenSettings={() => setActivePage("parametres")}
          />
        </header>

        <main style={{
          ...content,
          padding: isMobile ? "16px" : "32px",
        }}>{renderPage()}</main>
      </div>
      {fcmDebug ? (
        <div style={fcmDebugPanel}>
          <div style={fcmDebugTitle}>FCM Debug</div>
          <div style={fcmDebugMeta}>permission: {String(fcmDebug.permission ?? "n/a")}</div>
          <div style={fcmDebugMeta}>token: {fcmDebug.token || "null"}</div>
          <div style={fcmDebugMeta}>user_id: {fcmDebug.authUserId || fcmDebug.requestedUserId || "null"}</div>
          <div style={fcmDebugMeta}>
            insert: {fcmDebug.saveResult ? JSON.stringify(fcmDebug.saveResult) : JSON.stringify(fcmDebug.insertResult)}
          </div>
          <pre style={fcmDebugPre}>{JSON.stringify(fcmDebug, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  )
}

const shell = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
}

const mainArea = {
  minHeight: "100vh",
  transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  display: "flex",
  flexDirection: "column",
}

const header = {
  position: "sticky",
  top: 0,
  zIndex: 1100,
  minHeight: 80,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "rgba(255,255,255,0.95)",
  backdropFilter: "blur(12px)",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
}

const headerLeft = {
  display: "flex",
  alignItems: "center",
  flex: 1,
  minWidth: 0,
}

const iconBtn = {
  border: "none",
  background: "white",
  width: 40,
  height: 40,
  borderRadius: "10px",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#6b7280",
  transition: "all 0.2s ease",
  flexShrink: 0,
}

const title = {
  margin: 0,
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

const subtitle = {
  margin: 0,
  color: "#6b7280",
  fontSize: "13px",
  marginTop: 2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

const content = {
  flex: 1,
  maxWidth: "100%",
  overflowX: "hidden",
}

const loadingScreen = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
}

const spinner = {
  width: "48px",
  height: "48px",
  border: "4px solid #e5e7eb",
  borderTopColor: "#7a1f1f",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
}

const fcmDebugPanel = {
  position: "fixed",
  right: 12,
  bottom: 12,
  width: "min(420px, calc(100vw - 24px))",
  maxHeight: "50vh",
  overflow: "auto",
  padding: 12,
  borderRadius: 12,
  background: "rgba(15, 23, 42, 0.96)",
  color: "#f8fafc",
  boxShadow: "0 18px 50px rgba(15, 23, 42, 0.35)",
  zIndex: 2000,
  fontSize: 12,
  lineHeight: 1.45,
}

const fcmDebugTitle = {
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 8,
}

const fcmDebugMeta = {
  marginBottom: 6,
  wordBreak: "break-word",
}

const fcmDebugPre = {
  margin: 0,
  marginTop: 8,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontSize: 11,
}
