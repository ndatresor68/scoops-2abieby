import React, { useEffect, useState } from "react"
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
  FaMapMarkerAlt,
  FaSignOutAlt,
  FaUserCircle,
  FaBell,
  FaKey,
  FaSeedling,
  FaWeightHanging,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
} from "react-icons/fa"
import AdminStats from "./admin/AdminStats"
import AdminUsers from "./admin/AdminUsers"
import AdminCentres from "./admin/AdminCentres"
import AdminProducteurs from "./admin/AdminProducteurs"
import AdminSettings from "./admin/AdminSettings"
import AdminAgents from "./admin/AdminAgents"
import AdminActivities from "./admin/AdminActivities"
import AdminParcelles from "./admin/AdminParcelles"
import { useMediaQuery } from "../hooks/useMediaQuery"
import { useToast } from "../components/ui/Toast"
import { useSettings } from "../context/SettingsContext"
import { getUserNotifications, markNotificationAsRead, subscribeToNotifications } from "../utils/notifications"
import { supabase } from "../supabaseClient"
import logoImage from "../assets/logo-scoops.png"

const SECTIONS = {
  stats: { id: "stats", label: "Tableau de bord", icon: FaChartLine },
  users: { id: "users", label: "Utilisateurs", icon: FaUsers },
  agents: { id: "agents", label: "Agents", icon: FaUserFriends },
  centres: { id: "centres", label: "Centres", icon: FaBuilding },
  producteurs: { id: "producteurs", label: "Producteurs", icon: FaUserTie },
  parcelles: { id: "parcelles", label: "Parcelles", icon: FaMapMarkerAlt },
  activites: { id: "activites", label: "Activités", icon: FaHistory },
  settings: { id: "settings", label: "Paramètres", icon: FaCog },
}

