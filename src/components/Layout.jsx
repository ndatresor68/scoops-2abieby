import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react"
import { FaBars, FaChevronLeft, FaChevronRight } from "react-icons/fa"
import { useAuth } from "../context/AuthContext"
import { useSettings, useSessionTimeout } from "../context/SettingsContext"
import Navbar from "./Navbar"
import UserMenu from "./UserMenu"
import { initializeSessionTimeout } from "../utils/sessionManager"
import { useToast } from "./ui/Toast"
import { t } from "../utils/i18n"
import { supabase } from "../supabaseClient"
import { listenNotifications, requestNotificationPermission } from "../notifications"
import { getOfflineState, subscribeOfflineState, syncQueue } from "../services/offlineService"

const TITLES = {
  dashboard: "Tableau de Bord",
  chat: "Messagerie",
  opportunites: "Opportunites",
  about: "À propos",
  contact: "Contact",
  centres: "Gestion des Centres",
  producteurs: "Gestion des Producteurs",
  achats: "Gestion des Achats",
  parametres: "Paramètres",
  privacy: "Confidentialité",
  profile: "Mon Profil",
  admin: "Administration",
  "admin-users": "Gestion des Utilisateurs",
}

const PAGE_PATHS = {
  about: "/about",
  chat: "/chat",
  contact: "/contact",
  opportunites: "/opportunites",
  privacy: "/privacy",
}

const PUBLIC_PAGES = new Set(["about", "contact", "privacy"])

const Achats = lazy(() => import("../achats"))
const DashboardCentral = lazy(() => import("../DashboardCentral"))
const About = lazy(() => import("../pages/About"))
const Contact = lazy(() => import("../pages/Contact"))
const Login = lazy(() => import("../Login"))
const Parametres = lazy(() => import("../Parametres"))
const Privacy = lazy(() => import("../pages/Privacy"))
const Producteurs = lazy(() => import("../Producteurs"))
const GestionParcelles = lazy(() => import("../pages/GestionParcelles"))
const Livraisons = lazy(() => import("../Livraisons"))
const AdminDashboard = lazy(() => import("../pages/AdminDashboard"))
const CentreDashboardEnhanced = lazy(() => import("../pages/dashboards/CentreDashboardEnhanced"))
const AgentDashboard = lazy(() => import("../pages/dashboards/AgentDashboard"))
const Chat = lazy(() => import("../pages/Chat"))
const Opportunities = lazy(() => import("../pages/Opportunities"))
const Profile = lazy(() => import("../pages/Profile"))

function getPageFromPath(pathname) {
  if (pathname === "/about") return "about"
  if (pathname === "/chat") return "chat"
  if (pathname === "/contact") return "contact"
  if (pathname === "/opportunites") return "opportunites"
  if (pathname === "/privacy") return "privacy"
  return "dashboard"
}

