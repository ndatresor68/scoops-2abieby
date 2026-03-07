import { useEffect, useMemo, useState } from "react"
import { FaBars, FaChevronLeft, FaChevronRight } from "react-icons/fa6"
import Achats from "../achats"
import Centres from "../Centres"
import DashboardCentral from "../DashboardCentral"
import Login from "../Login"
import Parametres from "../Parametres"
import Producteurs from "../Producteurs"
import { useAuth } from "../context/AuthContext"
import AdminUsers from "../pages/AdminUsers"
import Profile from "../pages/Profile"
import Navbar from "./Navbar"
import UserMenu from "./UserMenu"

const TITLES = {
  dashboard: "Tableau de Bord",
  centres: "Gestion des Centres",
  producteurs: "Gestion des Producteurs",
  achats: "Gestion des Achats",
  parametres: "Paramètres",
  profile: "Mon Profil",
  "admin-users": "Gestion des Utilisateurs",
}

export default function Layout() {
  const { user, loading, displayName, isAdmin, role } = useAuth()
  const [activePage, setActivePage] = useState("dashboard")
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900)
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const sidebarWidth = useMemo(() => {
    if (isMobile) return 0
    return collapsed ? 86 : 268
  }, [collapsed, isMobile])

  if (loading) {
    return (
      <div style={loadingScreen}>
        <div style={spinner}></div>
        <p style={{ marginTop: 20, fontSize: 16, color: "#6b7280" }}>Chargement de la session...</p>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  function renderPage() {
    switch (activePage) {
      case "dashboard":
        return <DashboardCentral />
      case "centres":
        return <Centres />
      case "producteurs":
        return <Producteurs />
      case "achats":
        return <Achats />
      case "parametres":
        return <Parametres onOpenAdminUsers={() => setActivePage("admin-users")} isAdmin={isAdmin} />
      case "profile":
        return <Profile />
      case "admin-users":
        return isAdmin ? <AdminUsers /> : <DashboardCentral />
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
                  Connecté en tant que {displayName} ({role})
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