export default function AdminDashboard() {
  const { isAdmin, role, loading: authLoading, user, displayName, signOut } = useAuth()
  const { showToast } = useToast()
  const { settings } = useSettings()
  const [activeSection, setActiveSection] = useState("stats")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const isMobile = useMediaQuery("(max-width: 1024px)")
  
  // Get cooperative info from settings (for sidebar only)
  const cooperativeName = settings?.cooperative_name || "SCOOP ASAB-COOP-CA"
  const cooperativeLogo = settings?.logo_url || logoImage
  
  // Get user avatar
  const userAvatar = user?.avatar_url || null
  const userInitials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "A"

  useEffect(() => {
    // Close sidebar when switching sections on mobile
    if (!isMobile) {
      setSidebarOpen(false)
    }
  }, [activeSection, isMobile])

  // Load notifications
  useEffect(() => {
    if (!user?.id) return

    async function loadNotifications() {
      try {
        const notifs = await getUserNotifications(user.id, 20)
        setNotifications(notifs)
        setUnreadCount(notifs.filter((n) => !n.read).length)
      } catch (error) {
        console.error("[AdminDashboard] Error loading notifications:", error)
      }
    }

    loadNotifications()

    // Subscribe to real-time notifications
    let unsubscribe
    try {
      unsubscribe = subscribeToNotifications(user.id, (newNotification) => {
        if (newNotification) {
          setNotifications((prev) => [newNotification, ...prev])
          setUnreadCount((prev) => prev + 1)
          if (newNotification.title) {
            showToast(newNotification.title, "info")
          }
        }
      })
    } catch (error) {
      console.error("[AdminDashboard] Error subscribing to notifications:", error)
    }

    return () => {
      if (unsubscribe && typeof unsubscribe === "function") {
        unsubscribe()
      }
    }
  }, [user?.id, showToast])

  async function handleMarkAsRead(notificationId) {
    try {
      await markNotificationAsRead(notificationId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("[AdminDashboard] Error marking notification as read:", error)
    }
  }

  function getNotificationIcon(type) {
    switch (type) {
      case "success":
        return <FaCheckCircle size={16} style={{ color: "#16a34a" }} />
      case "warning":
        return <FaExclamationTriangle size={16} style={{ color: "#f59e0b" }} />
      case "error":
        return <FaTimesCircle size={16} style={{ color: "#dc2626" }} />
      default:
        return <FaBell size={16} style={{ color: "#3b82f6" }} />
    }
  }

  function formatTimeAgo(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  }

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
      case "parcelles":
        return <AdminParcelles />
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
      {/* Mobile Header - Same as desktop but simplified */}
      {isMobile && (
        <div style={getHeaderStyle(true)}>
          <button
            style={menuToggleButton}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f1f5f9"
              e.currentTarget.style.color = "#334155"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "#64748b"
            }}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
          <div style={headerRight}>
            {/* Notifications */}
            <div style={notificationContainer}>
              <button
                style={notificationButton}
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen)
                  setUserMenuOpen(false)
                }}
                onBlur={() => setTimeout(() => setNotificationsOpen(false), 200)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9"
                  e.currentTarget.style.color = "#334155"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent"
                  e.currentTarget.style.color = "#64748b"
                }}
                aria-label="Notifications"
              >
                <FaBell size={18} />
                {unreadCount > 0 && <span style={notificationBadge}>{unreadCount}</span>}
              </button>
              {notificationsOpen && (
                <div style={notificationDropdown}>
                  <div style={notificationHeader}>
                    <FaBell size={16} />
                    <span style={notificationHeaderText}>Notifications</span>
                    {unreadCount > 0 && (
                      <span style={notificationHeaderBadge}>{unreadCount} non lues</span>
                    )}
          </div>
                  <div style={notificationList}>
                    {notifications.length === 0 ? (
                      <div style={notificationEmpty}>
                        <FaBell size={24} style={{ color: "#cbd5e1", marginBottom: 8 }} />
                        <p style={notificationEmptyText}>Aucune notification</p>
        </div>
                    ) : (
                      notifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification.id}
                          style={{
                            ...notificationItem,
                            ...(!notification.read ? notificationItemUnread : {}),
                          }}
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <div style={notificationIcon}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div style={notificationContent}>
                            <p style={notificationTitle}>{notification.title}</p>
                            <p style={notificationMessage}>{notification.message}</p>
                            <p style={notificationTime}>{formatTimeAgo(notification.created_at)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar */}
            <div style={userMenuContainer}>
              <button
                style={avatarButton}
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen)
                  setNotificationsOpen(false)
                }}
                onBlur={() => setTimeout(() => setUserMenuOpen(false), 200)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)"
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)"
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"
                }}
                aria-label="User menu"
              >
                {userAvatar ? (
                  <img src={userAvatar} alt={displayName} style={avatarImage} />
                ) : (
                  <div style={avatarInitials}>{userInitials}</div>
                )}
              </button>
              {userMenuOpen && (
                <div style={userMenuDropdown}>
                  <div style={userMenuHeader}>
                    <div style={userMenuAvatar}>
                      {userAvatar ? (
                        <img src={userAvatar} alt={displayName} style={avatarImageSmall} />
                      ) : (
                        <div style={avatarInitialsSmall}>{userInitials}</div>
                      )}
                    </div>
                    <div style={userMenuInfo}>
                      <p style={userMenuName}>{displayName || user?.email || "Admin"}</p>
                      <p style={userMenuRole}>{role || "ADMIN"}</p>
                    </div>
                  </div>
                  <div style={userMenuDivider} />
                  <button
                    style={userMenuItem}
                    onClick={() => {
                      setUserMenuOpen(false)
                      setActiveSection("settings")
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <FaUserCircle size={16} />
                    <span>Mon Profil</span>
                  </button>
                  <button
                    style={userMenuItem}
                    onClick={() => {
                      setUserMenuOpen(false)
                      setActiveSection("settings")
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <FaCog size={16} />
                    <span>Paramètres</span>
                  </button>
                  <button
                    style={userMenuItem}
                    onClick={() => {
                      setUserMenuOpen(false)
                      // TODO: Open change password modal
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <FaKey size={16} />
                    <span>Changer mot de passe</span>
                  </button>
                  <div style={userMenuDivider} />
                  <button
                    style={userMenuItem}
                    onClick={async () => {
                      await signOut()
                      showToast("Déconnexion réussie", "success")
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <FaSignOutAlt size={16} />
                    <span>Déconnexion</span>
                  </button>
                </div>
              )}
            </div>
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
            <div style={logoContainer}>
              <img 
                src={cooperativeLogo} 
                alt="Logo" 
                style={logoStyle}
                onError={(e) => {
                  // Fallback to default logo if image fails to load
                  e.target.src = logoImage
                }}
              />
                </div>
            <div style={brandInfo}>
              <h2 style={sidebarTitle}>{cooperativeName}</h2>
              <p style={sidebarSubtitle}>Gestion Coopérative</p>
                </div>
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
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(122, 31, 31, 0.05)"
                      e.currentTarget.style.color = "#7a1f1f"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent"
                      e.currentTarget.style.color = "#64748b"
                    }
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
          {/* Header */}
          <div style={getHeaderStyle(isMobile)}>
            {/* Left: Menu Toggle */}
            <button
              style={menuToggleButton}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f1f5f9"
                e.currentTarget.style.color = "#334155"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = "#64748b"
              }}
              aria-label="Toggle menu"
            >
              <FaBars size={20} />
            </button>

            {/* Right: Notifications & User */}
            <div style={headerRight}>
              {/* Notifications */}
              <div style={notificationContainer}>
                <button
                  style={notificationButton}
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen)
                    setUserMenuOpen(false)
                  }}
                  onBlur={() => setTimeout(() => setNotificationsOpen(false), 200)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9"
                    e.currentTarget.style.color = "#334155"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent"
                    e.currentTarget.style.color = "#64748b"
                  }}
                  aria-label="Notifications"
                >
                  <FaBell size={18} />
                  {unreadCount > 0 && <span style={notificationBadge}>{unreadCount}</span>}
                </button>
                {notificationsOpen && (
                  <div style={notificationDropdown}>
                    <div style={notificationHeader}>
                      <FaBell size={16} />
                      <span style={notificationHeaderText}>Notifications</span>
                      {unreadCount > 0 && (
                        <span style={notificationHeaderBadge}>{unreadCount} non lues</span>
                      )}
                </div>
                    <div style={notificationList}>
                      {notifications.length === 0 ? (
                        <div style={notificationEmpty}>
                          <FaBell size={24} style={{ color: "#cbd5e1", marginBottom: 8 }} />
                          <p style={notificationEmptyText}>Aucune notification</p>
              </div>
                      ) : (
                        notifications.slice(0, 10).map((notification) => (
                          <div
                            key={notification.id}
                            style={{
                              ...notificationItem,
                              ...(!notification.read ? notificationItemUnread : {}),
                            }}
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <div style={notificationIcon}>
                              {getNotificationIcon(notification.type)}
            </div>
                            <div style={notificationContent}>
                              <p style={notificationTitle}>{notification.title}</p>
                              <p style={notificationMessage}>{notification.message}</p>
                              <p style={notificationTime}>{formatTimeAgo(notification.created_at)}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar */}
              <div style={userMenuContainer}>
                <button
                  style={avatarButton}
                  onClick={() => {
                    setUserMenuOpen(!userMenuOpen)
                    setNotificationsOpen(false)
                  }}
                  onBlur={() => setTimeout(() => setUserMenuOpen(false), 200)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.05)"
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)"
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"
                  }}
                  aria-label="User menu"
                >
                  {userAvatar ? (
                    <img src={userAvatar} alt={displayName} style={avatarImage} />
                  ) : (
                    <div style={avatarInitials}>{userInitials}</div>
                  )}
                </button>
                {userMenuOpen && (
                  <div style={userMenuDropdown}>
                    <div style={userMenuHeader}>
                      <div style={userMenuAvatar}>
                        {userAvatar ? (
                          <img src={userAvatar} alt={displayName} style={avatarImageSmall} />
                        ) : (
                          <div style={avatarInitialsSmall}>{userInitials}</div>
                        )}
                      </div>
                      <div style={userMenuInfo}>
                        <p style={userMenuName}>{displayName || user?.email || "Admin"}</p>
                        <p style={userMenuRole}>{role || "ADMIN"}</p>
                      </div>
                    </div>
                    <div style={userMenuDivider} />
                    <button
                      style={userMenuItem}
                      onClick={() => {
                        setUserMenuOpen(false)
                        setActiveSection("settings")
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <FaUserCircle size={16} />
                      <span>Mon Profil</span>
                    </button>
                    <button
                      style={userMenuItem}
                      onClick={() => {
                        setUserMenuOpen(false)
                        setActiveSection("settings")
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <FaCog size={16} />
                      <span>Paramètres</span>
                    </button>
                    <button
                      style={userMenuItem}
                      onClick={() => {
                        setUserMenuOpen(false)
                        // TODO: Open change password modal
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <FaKey size={16} />
                      <span>Changer mot de passe</span>
                    </button>
                    <div style={userMenuDivider} />
                    <button
                      style={userMenuItem}
                      onClick={async () => {
                        await signOut()
                        showToast("Déconnexion réussie", "success")
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <FaSignOutAlt size={16} />
                      <span>Déconnexion</span>
                    </button>
                </div>
                )}
              </div>
            </div>
          </div>

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
  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
}

const layout = {
  display: "flex",
  flex: 1,
  position: "relative",
}

const sidebar = {
  width: "280px",
  background: "linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)",
  borderRight: "1px solid rgba(0,0,0,0.06)",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  zIndex: 100,
  boxShadow: "2px 0 24px rgba(0,0,0,0.04)",
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
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  display: "flex",
  alignItems: "center",
  gap: 14,
  background: "linear-gradient(135deg, #7a1f1f 0%, #b02a2a 100%)",
  minHeight: "100px",
  flexShrink: 0,
}

const logoContainer = {
  width: "56px",
  height: "56px",
  borderRadius: "12px",
  overflow: "hidden",
  background: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
  border: "2px solid rgba(255,255,255,0.2)",
}

const logoStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
}

const brandInfo = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
}

const sidebarTitle = {
  margin: 0,
  fontSize: "16px",
  fontWeight: 700,
  color: "white",
  letterSpacing: "0.2px",
  lineHeight: 1.3,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

const sidebarSubtitle = {
  margin: 0,
  fontSize: "11px",
  color: "rgba(255,255,255,0.9)",
  fontWeight: 500,
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  lineHeight: 1.4,
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
  gap: 14,
  padding: "14px 18px",
  border: "none",
  background: "transparent",
  color: "#64748b",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  borderRadius: "10px",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  textAlign: "left",
  width: "100%",
  position: "relative",
}

const activeNavItem = {
  background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
  color: "#7a1f1f",
  fontWeight: 600,
  boxShadow: "0 2px 8px rgba(122, 31, 31, 0.12)",
  transform: "translateX(2px)",
}

const main = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
}

// Note: header style is defined inline below to access isMobile
const getHeaderStyle = (isMobile) => ({
  background: "rgba(255,255,255,0.95)",
  backdropFilter: "blur(12px)",
  padding: isMobile ? "12px 16px" : "16px 24px",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  position: "sticky",
  top: 0,
  zIndex: 1000,
  minHeight: "64px",
})

const menuToggleButton = {
  border: "none",
  background: "transparent",
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#64748b",
  transition: "all 0.2s ease",
  flexShrink: 0,
}

// Add hover effect via inline style in JSX
const menuToggleButtonHover = {
  background: "#f1f5f9",
  color: "#334155",
}

const headerRight = {
  display: "flex",
  alignItems: "center",
  gap: 12,
}

// Notification styles
const notificationContainer = {
  position: "relative",
}

const notificationButton = {
  position: "relative",
  border: "none",
  background: "transparent",
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#64748b",
  transition: "all 0.2s ease",
  flexShrink: 0,
}

const notificationBadge = {
  position: "absolute",
  top: "6px",
  right: "6px",
  background: "#dc2626",
  color: "white",
  fontSize: "10px",
  fontWeight: 700,
  borderRadius: "10px",
  minWidth: "18px",
  height: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 4px",
  boxShadow: "0 2px 4px rgba(220, 38, 38, 0.3)",
}

const notificationDropdown = {
  position: "absolute",
  top: "100%",
  right: 0,
  marginTop: "8px",
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  border: "1px solid rgba(0,0,0,0.08)",
  overflow: "hidden",
  width: "360px",
  maxWidth: "calc(100vw - 32px)",
  maxHeight: "480px",
  zIndex: 1001,
  display: "flex",
  flexDirection: "column",
}

const notificationHeader = {
  padding: "16px",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#f9fafb",
}

const notificationHeaderText = {
  flex: 1,
  fontSize: "14px",
  fontWeight: 600,
  color: "#0f172a",
}

const notificationHeaderBadge = {
  fontSize: "11px",
  color: "#64748b",
  fontWeight: 500,
}

const notificationList = {
  maxHeight: "400px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
}

const notificationItem = {
  display: "flex",
  gap: 12,
  padding: "12px 16px",
  borderBottom: "1px solid rgba(0,0,0,0.04)",
  cursor: "pointer",
  transition: "background 0.2s ease",
  background: "white",
}

const notificationItemUnread = {
  background: "#f8fafc",
  borderLeft: "3px solid #3b82f6",
}

const notificationIcon = {
  flexShrink: 0,
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  background: "#f1f5f9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const notificationContent = {
  flex: 1,
  minWidth: 0,
}

const notificationTitle = {
  margin: "0 0 4px 0",
  fontSize: "13px",
  fontWeight: 600,
  color: "#0f172a",
  lineHeight: 1.4,
}

const notificationMessage = {
  margin: "0 0 4px 0",
  fontSize: "12px",
  color: "#64748b",
  lineHeight: 1.4,
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
}

const notificationTime = {
  margin: 0,
  fontSize: "11px",
  color: "#94a3b8",
  fontWeight: 500,
}

const notificationEmpty = {
  padding: "40px 20px",
  textAlign: "center",
  color: "#94a3b8",
}

const notificationEmptyText = {
  margin: "8px 0 0 0",
  fontSize: "13px",
  color: "#94a3b8",
}

const title = {
  margin: 0,
  fontSize: "28px",
  fontWeight: 700,
  color: "#0f172a",
  letterSpacing: "-0.03em",
  lineHeight: 1.2,
}

const subtitle = {
  margin: "6px 0 0 0",
  fontSize: "14px",
  color: "#64748b",
  fontWeight: 500,
}

const userMenuContainer = {
  position: "relative",
}

const userMenuButton = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 16px",
  background: "white",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 500,
  color: "#334155",
  transition: "all 0.2s ease",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
}

const userMenuText = {
  maxWidth: "150px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

const userMenuDropdown = {
  position: "absolute",
  top: "100%",
  right: 0,
  marginTop: "8px",
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  border: "1px solid rgba(0,0,0,0.08)",
  overflow: "hidden",
  minWidth: "240px",
  zIndex: 1001,
}

const userMenuHeader = {
  padding: "16px",
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "#f9fafb",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
}

const userMenuAvatar = {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  overflow: "hidden",
  flexShrink: 0,
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
}

const avatarImageSmall = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
}

const avatarInitialsSmall = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #7a1f1f 0%, #b02a2a 100%)",
  color: "white",
  fontSize: "16px",
  fontWeight: 700,
  letterSpacing: "0.5px",
}

const userMenuInfo = {
  flex: 1,
  minWidth: 0,
}

const userMenuName = {
  margin: "0 0 2px 0",
  fontSize: "14px",
  fontWeight: 600,
  color: "#0f172a",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

const userMenuRole = {
  margin: 0,
  fontSize: "12px",
  color: "#64748b",
  fontWeight: 500,
}

const userMenuDivider = {
  height: "1px",
  background: "rgba(0,0,0,0.06)",
  margin: "4px 0",
}

const avatarButton = {
  border: "none",
  background: "transparent",
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  cursor: "pointer",
  padding: 0,
  overflow: "hidden",
  transition: "all 0.2s ease",
  flexShrink: 0,
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  border: "2px solid white",
}

const avatarImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
}

const avatarInitials = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #7a1f1f 0%, #b02a2a 100%)",
  color: "white",
  fontSize: "14px",
  fontWeight: 700,
  letterSpacing: "0.5px",
}

const userMenuItem = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  border: "none",
  background: "transparent",
  color: "#334155",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  width: "100%",
  textAlign: "left",
  transition: "background 0.2s ease",
}

// Add hover effect for user menu items
const userMenuItemHover = {
  background: "#f8fafc",
}

const mobileHeader = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "16px 20px",
  background: "rgba(255,255,255,0.95)",
  backdropFilter: "blur(12px)",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  position: "sticky",
  top: 0,
  zIndex: 100,
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
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
  flex: 1,
  minWidth: 0,
}

const mobileLogoContainer = {
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  overflow: "hidden",
  background: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  border: "1px solid rgba(0,0,0,0.08)",
}

const mobileLogoStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
}

const mobileBrandInfo = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 2,
}

const mobileTitle = {
  margin: 0,
  fontSize: "16px",
  fontWeight: 700,
  color: "#0f172a",
  letterSpacing: "-0.01em",
  lineHeight: 1.2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

const mobileSubtitle = {
  margin: 0,
  fontSize: "10px",
  color: "#64748b",
  fontWeight: 500,
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  lineHeight: 1.2,
}

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  zIndex: 999,
}

const content = {
  flex: 1,
  padding: "32px",
  overflowY: "auto",
  background: "transparent",
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