export default function Layout() {
  const { user, loading, displayName, isAdmin, isAgent, isCentre, role, signOut } = useAuth()
  const { showToast } = useToast()
  const sessionTimeoutMinutes = useSessionTimeout()
  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof Notification === "undefined") return "unsupported"
    return Notification.permission
  })
  const [notificationPermissionResolved, setNotificationPermissionResolved] = useState(() => {
    if (typeof Notification === "undefined") return true
    return Notification.permission === "granted" || Notification.permission === "denied"
  })
  const [activePage, setActivePage] = useState(() => {
    if (typeof window === "undefined") return "dashboard"
    return getPageFromPath(window.location.pathname)
  })
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [offlineState, setOfflineState] = useState(() => getOfflineState())
  const isPublicPage = PUBLIC_PAGES.has(activePage)

  const fcmListenerSetupRef = useRef(false)
  const fcmTokenSetupRef = useRef(false)
  const notificationPermissionRequestedRef = useRef(false)
  const notificationWarningShownRef = useRef(false)

  // Initialize session timeout
  useEffect(() => {
    if (!user || !sessionTimeoutMinutes) return

    const cleanup = initializeSessionTimeout(sessionTimeoutMinutes, async () => {
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
    const handlePopState = () => {
      setActivePage(getPageFromPath(window.location.pathname))
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeOfflineState(setOfflineState)
    const handleOnline = () => {
      setOfflineState(getOfflineState())
      syncQueue()
    }
    const handleOffline = () => setOfflineState(getOfflineState())

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      unsubscribe()
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported")
      setNotificationPermissionResolved(true)
      return
    }

    const currentPermission = Notification.permission
    setNotificationPermission(currentPermission)

    if (currentPermission === "granted") {
      setNotificationPermissionResolved(true)
      return
    }

    if (currentPermission === "denied") {
      setNotificationPermissionResolved(true)
      return
    }

    if (notificationPermissionRequestedRef.current) {
      setNotificationPermissionResolved(true)
      return
    }

    notificationPermissionRequestedRef.current = true
    setNotificationPermissionResolved(false)

    ;(async () => {
      try {
        await requestNotificationPermission({ userId: user.id })
      } finally {
        const updatedPermission =
          typeof Notification === "undefined" ? "unsupported" : Notification.permission
        setNotificationPermission(updatedPermission)
        setNotificationPermissionResolved(true)
      }
    })()
  }, [user?.id])

  useEffect(() => {
    if (!user || notificationPermission !== "denied" || notificationWarningShownRef.current) return
    notificationWarningShownRef.current = true
    showToast(
      "Les notifications sont désactivées. L'application reste utilisable, mais certaines alertes temps réel peuvent manquer.",
      "warning",
      5000
    )
  }, [notificationPermission, showToast, user])

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
    if (notificationPermission !== "granted") return
    if (fcmTokenSetupRef.current) return
    fcmTokenSetupRef.current = true

    ;(async () => {
      try {
        // Avoid prompting permission if a token already exists.
        const { data: existing, error: existingError } = await supabase
          .from("device_tokens")
          .select("token")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle()

        if (!existingError && existing?.token) {
          return
        }

        const token = await requestNotificationPermission({ userId: user.id })
        if (!token) {
          return
        }
      } catch (error) {
        console.error("[Layout] Token registration error:", error)
      } finally {
        fcmTokenSetupRef.current = false
      }
    })()
  }, [user?.id, user?.role, isAdmin, notificationPermission])

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
  if (loading && !isPublicPage) {
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
  if (isPublicPage) {
    return (
      <div style={shell}>
        <div style={publicShell}>
          <header style={publicHeader}>
            <button type="button" style={publicBrand} onClick={() => navigateToPage("dashboard")}>
              SCOOP ASAB
            </button>
            <div style={publicHeaderLinks}>
              {renderFooterLinks(navigateToPage)}
            </div>
          </header>
          <main style={publicContent}>{renderPage()}</main>
          <footer style={footer}>{renderFooterLinks(navigateToPage)}</footer>
        </div>
      </div>
    )
  }

  if (!user && sessionChecked) {
    return (
      <Suspense fallback={<div style={loadingScreen}><div style={spinner}></div><p style={{ marginTop: 20, fontSize: 16, color: "#6b7280" }}>Chargement...</p></div>}>
        <Login />
      </Suspense>
    )
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
    return (
      <Suspense fallback={<div style={loadingScreen}><div style={spinner}></div><p style={{ marginTop: 20, fontSize: 16, color: "#6b7280" }}>Chargement du dashboard admin...</p></div>}>
        <AdminDashboard />
      </Suspense>
    )
  }

  function navigateToPage(nextPage) {
    setActivePage(nextPage)
    setMobileOpen(false)

    if (typeof window === "undefined") return
    const nextPath = PAGE_PATHS[nextPage] || "/"
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath)
    }
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
      case "about":
        return <About />
      case "chat":
        return <Chat />
      case "contact":
        return <Contact />
      case "opportunites":
        return <Opportunities />
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
      case "privacy":
        return <Privacy />
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
        onNavigate={navigateToPage}
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
              <div style={statusRow}>
                {!offlineState.isOnline && <span style={offlineBadge}>Mode hors ligne</span>}
                {offlineState.isSyncing && (
                  <span style={syncBadge}>
                    Synchronisation... {offlineState.syncProcessed}/{offlineState.syncTotal || 0}
                  </span>
                )}
                {offlineState.queueLength > 0 && (
                  <span style={queueBadge}>{offlineState.queueLength} action(s) en attente</span>
                )}
                {offlineState.syncError && <span style={errorBadge}>Erreur de sync</span>}
              </div>
              {!isMobile && (
                <p style={subtitle}>
                  Connecté en tant que {displayName} {user?.role ? `(${user.role})` : ""}
                </p>
              )}
            </div>
          </div>

          <UserMenu
            onOpenProfile={() => navigateToPage("profile")}
            onOpenSettings={() => navigateToPage("parametres")}
          />
        </header>

        <main style={{
          ...content,
          padding: isMobile ? "16px" : "32px",
        }}>
          <Suspense
            fallback={
              <div style={pageFallback}>
                <div style={spinner}></div>
                <p style={pageFallbackText}>Chargement de la page...</p>
              </div>
            }
          >
            {renderPage()}
          </Suspense>
        </main>
        <footer style={footer}>{renderFooterLinks(navigateToPage)}</footer>
      </div>
    </div>
  )
}

