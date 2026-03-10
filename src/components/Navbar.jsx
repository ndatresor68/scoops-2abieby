import {
  FaChartLine,
  FaCog,
  FaStore,
  FaUserShield,
  FaUsers,
  FaWeightHanging,
  FaTimes,
} from "react-icons/fa"
import logoImage from "../assets/logo-scoops.png"

const BASE_MODULES = [
  { id: "dashboard", label: "Dashboard", icon: FaChartLine },
  { id: "centres", label: "Centres", icon: FaStore },
  { id: "producteurs", label: "Producteurs", icon: FaUsers },
  { id: "achats", label: "Achats", icon: FaWeightHanging },
  { id: "parametres", label: "Paramètres", icon: FaCog },
]

const ADMIN_MODULE = { id: "admin", label: "Administration", icon: FaUserShield }

export default function Navbar({
  activePage,
  onNavigate,
  collapsed,
  mobileOpen,
  onCloseMobile,
  isMobile,
  isAdmin,
}) {
  const modules = isAdmin
    ? [...BASE_MODULES, ADMIN_MODULE]
    : BASE_MODULES

  return (
    <>
      {isMobile && mobileOpen && <div style={overlay} onClick={onCloseMobile} />}

      <aside
        style={{
          ...sidebar,
          width: collapsed && !isMobile ? 86 : 268,
          transform: isMobile ? (mobileOpen ? "translateX(0)" : "translateX(-100%)") : "none",
        }}
      >
        <div style={brandRow}>
          {(!collapsed || isMobile) && (
            <div style={brandContainer}>
              <div style={brandLogo}>
                <img 
                  src={logoImage} 
                  alt="SCOOP ASAB Logo" 
                  style={logoImageStyle}
                />
              </div>
              <div>
                <h2 style={brandTitle}>SCOOP ASAB</h2>
                <p style={brandSubtitle}>Gestion Coopérative</p>
              </div>
            </div>
          )}
          {isMobile && (
            <button style={closeMobileBtn} onClick={onCloseMobile}>
              <FaTimes />
            </button>
          )}
        </div>

        <nav style={navStyle}>
          {modules.map((module) => {
            const Icon = module.icon
            const active = activePage === module.id
            return (
              <button
                key={module.id}
                style={{
                  ...itemBtn,
                  ...(active ? itemBtnActive : {}),
                }}
                onClick={() => {
                  onNavigate(module.id)
                  onCloseMobile?.()
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                  }
                }}
              >
                <Icon style={{ fontSize: 20, minWidth: 24 }} />
                {(!collapsed || isMobile) && <span>{module.label}</span>}
              </button>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

const sidebar = {
  position: "fixed",
  left: 0,
  top: 0,
  bottom: 0,
  background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
  color: "#fff",
  padding: "24px 16px",
  boxSizing: "border-box",
  zIndex: 1300,
  transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  display: "flex",
  flexDirection: "column",
  boxShadow: "4px 0 24px rgba(0,0,0,0.12)",
}

const brandRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 12px",
  marginBottom: 8,
}

const brandContainer = {
  display: "flex",
  alignItems: "center",
  gap: 12,
}

const brandLogo = {
  width: 48,
  height: 48,
  borderRadius: "12px",
  background: "linear-gradient(135deg, #7a1f1f, #b02a2a)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  fontWeight: 800,
  color: "white",
  boxShadow: "0 4px 12px rgba(122, 31, 31, 0.4)",
  overflow: "hidden",
  flexShrink: 0,
}

const logoImageStyle = {
  width: "40px",
  height: "40px",
  objectFit: "contain",
  display: "block",
}

const brandTitle = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 700,
  letterSpacing: "0.5px",
  color: "white",
}

const brandSubtitle = {
  margin: 0,
  fontSize: "11px",
  color: "rgba(255,255,255,0.7)",
  fontWeight: 500,
  marginTop: 2,
}

const closeMobileBtn = {
  border: "none",
  background: "rgba(255,255,255,0.1)",
  color: "white",
  cursor: "pointer",
  fontSize: 20,
  width: 36,
  height: 36,
  borderRadius: "8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
}

const navStyle = {
  marginTop: 8,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  flex: 1,
}

const itemBtn = {
  border: "none",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.05)",
  color: "rgba(255,255,255,0.9)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "14px 16px",
  fontWeight: 600,
  textAlign: "left",
  fontSize: "14px",
  transition: "all 0.2s ease",
}

const itemBtnActive = {
  background: "linear-gradient(135deg, #7a1f1f, #b02a2a)",
  color: "white",
  boxShadow: "0 4px 16px rgba(122, 31, 31, 0.4)",
  transform: "translateX(2px)",
}

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  zIndex: 1200,
  backdropFilter: "blur(4px)",
}
