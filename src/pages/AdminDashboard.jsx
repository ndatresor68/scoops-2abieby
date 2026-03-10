import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import {
  FaChartLine,
  FaUsers,
  FaBuilding,
  FaUserTie,
  FaCog,
  FaShieldAlt,
  FaUserFriends,
  FaHistory,
  FaBars,
  FaTimes,
} from "react-icons/fa"
import AdminStats from "./admin/AdminStats"
import AdminUsers from "./admin/AdminUsers"
import AdminCentres from "./admin/AdminCentres"
import AdminProducteurs from "./admin/AdminProducteurs"
import AdminSettings from "./admin/AdminSettings"
import AdminAgents from "./admin/AdminAgents"
import AdminActivities from "./admin/AdminActivities"
import { useMediaQuery } from "../hooks/useMediaQuery"

const SECTIONS = {
  stats: { id: "stats", label: "Tableau de bord", icon: FaChartLine },
  users: { id: "users", label: "Utilisateurs", icon: FaUsers },
  agents: { id: "agents", label: "Agents", icon: FaUserFriends },
  centres: { id: "centres", label: "Centres", icon: FaBuilding },
  producteurs: { id: "producteurs", label: "Producteurs", icon: FaUserTie },
  activites: { id: "activites", label: "Activités", icon: FaHistory },
  settings: { id: "settings", label: "Paramètres", icon: FaCog },
}

export default function AdminDashboard() {
  const { isAdmin, role, loading: authLoading } = useAuth()
  const [activeSection, setActiveSection] = useState("stats")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobile = useMediaQuery("(max-width: 1024px)")

  useEffect(() => {
    // Close sidebar when switching sections on mobile
    if (!isMobile) {
      setSidebarOpen(false)
    }
  }, [activeSection, isMobile])

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      // Component will show restricted message
    }
  }, [isAdmin, authLoading])

  if (authLoading) {
    return (
      <div style={loadingContainer}>
        <div style={spinner}></div>
        <p style={loadingText}>Chargement...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div style={restrictedContainer}>
        <FaShieldAlt size={48} style={{ color: "#dc2626", marginBottom: 16 }} />
        <h2 style={restrictedTitle}>Accès Restreint</h2>
        <p style={restrictedText}>
          Cette section est réservée aux administrateurs.
        </p>
        <p style={restrictedSubtext}>
          Votre rôle actuel: <strong>{role}</strong>
        </p>
        <p style={restrictedSubtext}>
          Redirection vers le tableau de bord...
        </p>
      </div>
    )
  }

  function renderSection() {
    switch (activeSection) {
      case "stats":
        return <AdminStats />
      case "users":
        return <AdminUsers />
      case "agents":
        return <AdminAgents />
      case "centres":
        return <AdminCentres />
      case "producteurs":
        return <AdminProducteurs />
      case "activites":
        return <AdminActivities />
      case "settings":
        return <AdminSettings />
      default:
        return <AdminStats />
    }
  }

  const activeSectionData = SECTIONS[activeSection] || SECTIONS.stats

  return (
    <div style={container}>
      {/* Mobile Header */}
      {isMobile && (
        <div style={mobileHeader}>
          <button
            style={menuButton}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div style={mobileHeaderContent}>
            <FaShieldAlt size={20} style={{ color: "#7a1f1f" }} />
            <h1 style={mobileTitle}>Administration</h1>
          </div>
        </div>
      )}

      <div style={layout}>
        {/* Sidebar */}
        <aside
          style={{
            ...sidebar,
            ...(isMobile
              ? {
                  ...mobileSidebar,
                  transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
                }
              : {}),
          }}
        >
          <div style={sidebarHeader}>
            {!isMobile && (
              <>
                <FaShieldAlt size={24} style={{ color: "#7a1f1f" }} />
                <div>
                  <h2 style={sidebarTitle}>Administration</h2>
                  <p style={sidebarSubtitle}>Gestion du système</p>
                </div>
              </>
            )}
          </div>

          <nav style={nav}>
            {Object.values(SECTIONS).map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id)
                    if (isMobile) setSidebarOpen(false)
                  }}
                  style={{
                    ...navItem,
                    ...(isActive ? activeNavItem : {}),
                  }}
                >
                  <Icon size={18} />
                  <span>{section.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main style={main}>
          {!isMobile && (
            <div style={header}>
              <div style={headerLeft}>
                <activeSectionData.icon size={24} style={{ color: "#7a1f1f" }} />
                <div>
                  <h1 style={title}>{activeSectionData.label}</h1>
                  <p style={subtitle}>Gestion complète du système coopératif</p>
                </div>
              </div>
            </div>
          )}

          <div style={content}>
            {renderSection()}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div style={overlay} onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}