function renderFooterLinks(onNavigate) {
  return (
    <>
      <button type="button" style={footerLink} onClick={() => onNavigate("about")}>
        À propos
      </button>
      <button type="button" style={footerLink} onClick={() => onNavigate("contact")}>
        Contact
      </button>
      <button type="button" style={footerLink} onClick={() => onNavigate("privacy")}>
        Confidentialité
      </button>
    </>
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

const pageFallback = {
  minHeight: 260,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 14,
}

const pageFallbackText = {
  margin: 0,
  fontSize: 14,
  color: "#64748b",
}

const publicShell = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  width: "min(1100px, calc(100% - 32px))",
  margin: "0 auto",
}

const publicHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: "24px 0 8px",
  flexWrap: "wrap",
}

const publicBrand = {
  border: "none",
  background: "transparent",
  color: "#7a1f1f",
  fontSize: 22,
  fontWeight: 800,
  cursor: "pointer",
  padding: 0,
}

const publicHeaderLinks = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
}

const publicContent = {
  flex: 1,
  padding: "12px 0 32px",
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

const statusRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 8,
}

const statusBadgeBase = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 28,
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
}

const offlineBadge = {
  ...statusBadgeBase,
  color: "#92400e",
  background: "rgba(251, 191, 36, 0.18)",
  border: "1px solid rgba(251, 191, 36, 0.32)",
}

const syncBadge = {
  ...statusBadgeBase,
  color: "#1d4ed8",
  background: "rgba(59, 130, 246, 0.14)",
  border: "1px solid rgba(59, 130, 246, 0.22)",
}

const queueBadge = {
  ...statusBadgeBase,
  color: "#475569",
  background: "rgba(148, 163, 184, 0.14)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
}

const errorBadge = {
  ...statusBadgeBase,
  color: "#b91c1c",
  background: "rgba(239, 68, 68, 0.14)",
  border: "1px solid rgba(239, 68, 68, 0.2)",
}

const content = {
  flex: 1,
  maxWidth: "100%",
  overflowX: "hidden",
}

const footer = {
  display: "flex",
  flexWrap: "wrap",
  gap: 14,
  justifyContent: "center",
  alignItems: "center",
  padding: "20px 16px 28px",
  borderTop: "1px solid rgba(15, 23, 42, 0.06)",
  color: "#64748b",
}

const footerLink = {
  border: "none",
  background: "transparent",
  color: "#64748b",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
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

const permissionScreen = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  background:
    "radial-gradient(circle at top, rgba(122,31,31,0.12), transparent 38%), linear-gradient(180deg, #fff7ed 0%, #fff 100%)",
}

const permissionCard = {
  width: "100%",
  maxWidth: 460,
  padding: "32px 24px",
  borderRadius: 24,
  background: "#ffffff",
  boxShadow: "0 24px 60px rgba(122, 31, 31, 0.14)",
  border: "1px solid rgba(122, 31, 31, 0.12)",
  textAlign: "center",
}

const permissionTitle = {
  margin: 0,
  marginBottom: 16,
  fontSize: "clamp(24px, 4vw, 32px)",
  fontWeight: 800,
  lineHeight: 1.1,
  color: "#7a1f1f",
}

const permissionMessage = {
  margin: 0,
  color: "#1f2937",
  fontSize: 16,
  lineHeight: 1.6,
}

const permissionHelp = {
  margin: "16px 0 0",
  color: "#6b7280",
  fontSize: 14,
  lineHeight: 1.6,
}

const permissionButton = {
  marginTop: 24,
  width: "100%",
  minHeight: 52,
  border: "none",
  borderRadius: 14,
  background: "linear-gradient(135deg, #7a1f1f 0%, #a63a3a 100%)",
  color: "#ffffff",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 16px 32px rgba(122, 31, 31, 0.22)",
}

