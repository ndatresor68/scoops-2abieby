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
  
  const isMobile = useMediaQuery("(max-width: 768px)")
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)")
  
  const cooperativeName = settings?.cooperative_name || "SCOOP ASAB-COOP-CA"
  const cooperativeLogo = settings?.logo_url || logoImage
  
  const userAvatar = user?.avatar_url || null
  const userInitials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "A"

  // Close sidebar on mobile when section changes
  useEffect(() => {
    if (isMobile && activeSection) {
      setSidebarOpen(false)
    }
  }, [activeSection, isMobile])

  // Close sidebar on desktop resize
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(false)
    }
  }, [isMobile])

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

  if (authLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Chargement...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div style={styles.restrictedContainer}>
        <FaShieldAlt size={48} style={{ color: "#dc2626", marginBottom: 16 }} />
        <h2 style={styles.restrictedTitle}>Accès Restreint</h2>
        <p style={styles.restrictedText}>
          Cette section est réservée aux administrateurs.
        </p>
        <p style={styles.restrictedSubtext}>
          Votre rôle actuel: <strong>{role}</strong>
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

  return (
    <div style={styles.appContainer}>
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Top Navigation Bar */}
      <header style={styles.topNav}>
        <div style={styles.topNavLeft}>
          <button
            style={styles.menuButton}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
        </div>

        <div style={styles.topNavRight}>
          {/* Notifications */}
          <div style={styles.notificationWrapper}>
            <button
              style={styles.iconButton}
              onClick={() => {
                setNotificationsOpen(!notificationsOpen)
                setUserMenuOpen(false)
              }}
              aria-label="Notifications"
            >
              <FaBell size={18} />
              {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
            </button>
            {notificationsOpen && (
              <div style={styles.notificationPanel}>
                <div style={styles.notificationPanelHeader}>
                  <FaBell size={16} />
                  <span style={styles.notificationPanelTitle}>Notifications</span>
                  {unreadCount > 0 && (
                    <span style={styles.notificationPanelBadge}>{unreadCount} non lues</span>
                  )}
                </div>
                <div style={styles.notificationPanelList}>
                  {notifications.length === 0 ? (
                    <div style={styles.notificationEmpty}>
                      <FaBell size={24} style={{ color: "#cbd5e1", marginBottom: 8 }} />
                      <p style={styles.notificationEmptyText}>Aucune notification</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        style={{
                          ...styles.notificationItem,
                          ...(!notification.read ? styles.notificationItemUnread : {}),
                        }}
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <div style={styles.notificationItemIcon}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div style={styles.notificationItemContent}>
                          <p style={styles.notificationItemTitle}>{notification.title}</p>
                          <p style={styles.notificationItemMessage}>{notification.message}</p>
                          <p style={styles.notificationItemTime}>{formatTimeAgo(notification.created_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div style={styles.userMenuWrapper}>
            <button
              style={styles.avatarButton}
              onClick={() => {
                setUserMenuOpen(!userMenuOpen)
                setNotificationsOpen(false)
              }}
              aria-label="User menu"
            >
              {userAvatar ? (
                <img src={userAvatar} alt={displayName} style={styles.avatarImage} />
              ) : (
                <div style={styles.avatarInitials}>{userInitials}</div>
              )}
            </button>
            {userMenuOpen && (
              <div style={styles.userMenuPanel}>
                <div style={styles.userMenuHeader}>
                  <div style={styles.userMenuAvatar}>
                    {userAvatar ? (
                      <img src={userAvatar} alt={displayName} style={styles.avatarImageSmall} />
                    ) : (
                      <div style={styles.avatarInitialsSmall}>{userInitials}</div>
                    )}
                  </div>
                  <div style={styles.userMenuInfo}>
                    <p style={styles.userMenuName}>{displayName || user?.email || "Admin"}</p>
                    <p style={styles.userMenuRole}>{role || "ADMIN"}</p>
                  </div>
                </div>
                <div style={styles.userMenuDivider} />
                <button
                  style={styles.userMenuItem}
                  onClick={() => {
                    setUserMenuOpen(false)
                    setActiveSection("settings")
                  }}
                >
                  <FaUserCircle size={16} />
                  <span>Mon Profil</span>
                </button>
                <button
                  style={styles.userMenuItem}
                  onClick={() => {
                    setUserMenuOpen(false)
                    setActiveSection("settings")
                  }}
                >
                  <FaCog size={16} />
                  <span>Paramètres</span>
                </button>
                <button
                  style={styles.userMenuItem}
                  onClick={() => {
                    setUserMenuOpen(false)
                  }}
                >
                  <FaKey size={16} />
                  <span>Changer mot de passe</span>
                </button>
                <div style={styles.userMenuDivider} />
                <button
                  style={styles.userMenuItem}
                  onClick={async () => {
                    await signOut()
                    showToast("Déconnexion réussie", "success")
                  }}
                >
                  <FaSignOutAlt size={16} />
                  <span>Déconnexion</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={styles.layout}>
        {/* Sidebar */}
        <aside
          style={{
            ...styles.sidebar,
            ...(isMobile
              ? {
                  ...styles.sidebarMobile,
                  transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
                }
              : {}),
          }}
        >
          <div style={styles.sidebarHeader}>
            <div style={styles.sidebarLogo}>
              <img
                src={cooperativeLogo}
                alt="Logo"
                style={styles.sidebarLogoImage}
                onError={(e) => {
                  e.target.src = logoImage
                }}
              />
            </div>
            <div style={styles.sidebarBrand}>
              <h2 style={styles.sidebarTitle}>{cooperativeName}</h2>
              <p style={styles.sidebarSubtitle}>Gestion Coopérative</p>
            </div>
          </div>

          <nav style={styles.sidebarNav}>
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
                    ...styles.sidebarNavItem,
                    ...(isActive ? styles.sidebarNavItemActive : {}),
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
        <main style={styles.mainContent}>
          <div style={{
            ...styles.contentArea,
            padding: isMobile ? "16px" : isTablet ? "20px" : "24px",
          }}>
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  )
}

// Modern, clean styles - Mobile-first approach
const styles = {
  appContainer: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    width: "100%",
    maxWidth: "100vw",
    overflow: "hidden",
    background: "#f8fafc",
    position: "relative",
  },

  // Top Navigation
  topNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
    minHeight: "64px",
    boxSizing: "border-box",
  },

  topNavLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  topNavRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  menuButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    border: "none",
    background: "transparent",
    borderRadius: "8px",
    cursor: "pointer",
    color: "#64748b",
    transition: "all 0.2s ease",
  },

  iconButton: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    border: "none",
    background: "transparent",
    borderRadius: "8px",
    cursor: "pointer",
    color: "#64748b",
    transition: "all 0.2s ease",
  },

  badge: {
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
  },

  // Notifications
  notificationWrapper: {
    position: "relative",
  },

  notificationPanel: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: "8px",
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
    width: "360px",
    maxWidth: "calc(100vw - 32px)",
    maxHeight: "480px",
    zIndex: 1001,
    display: "flex",
    flexDirection: "column",
  },

  notificationPanelHeader: {
    padding: "16px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#f9fafb",
  },

  notificationPanelTitle: {
    flex: 1,
    fontSize: "14px",
    fontWeight: 600,
    color: "#0f172a",
  },

  notificationPanelBadge: {
    fontSize: "11px",
    color: "#64748b",
    fontWeight: 500,
  },

  notificationPanelList: {
    maxHeight: "400px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },

  notificationItem: {
    display: "flex",
    gap: "12px",
    padding: "12px 16px",
    borderBottom: "1px solid #f3f4f6",
    cursor: "pointer",
    transition: "background 0.2s ease",
    background: "white",
  },

  notificationItemUnread: {
    background: "#f8fafc",
    borderLeft: "3px solid #3b82f6",
  },

  notificationItemIcon: {
    flexShrink: 0,
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  notificationItemContent: {
    flex: 1,
    minWidth: 0,
  },

  notificationItemTitle: {
    margin: "0 0 4px 0",
    fontSize: "13px",
    fontWeight: 600,
    color: "#0f172a",
    lineHeight: 1.4,
  },

  notificationItemMessage: {
    margin: "0 0 4px 0",
    fontSize: "12px",
    color: "#64748b",
    lineHeight: 1.4,
  },

  notificationItemTime: {
    margin: 0,
    fontSize: "11px",
    color: "#94a3b8",
    fontWeight: 500,
  },

  notificationEmpty: {
    padding: "40px 20px",
    textAlign: "center",
    color: "#94a3b8",
  },

  notificationEmptyText: {
    margin: "8px 0 0 0",
    fontSize: "13px",
    color: "#94a3b8",
  },

  // User Menu
  userMenuWrapper: {
    position: "relative",
  },

  avatarButton: {
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
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    border: "2px solid white",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  avatarInitials: {
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
  },

  userMenuPanel: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: "8px",
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
    minWidth: "240px",
    maxWidth: "calc(100vw - 32px)",
    zIndex: 1001,
  },

  userMenuHeader: {
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
  },

  userMenuAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },

  avatarImageSmall: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  avatarInitialsSmall: {
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
  },

  userMenuInfo: {
    flex: 1,
    minWidth: 0,
  },

  userMenuName: {
    margin: "0 0 2px 0",
    fontSize: "14px",
    fontWeight: 600,
    color: "#0f172a",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  userMenuRole: {
    margin: 0,
    fontSize: "12px",
    color: "#64748b",
    fontWeight: 500,
  },

  userMenuDivider: {
    height: "1px",
    background: "#e5e7eb",
    margin: "4px 0",
  },

  userMenuItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
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
  },

  // Layout
  layout: {
    display: "flex",
    flex: 1,
    position: "relative",
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
    minWidth: 0,
  },

  // Sidebar
  sidebar: {
    width: "280px",
    background: "#ffffff",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    zIndex: 100,
    flexShrink: 0,
    overflow: "hidden",
  },

  sidebarMobile: {
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    width: "280px",
    maxWidth: "85vw",
    boxShadow: "4px 0 24px rgba(0, 0, 0, 0.15)",
    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    zIndex: 1000,
    overflowY: "auto",
    overflowX: "hidden",
  },

  sidebarHeader: {
    padding: "24px 20px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    background: "linear-gradient(135deg, #7a1f1f 0%, #b02a2a 100%)",
    minHeight: "100px",
    flexShrink: 0,
  },

  sidebarLogo: {
    width: "56px",
    height: "56px",
    borderRadius: "12px",
    overflow: "hidden",
    background: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
    border: "2px solid rgba(255, 255, 255, 0.2)",
  },

  sidebarLogoImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  sidebarBrand: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  sidebarTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    color: "white",
    letterSpacing: "0.2px",
    lineHeight: 1.3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  sidebarSubtitle: {
    margin: 0,
    fontSize: "11px",
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: 500,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    lineHeight: 1.4,
  },

  sidebarNav: {
    display: "flex",
    flexDirection: "column",
    padding: "12px",
    gap: "4px",
    flex: 1,
    overflowY: "auto",
  },

  sidebarNavItem: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px 18px",
    border: "none",
    background: "transparent",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    borderRadius: "10px",
    transition: "all 0.2s ease",
    textAlign: "left",
    width: "100%",
  },

  sidebarNavItemActive: {
    background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
    color: "#7a1f1f",
    fontWeight: 600,
    boxShadow: "0 2px 8px rgba(122, 31, 31, 0.12)",
  },

  // Main Content
  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    position: "relative",
  },

  contentArea: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    background: "transparent",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },

  // Overlay
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(2px)",
    zIndex: 999,
    transition: "opacity 0.3s ease",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
  },

  // Loading & Restricted
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
    gap: 16,
  },

  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e5e7eb",
    borderTopColor: "#7a1f1f",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },

  loadingText: {
    color: "#6b7280",
    fontSize: "14px",
  },

  restrictedContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
    padding: "40px",
    textAlign: "center",
  },

  restrictedTitle: {
    margin: "16px 0 8px 0",
    fontSize: "24px",
    fontWeight: 700,
    color: "#111827",
  },

  restrictedText: {
    margin: "0 0 8px 0",
    fontSize: "16px",
    color: "#6b7280",
  },

  restrictedSubtext: {
    margin: "4px 0",
    fontSize: "14px",
    color: "#9ca3af",
  },
}