const container = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  background: "#f9fafb",
}

const layout = {
  display: "flex",
  flex: 1,
  position: "relative",
}

const sidebar = {
  width: "280px",
  background: "white",
  borderRight: "1px solid #e5e7eb",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  zIndex: 100,
}

const mobileSidebar = {
  position: "fixed",
  top: 0,
  left: 0,
  height: "100vh",
  boxShadow: "4px 0 20px rgba(0,0,0,0.1)",
  transition: "transform 0.3s ease",
  zIndex: 1000,
}

const sidebarHeader = {
  padding: "24px 20px",
  borderBottom: "1px solid #e5e7eb",
  display: "flex",
  alignItems: "center",
  gap: 12,
}

const sidebarTitle = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 700,
  color: "#111827",
}

const sidebarSubtitle = {
  margin: "4px 0 0 0",
  fontSize: "12px",
  color: "#6b7280",
}

const nav = {
  display: "flex",
  flexDirection: "column",
  padding: "12px",
  gap: 4,
  flex: 1,
  overflowY: "auto",
}

const navItem = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  border: "none",
  background: "transparent",
  color: "#6b7280",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  borderRadius: "8px",
  transition: "all 0.2s ease",
  textAlign: "left",
  width: "100%",
}

const activeNavItem = {
  background: "#fef2f2",
  color: "#7a1f1f",
  fontWeight: 600,
}

const main = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
}

const header = {
  background: "white",
  padding: "24px 32px",
  borderBottom: "1px solid #e5e7eb",
}

const headerLeft = {
  display: "flex",
  alignItems: "center",
  gap: 16,
}

const title = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 700,
  color: "#111827",
  letterSpacing: "-0.025em",
}

const subtitle = {
  margin: "4px 0 0 0",
  fontSize: "14px",
  color: "#6b7280",
}

const mobileHeader = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "16px",
  background: "white",
  borderBottom: "1px solid #e5e7eb",
  position: "sticky",
  top: 0,
  zIndex: 100,
}

const menuButton = {
  border: "none",
  background: "transparent",
  fontSize: "20px",
  color: "#374151",
  cursor: "pointer",
  padding: "8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "6px",
}

const mobileHeaderContent = {
  display: "flex",
  alignItems: "center",
  gap: 12,
}

const mobileTitle = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 700,
  color: "#111827",
}

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  zIndex: 999,
}

const content = {
  flex: 1,
  padding: "24px 32px",
  overflowY: "auto",
  background: "#f9fafb",
}

// Mobile content padding override
const mobileContent = {
  padding: "16px",
}

const loadingContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "400px",
  gap: 16,
}

const spinner = {
  width: "40px",
  height: "40px",
  border: "4px solid #e5e7eb",
  borderTopColor: "#7a1f1f",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
}

const loadingText = {
  color: "#6b7280",
  fontSize: "14px",
}

const restrictedContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "400px",
  padding: "40px",
  textAlign: "center",
}

const restrictedTitle = {
  margin: "16px 0 8px 0",
  fontSize: "24px",
  fontWeight: 700,
  color: "#111827",
}

const restrictedText = {
  margin: "0 0 8px 0",
  fontSize: "16px",
  color: "#6b7280",
}

const restrictedSubtext = {
  margin: "4px 0",
  fontSize: "14px",
  color: "#9ca3af",
}
