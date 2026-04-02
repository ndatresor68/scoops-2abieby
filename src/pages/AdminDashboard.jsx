import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "../context/AuthContext"
import {
  FaBars,
  FaBell,
  FaBriefcase,
  FaBuilding,
  FaChartLine,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaComments,
  FaCog,
  FaEdit,
  FaExclamationTriangle,
  FaFlag,
  FaHistory,
  FaIdBadge,
  FaKey,
  FaMapMarkerAlt,
  FaMoon,
  FaPaperPlane,
  FaSearch,
  FaShieldAlt,
  FaSignOutAlt,
  FaSun,
  FaTimesCircle,
  FaUserCircle,
  FaUserFriends,
  FaUserTie,
  FaUsers,
  FaWeightHanging,
} from "react-icons/fa"
import { useMediaQuery } from "../hooks/useMediaQuery"
import { useToast } from "../components/ui/Toast"
import { useSettings } from "../context/SettingsContext"
import { ADMIN_TOKENS, getAdminThemeVars } from "../components/ui/AdminPage"
import { ErrorBoundary } from "../components/ErrorBoundary"
import {
  getUserNotifications,
  markNotificationAsRead,
  subscribeToNotifications,
} from "../utils/notifications"
import { logAppActivity } from "../utils/activityLogger"
import logoImage from "../assets/logo-scoops.png"

const AdminAgents = lazy(() => import("./admin/AdminAgents"))
const AdminActivities = lazy(() => import("./admin/AdminActivities"))
const AdminCentres = lazy(() => import("./admin/AdminCentres"))
const AdminNotifications = lazy(() => import("./admin/AdminNotifications"))
const Campagnes = lazy(() => import("./admin/Campagnes"))
const AdminOpportunities = lazy(() => import("./admin/Opportunities"))
const AdminParcelles = lazy(() => import("./admin/AdminParcelles"))
const AdminPesees = lazy(() => import("./admin/AdminPesees"))
const AdminProducteurs = lazy(() => import("./admin/AdminProducteurs"))
const AdminSettings = lazy(() => import("./admin/AdminSettings"))
const AdminStats = lazy(() => import("./admin/AdminStats"))
const AdminUsers = lazy(() => import("./admin/AdminUsers"))
const Chat = lazy(() => import("./Chat"))
const Profile = lazy(() => import("./Profile"))
const EmployesPage = lazy(() => import("../modules/employes/EmployesPage"))

const SECTIONS = {
  stats: { id: "stats", label: "Tableau de bord", icon: FaChartLine },
  chat: { id: "chat", label: "Chat", icon: FaComments },
  opportunities: { id: "opportunities", label: "Appels d'offres", icon: FaBriefcase },
  activites: { id: "activites", label: "Activités", icon: FaHistory },
  users: { id: "users", label: "Utilisateurs", icon: FaUsers },
  agents: { id: "agents", label: "Agents", icon: FaUserFriends },
  centres: { id: "centres", label: "Centres", icon: FaBuilding },
  producteurs: { id: "producteurs", label: "Producteurs", icon: FaUserTie },
  employes: { id: "employes", label: "Personnel", icon: FaIdBadge },
  campagnes: { id: "campagnes", label: "Campagnes", icon: FaFlag },
  pesees: { id: "pesees", label: "Pesées", icon: FaWeightHanging },
  parcelles: { id: "parcelles", label: "Parcelles", icon: FaMapMarkerAlt },
  notifications: { id: "notifications", label: "Notifications", icon: FaPaperPlane },
  settings: { id: "settings", label: "Paramètres", icon: FaCog },
}

const SECTION_PATHS = {
  stats: "/admin",
  chat: "/admin/chat",
  opportunities: "/admin/opportunities",
  users: "/admin/users",
  agents: "/admin/agents",
  centres: "/admin/centres",
  producteurs: "/admin/producteurs",
  employes: "/admin/employes",
  campagnes: "/admin/campagnes",
  pesees: "/admin/pesees",
  parcelles: "/admin/parcelles",
  activites: "/admin/activity",
  notifications: "/admin/notifications",
  settings: "/admin/settings",
}

const SECTION_DETAILS = {
  stats: { badge: "Overview", description: "Indicateurs principaux et activite recente." },
  chat: { badge: "Realtime", description: "Messagerie instantanée avec audio et synchronisation temps réel." },
  opportunities: { badge: "Market", description: "Suivi des appels d'offres cacao et cafe." },
  activites: { badge: "Audit", description: "Journal des actions et de la traçabilité." },
  users: { badge: "Users", description: "Gestion des comptes et des statuts." },
  agents: { badge: "Ops", description: "Pilotage des agents terrain." },
  centres: { badge: "Network", description: "Organisation des centres de collecte." },
  producteurs: { badge: "Growth", description: "Suivi des producteurs." },
  employes: { badge: "HR", description: "Gestion du personnel, des salaires et des postes." },
  campagnes: { badge: "Campaigns", description: "Gestion des campagnes, quotas centres et budgets automatiques." },
  pesees: { badge: "Weights", description: "Volumes et operations de pesee." },
  parcelles: { badge: "Maps", description: "Parcelles et informations associees." },
  notifications: { badge: "Comms", description: "Centre de notifications." },
  settings: { badge: "System", description: "Configuration generale." },
}

const SECTION_GROUPS = [
  { id: "workspace", label: "Workspace", items: ["stats", "chat", "opportunities", "activites", "notifications"] },
  { id: "operations", label: "Operations", items: ["users", "agents", "centres", "producteurs", "employes", "campagnes", "pesees", "parcelles", "settings"] },
]

function getSectionFromPath(pathname) {
  if (pathname === "/admin/activites") return "activites"
  if (pathname === "/admin/opportunites") return "opportunities"
  const match = Object.entries(SECTION_PATHS).find(([, path]) => path === pathname)
  return match?.[0] || "stats"
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

export default function AdminDashboard() {
  const { isAdmin, role, loading: authLoading, user, displayName, signOut } = useAuth()
  const { showToast } = useToast()
  const { settings } = useSettings()

  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window === "undefined") return "stats"
    return getSectionFromPath(window.location.pathname)
  })
  const [showProfile, setShowProfile] = useState(false)
  const [profileEditMode, setProfileEditMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window === "undefined") return "light"
    return window.localStorage.getItem("admin-theme-mode") || "light"
  })

  const searchPanelRef = useRef(null)
  const searchInputRef = useRef(null)
  const notificationPanelRef = useRef(null)
  const notificationButtonRef = useRef(null)
  const userMenuPanelRef = useRef(null)
  const avatarButtonRef = useRef(null)

  const isMobile = useMediaQuery("(max-width: 768px)")
  const cooperativeName = settings?.cooperative_name || "SCOOP ASAB-COOP-CA"
  const cooperativeLogo = settings?.logo_url || logoImage
  const userAvatar = user?.avatar_url || null
  const userInitials = displayName
    ? displayName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "A"

  const activeSectionConfig = showProfile
    ? { label: profileEditMode ? "Modifier le profil" : "Mon profil", icon: FaUserCircle }
    : SECTIONS[activeSection] || SECTIONS.stats
  const ActiveSectionIcon = activeSectionConfig.icon

  const activeMeta = showProfile
    ? { badge: "Profile", description: "Informations personnelles et préférences administrateur." }
    : SECTION_DETAILS[activeSection] || SECTION_DETAILS.stats

  const groupedSections = useMemo(
    () =>
      SECTION_GROUPS.map((group) => ({
        ...group,
        items: group.items.map((id) => SECTIONS[id]).filter(Boolean),
      })),
    []
  )

  const filteredSections = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase()
    if (!normalized) return Object.values(SECTIONS)
    return Object.values(SECTIONS).filter((section) =>
      section.label.toLowerCase().includes(normalized)
    )
  }, [searchQuery])

  const desktopSidebarWidth = sidebarCollapsed ? 92 : 272

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("admin-theme-mode", themeMode)
  }, [themeMode])

  useEffect(() => {
    if (!user?.id) return

    async function loadNotifications() {
      try {
        const items = await getUserNotifications(user.id, 20)
        setNotifications(items)
        setUnreadCount(items.filter((item) => !item.read).length)
      } catch (error) {
        console.error("[AdminDashboard] Error loading notifications:", error)
      }
    }

    loadNotifications()

    let unsubscribe
    try {
      unsubscribe = subscribeToNotifications(user.id, (nextNotification) => {
        if (nextNotification) {
          setNotifications((current) => [nextNotification, ...current])
          setUnreadCount((current) => current + 1)
          if (nextNotification.title) {
            showToast(nextNotification.title, "info")
          }
        }
      })
    } catch (error) {
      console.error("[AdminDashboard] Error subscribing to notifications:", error)
    }

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe()
      }
    }
  }, [user?.id, showToast])

  useEffect(() => {
    if (activeSection !== "settings" && showProfile) {
      setShowProfile(false)
      setProfileEditMode(false)
    }
  }, [activeSection, showProfile])

  useEffect(() => {
    if (typeof window === "undefined") return undefined

    const handlePopState = () => {
      setShowProfile(false)
      setProfileEditMode(false)
      setActiveSection(getSectionFromPath(window.location.pathname))
    }

    const handleAdminNavigate = (event) => {
      const nextSection = event.detail?.section
      if (!nextSection || !SECTIONS[nextSection]) return
      navigateToSection(nextSection)
    }

    const handleHotkey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearchOpen(true)
        requestAnimationFrame(() => searchInputRef.current?.focus())
      }
    }

    window.addEventListener("popstate", handlePopState)
    window.addEventListener("admin:navigate", handleAdminNavigate)
    window.addEventListener("keydown", handleHotkey)
    return () => {
      window.removeEventListener("popstate", handlePopState)
      window.removeEventListener("admin:navigate", handleAdminNavigate)
      window.removeEventListener("keydown", handleHotkey)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || showProfile) return
    const nextPath = SECTION_PATHS[activeSection] || "/admin"
    if (window.location.pathname !== nextPath) {
      window.history.replaceState({}, "", nextPath)
    }
  }, [activeSection, showProfile])

  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(false)
    } else {
      setSidebarCollapsed(false)
    }
  }, [isMobile])

  useEffect(() => {
    function handlePointerDown(event) {
      const target = event.target

      if (
        searchOpen &&
        !searchPanelRef.current?.contains(target) &&
        !searchInputRef.current?.contains(target)
      ) {
        setSearchOpen(false)
      }

      if (
        notificationsOpen &&
        !notificationPanelRef.current?.contains(target) &&
        !notificationButtonRef.current?.contains(target)
      ) {
        setNotificationsOpen(false)
      }

      if (
        userMenuOpen &&
        !userMenuPanelRef.current?.contains(target) &&
        !avatarButtonRef.current?.contains(target)
      ) {
        setUserMenuOpen(false)
      }
    }

    if (searchOpen || notificationsOpen || userMenuOpen) {
      document.addEventListener("mousedown", handlePointerDown)
      document.addEventListener("touchstart", handlePointerDown)
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
    }
  }, [searchOpen, notificationsOpen, userMenuOpen])

  useEffect(() => {
    if (typeof document === "undefined") return undefined
    const previousOverflow = document.body.style.overflow

    if (isMobile && sidebarOpen) {
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMobile, sidebarOpen])

  async function handleMarkAsRead(notificationId) {
    try {
      await markNotificationAsRead(notificationId)
      setNotifications((current) =>
        current.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
      )
      setUnreadCount((current) => Math.max(0, current - 1))
    } catch (error) {
      console.error("[AdminDashboard] Error marking notification as read:", error)
    }
  }

  function navigateToSection(sectionId) {
    try {
      const normalizedSection = sectionId === "activity" ? "activites" : sectionId
      console.log("[AdminDashboard] navigateToSection", { sectionId, normalizedSection })

      if (!normalizedSection || !SECTIONS[normalizedSection]) {
        console.error("[AdminDashboard] Unknown section:", sectionId)
        showToast("Section indisponible.", "error")
        setActiveSection("stats")
        return
      }

      setShowProfile(false)
      setProfileEditMode(false)
      setActiveSection(normalizedSection)
      setSidebarOpen(false)
      setSearchOpen(false)
      setSearchQuery("")

      if (user) {
        const sectionLabel = SECTIONS[normalizedSection]?.label || normalizedSection
        const sectionPath = normalizedSection === "activites" ? "/admin/activity" : SECTION_PATHS[normalizedSection] || "/admin"
        logAppActivity(user, "navigation", `Opened ${sectionLabel}`, sectionPath)
      }
    } catch (error) {
      console.error("[AdminDashboard] Navigation error:", error)
      showToast("Impossible d'ouvrir cette section pour le moment.", "error")
      setActiveSection("stats")
    }
  }

  function openProfile(editMode = false) {
    setShowProfile(true)
    setProfileEditMode(editMode)
    setActiveSection("settings")
    setUserMenuOpen(false)
    setSidebarOpen(false)
  }

  function renderSection() {
    if (showProfile) {
      return <Profile initialEditMode={profileEditMode} />
    }

    switch (activeSection) {
      case "stats":
        return <AdminStats />
      case "chat":
        return <Chat adminMode />
      case "opportunities":
        return <AdminOpportunities />
      case "users":
        return <AdminUsers />
      case "agents":
        return <AdminAgents />
      case "centres":
        return <AdminCentres />
      case "producteurs":
        return <AdminProducteurs />
      case "employes":
        return <EmployesPage />
      case "campagnes":
        return <Campagnes />
      case "pesees":
        return <AdminPesees />
      case "parcelles":
        return <AdminParcelles />
      case "activites":
        return <AdminActivities />
      case "notifications":
        return <AdminNotifications />
      case "settings":
        return <AdminSettings />
      default:
        return <AdminStats />
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
        return <FaBell size={16} style={{ color: "#2563eb" }} />
    }
  }

  if (authLoading) {
    return (
      <div style={styles.loadingState}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Chargement...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div style={styles.restrictedState}>
        <FaShieldAlt size={48} style={{ color: "#dc2626", marginBottom: 16 }} />
        <h2 style={styles.restrictedTitle}>Accès Restreint</h2>
        <p style={styles.restrictedText}>Cette section est réservée aux administrateurs.</p>
        <p style={styles.restrictedSubtext}>
          Votre rôle actuel: <strong>{role}</strong>
        </p>
      </div>
    )
  }

  return (
    <div style={{ ...styles.layout, ...getAdminThemeVars(themeMode) }}>
      {isMobile && sidebarOpen ? (
        <button type="button" aria-label="Fermer le menu" style={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)} />
      ) : null}

      <aside
        style={{
          ...styles.sidebar,
          ...(isMobile
            ? {
                transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
                width: "min(272px, calc(100vw - 20px))",
              }
            : {
                width: desktopSidebarWidth,
              }),
        }}
      >
        <div style={styles.sidebarSurface}>
          <div style={styles.sidebarBrandRow}>
            <div style={styles.sidebarLogo}>
              <img
                src={cooperativeLogo}
                alt="Logo"
                style={styles.sidebarLogoImage}
                onError={(event) => {
                  event.target.src = logoImage
                }}
              />
            </div>
            {!sidebarCollapsed || isMobile ? (
              <div style={styles.sidebarBrandText}>
                <div style={styles.sidebarBrandName}>{cooperativeName}</div>
                <div style={styles.sidebarBrandMeta}>Gestion Coopérative</div>
              </div>
            ) : null}
          </div>

          <div style={styles.sidebarScroll}>
            {groupedSections.map((group) => (
              <div key={group.id} style={styles.navGroup}>
                {!sidebarCollapsed || isMobile ? <div style={styles.navGroupLabel}>{group.label}</div> : null}
                <div style={styles.navList}>
                  {group.items.map((section) => {
                    const Icon = section.icon
                    const isActive = activeSection === section.id && !showProfile
                    return (
                      <button
                        key={section.id}
                        type="button"
                        style={{
                          ...styles.navItem,
                          ...(isActive ? styles.navItemActive : null),
                          ...(sidebarCollapsed && !isMobile ? styles.navItemCollapsed : null),
                        }}
                        onClick={() => navigateToSection(section.id)}
                        title={sidebarCollapsed && !isMobile ? section.label : undefined}
                        onMouseEnter={(event) => {
                          if (!isActive) {
                            event.currentTarget.style.background = "var(--admin-surface-muted)"
                            event.currentTarget.style.color = "var(--admin-text)"
                          }
                        }}
                        onMouseLeave={(event) => {
                          if (!isActive) {
                            event.currentTarget.style.background = "transparent"
                            event.currentTarget.style.color = "var(--admin-text-soft)"
                          }
                        }}
                      >
                        <span
                          style={{
                            ...styles.navIcon,
                            ...(isActive ? styles.navIconActive : null),
                          }}
                        >
                          <Icon size={16} />
                        </span>
                        {!sidebarCollapsed || isMobile ? (
                          <span style={styles.navTextWrap}>
                            <span style={styles.navLabel}>{section.label}</span>
                            <span style={styles.navMeta}>{SECTION_DETAILS[section.id]?.badge}</span>
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

        </div>
      </aside>

      <main
        style={{
          ...styles.main,
          marginLeft: isMobile ? 0 : desktopSidebarWidth,
        }}
      >
        <header
          style={{
            ...styles.header,
            ...(isMobile ? styles.headerMobile : null),
          }}
        >
          <div style={styles.headerLeft}>
            {isMobile ? (
              <button
                type="button"
                style={styles.headerIconButton}
                onClick={() => {
                  setSidebarOpen((current) => !current)
                  setNotificationsOpen(false)
                  setUserMenuOpen(false)
                }}
                aria-label="Menu"
              >
                <FaBars size={18} />
              </button>
            ) : (
              <button
                type="button"
                style={styles.headerIconButton}
                onClick={() => setSidebarCollapsed((current) => !current)}
                aria-label={sidebarCollapsed ? "Déplier la barre latérale" : "Réduire la barre latérale"}
              >
                {sidebarCollapsed ? <FaChevronRight size={16} /> : <FaChevronLeft size={16} />}
              </button>
            )}

            <div style={styles.headerTitleWrap}>
              <div style={styles.headerEyebrow}>
                <span>{cooperativeName}</span>
                <span style={styles.headerEyebrowDot} />
                <span>{activeMeta.badge}</span>
              </div>
              <div style={styles.headerTitleRow}>
                <div style={styles.headerSectionIcon}>
                  <ActiveSectionIcon size={16} />
                </div>
                <div style={styles.headerCopy}>
                  <h1 style={styles.headerTitle}>{activeSectionConfig.label}</h1>
                  <p style={styles.headerSubtitle}>{activeMeta.description}</p>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              ...styles.headerRight,
              ...(isMobile ? styles.headerRightMobile : null),
            }}
          >
            <div
              style={{
                ...styles.headerSearch,
                ...(isMobile ? styles.headerSearchMobile : null),
              }}
            >
              <FaSearch size={14} style={{ color: "var(--admin-text-muted)", flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setSearchOpen(false)
                    searchInputRef.current?.blur()
                  }

                  if (event.key === "Enter" && filteredSections.length > 0) {
                    event.preventDefault()
                    navigateToSection(filteredSections[0].id)
                  }
                }}
                placeholder="Rechercher une section"
                style={styles.headerSearchInput}
              />
              {!isMobile ? <span style={styles.searchShortcut}>Cmd K</span> : null}

              {searchOpen ? (
                <div ref={searchPanelRef} style={styles.searchPanel}>
                  <div style={styles.searchPanelLabel}>Navigation rapide</div>
                  <div style={styles.searchPanelList}>
                    {filteredSections.length === 0 ? (
                      <div style={styles.searchEmpty}>Aucune section correspondante</div>
                    ) : (
                      filteredSections.slice(0, 8).map((section) => {
                        const Icon = section.icon
                        return (
                          <button
                            key={section.id}
                            type="button"
                            style={styles.searchResult}
                            onClick={() => navigateToSection(section.id)}
                          >
                            <span style={styles.searchResultIcon}>
                              <Icon size={14} />
                            </span>
                            <span style={styles.searchResultText}>
                              <span style={styles.searchResultTitle}>{section.label}</span>
                              <span style={styles.searchResultSubtitle}>
                                {SECTION_DETAILS[section.id]?.description}
                              </span>
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div style={styles.headerActions}>
              <button
                type="button"
                style={styles.headerActionButton}
                onClick={() => setThemeMode((current) => (current === "light" ? "dark" : "light"))}
                aria-label={themeMode === "light" ? "Activer le mode sombre" : "Activer le mode clair"}
                title={themeMode === "light" ? "Mode sombre" : "Mode clair"}
              >
                {themeMode === "light" ? <FaMoon size={16} /> : <FaSun size={16} />}
              </button>

              <div style={styles.popoverAnchor}>
                <button
                  ref={notificationButtonRef}
                  type="button"
                  style={styles.headerActionButton}
                  onClick={() => {
                    setNotificationsOpen((current) => !current)
                    setUserMenuOpen(false)
                    setSearchOpen(false)
                  }}
                  aria-label="Notifications"
                >
                  <FaBell size={18} />
                  {unreadCount > 0 ? <span style={styles.notificationBadge}>{unreadCount}</span> : null}
                </button>

                {notificationsOpen ? (
                  <div ref={notificationPanelRef} style={styles.notificationPanel}>
                    <div style={styles.notificationPanelHeader}>
                      <div style={styles.notificationPanelTitle}>Notifications</div>
                      <div style={styles.notificationPanelCount}>
                        {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "A jour"}
                      </div>
                    </div>
                    <div style={styles.notificationList}>
                      {notifications.length === 0 ? (
                        <div style={styles.notificationEmpty}>Aucune notification</div>
                      ) : (
                        notifications.slice(0, 10).map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            style={{
                              ...styles.notificationItem,
                              ...(!notification.read ? styles.notificationItemUnread : null),
                            }}
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <span style={styles.notificationItemIcon}>
                              {getNotificationIcon(notification.type)}
                            </span>
                            <span style={styles.notificationItemText}>
                              <span style={styles.notificationItemTitle}>{notification.title || "Notification"}</span>
                              <span style={styles.notificationItemMessage}>{notification.message}</span>
                              <span style={styles.notificationItemTime}>{formatTimeAgo(notification.created_at)}</span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                    <div style={styles.notificationFooter}>
                      <button
                        type="button"
                        style={styles.notificationFooterButton}
                        onClick={() => {
                          navigateToSection("notifications")
                          setNotificationsOpen(false)
                        }}
                      >
                        Voir toutes les notifications
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div style={styles.popoverAnchor}>
                <button
                  ref={avatarButtonRef}
                  type="button"
                  style={styles.profileButton}
                  onClick={() => {
                    setUserMenuOpen((current) => !current)
                    setNotificationsOpen(false)
                    setSearchOpen(false)
                  }}
                  aria-label="Menu utilisateur"
                >
                  <div style={styles.profileAvatar}>
                    {userAvatar ? (
                      <img src={userAvatar} alt={displayName} style={styles.profileAvatarImage} />
                    ) : (
                      <div style={styles.profileAvatarFallback}>{userInitials}</div>
                    )}
                  </div>
                  {!isMobile ? (
                    <div style={styles.profileText}>
                      <span style={styles.profileName}>{displayName || "Admin"}</span>
                      <span style={styles.profileRole}>{role || "ADMIN"}</span>
                    </div>
                  ) : null}
                </button>

                {userMenuOpen ? (
                  <div ref={userMenuPanelRef} style={styles.userMenu}>
                    <div style={styles.userMenuHeader}>
                      <div style={styles.userMenuAvatar}>
                        {userAvatar ? (
                          <img src={userAvatar} alt={displayName} style={styles.profileAvatarImage} />
                        ) : (
                          <div style={styles.profileAvatarFallback}>{userInitials}</div>
                        )}
                      </div>
                      <div style={styles.userMenuText}>
                        <div style={styles.userMenuName}>{displayName || user?.email || "Admin"}</div>
                        <div style={styles.userMenuRole}>{role || "ADMIN"}</div>
                      </div>
                    </div>
                    <div style={styles.userMenuList}>
                      <button type="button" style={styles.userMenuItem} onClick={() => openProfile(false)}>
                        <FaUserCircle size={16} />
                        <span>Voir mon profil</span>
                      </button>
                      <button type="button" style={styles.userMenuItem} onClick={() => openProfile(true)}>
                        <FaEdit size={16} />
                        <span>Modifier mon profil</span>
                      </button>
                      <button
                        type="button"
                        style={styles.userMenuItem}
                        onClick={() => {
                          navigateToSection("notifications")
                          setUserMenuOpen(false)
                        }}
                      >
                        <FaBell size={16} />
                        <span>Centre de notifications</span>
                      </button>
                      <button
                        type="button"
                        style={styles.userMenuItem}
                        onClick={() => {
                          navigateToSection("settings")
                          setUserMenuOpen(false)
                        }}
                      >
                        <FaCog size={16} />
                        <span>Paramètres admin</span>
                      </button>
                      <button
                        type="button"
                        style={styles.userMenuItem}
                        onClick={() => {
                          setUserMenuOpen(false)
                          showToast("Fonctionnalité à venir", "info")
                        }}
                      >
                        <FaKey size={16} />
                        <span>Changer le mot de passe</span>
                      </button>
                    </div>
                    <div style={styles.userMenuFooter}>
                      <button
                        type="button"
                        style={{ ...styles.userMenuItem, color: "#dc2626" }}
                        onClick={async () => {
                          setUserMenuOpen(false)
                          await signOut()
                          showToast("Déconnexion réussie", "success")
                        }}
                      >
                        <FaSignOutAlt size={16} />
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <div style={styles.contentScroller}>
          <div
            style={{
              ...styles.contentInner,
              padding: isMobile ? 16 : 24,
            }}
          >
            <ErrorBoundary key={showProfile ? "profile" : activeSection}>
              <Suspense
                fallback={
                  <div style={styles.sectionLoadingState}>
                    <div style={styles.spinner}></div>
                    <p style={styles.loadingText}>Chargement de la section...</p>
                  </div>
                }
              >
                {renderSection()}
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  )
}

const styles = {
  layout: {
    display: "block",
    width: "100%",
    minHeight: "100vh",
    background: "var(--admin-bg)",
    color: "var(--admin-text)",
    transition: "background 0.25s ease, color 0.25s ease",
  },
  sidebarOverlay: {
    position: "fixed",
    inset: 0,
    background: "var(--admin-overlay)",
    zIndex: 80,
    border: "none",
    padding: 0,
    cursor: "pointer",
  },
  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 90,
    padding: 10,
    boxSizing: "border-box",
    transition: "width 0.22s ease, transform 0.22s ease",
  },
  sidebarSurface: {
    height: "100%",
    borderRadius: ADMIN_TOKENS.radius.xl,
    border: "1px solid var(--admin-border)",
    background: "var(--admin-surface-elevated)",
    boxShadow: "var(--admin-shadow-soft)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backdropFilter: "blur(16px)",
    transition: "background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
  },
  sidebarBrandRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minHeight: 76,
    padding: "16px 14px",
    borderBottom: "1px solid var(--admin-border)",
  },
  sidebarLogo: {
    width: 42,
    height: 42,
    borderRadius: 14,
    overflow: "hidden",
    background: "var(--admin-surface)",
    border: "1px solid var(--admin-border)",
    flexShrink: 0,
  },
  sidebarLogoImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  sidebarBrandText: {
    minWidth: 0,
  },
  sidebarBrandName: {
    fontSize: 14,
    lineHeight: 1.25,
    fontWeight: 800,
    color: "var(--admin-text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  sidebarBrandMeta: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 1.2,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--admin-text-muted)",
    fontWeight: 800,
  },
  sidebarScroll: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "12px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  navGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  navGroupLabel: {
    padding: "0 8px",
    fontSize: 10,
    lineHeight: 1.2,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--admin-text-muted)",
    fontWeight: 800,
  },
  navList: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  navItem: {
    width: "100%",
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 14,
    border: "none",
    background: "transparent",
    color: "var(--admin-text-soft)",
    cursor: "pointer",
    textAlign: "left",
  },
  navItemActive: {
    background: "var(--admin-sidebar-active-bg)",
    color: "var(--admin-sidebar-active-text)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04), 0 10px 18px rgba(15, 23, 42, 0.08)",
  },
  navItemCollapsed: {
    justifyContent: "center",
    padding: "8px 0",
  },
  navIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: "var(--admin-surface-muted)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  navIconActive: {
    background: "linear-gradient(135deg, #7a1f1f 0%, #b02a2a 100%)",
    color: "#ffffff",
  },
  navTextWrap: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  navLabel: {
    fontSize: 13,
    lineHeight: 1.2,
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  navMeta: {
    fontSize: 10,
    lineHeight: 1,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--admin-text-muted)",
    fontWeight: 800,
  },
  main: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "var(--admin-bg)",
  },
  header: {
    height: ADMIN_TOKENS.headerHeight,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "0 24px",
    borderBottom: "1px solid var(--admin-border)",
    background: "var(--admin-header-bg)",
    backdropFilter: "blur(18px)",
    position: "sticky",
    top: 0,
    zIndex: 50,
    transition: "background 0.25s ease, border-color 0.25s ease",
  },
  headerMobile: {
    height: "auto",
    minHeight: ADMIN_TOKENS.headerHeight,
    padding: "12px 16px",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  headerLeft: {
    minWidth: 0,
    flex: "1 1 360px",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    border: "1px solid var(--admin-border)",
    background: "var(--admin-surface)",
    color: "var(--admin-text-soft)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  headerTitleWrap: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  headerEyebrow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11,
    lineHeight: 1.1,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--admin-text-muted)",
    whiteSpace: "nowrap",
  },
  headerEyebrowDot: {
    width: 4,
    height: 4,
    borderRadius: "50%",
    background: "var(--admin-text-muted)",
    flexShrink: 0,
  },
  headerTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  headerSectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    background: "var(--admin-sidebar-active-bg)",
    color: "#991b1b",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerCopy: {
    minWidth: 0,
  },
  headerTitle: {
    margin: 0,
    fontSize: 22,
    lineHeight: 1.1,
    fontWeight: 800,
    letterSpacing: "-0.04em",
    color: "var(--admin-text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  headerSubtitle: {
    margin: "4px 0 0",
    fontSize: 13,
    lineHeight: 1.45,
    color: "var(--admin-text-soft)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
  },
  headerRightMobile: {
    width: "100%",
    justifyContent: "space-between",
  },
  headerSearch: {
    position: "relative",
    minWidth: 0,
    width: "min(420px, 38vw)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    height: 44,
    padding: "0 14px",
    borderRadius: 16,
    border: "1px solid var(--admin-border)",
    background: "var(--admin-surface)",
  },
  headerSearchMobile: {
    width: "100%",
    minWidth: 0,
    flex: "1 1 auto",
  },
  headerSearchInput: {
    flex: 1,
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--admin-text)",
    fontSize: 14,
    fontFamily: "inherit",
  },
  searchShortcut: {
    minHeight: 24,
    padding: "0 8px",
    borderRadius: 999,
    border: "1px solid var(--admin-border)",
    background: "var(--admin-surface-muted)",
    color: "var(--admin-text-soft)",
    fontSize: 11,
    lineHeight: 1,
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  searchPanel: {
    position: "absolute",
    top: "calc(100% + 12px)",
    left: 0,
    right: 0,
    zIndex: 60,
    borderRadius: 20,
    border: "1px solid var(--admin-border)",
    background: "var(--admin-surface)",
    boxShadow: "var(--admin-shadow-soft)",
    overflow: "hidden",
  },
  searchPanelLabel: {
    padding: "14px 16px 10px",
    fontSize: 11,
    lineHeight: 1.1,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "var(--admin-text-muted)",
    fontWeight: 800,
  },
  searchPanelList: {
    display: "flex",
    flexDirection: "column",
    maxHeight: 320,
    overflowY: "auto",
    padding: "0 10px 10px",
    gap: 6,
  },
  searchResult: {
    width: "100%",
    border: "none",
    background: "var(--admin-surface)",
    borderRadius: 16,
    padding: 12,
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    textAlign: "left",
    cursor: "pointer",
  },
  searchResultIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    background: "var(--admin-surface-muted)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--admin-text-soft)",
    flexShrink: 0,
  },
  searchResultText: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  searchResultTitle: {
    fontSize: 14,
    lineHeight: 1.2,
    fontWeight: 700,
    color: "var(--admin-text)",
  },
  searchResultSubtitle: {
    fontSize: 12,
    lineHeight: 1.45,
    color: "var(--admin-text-soft)",
  },
  searchEmpty: {
    padding: 16,
    fontSize: 13,
    lineHeight: 1.4,
    color: "var(--admin-text-muted)",
    textAlign: "center",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  popoverAnchor: {
    position: "relative",
  },
  headerActionButton: {
    position: "relative",
    width: 44,
    height: 44,
    borderRadius: 16,
    border: ADMIN_TOKENS.border,
    background: "var(--admin-surface)",
    color: "#475569",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    padding: "0 4px",
    borderRadius: 999,
    background: "#dc2626",
    color: "#ffffff",
    fontSize: 10,
    lineHeight: 1,
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationPanel: {
    position: "absolute",
    top: "calc(100% + 12px)",
    right: 0,
    width: "min(360px, calc(100vw - 24px))",
    borderRadius: 20,
    border: ADMIN_TOKENS.border,
    background: "var(--admin-surface)",
    boxShadow: "0 24px 48px rgba(15, 23, 42, 0.12)",
    overflow: "hidden",
    zIndex: 60,
  },
  notificationPanelHeader: {
    padding: 16,
    borderBottom: "1px solid var(--admin-border)",
  },
  notificationPanelTitle: {
    fontSize: 14,
    lineHeight: 1.2,
    fontWeight: 800,
    color: "var(--admin-text)",
  },
  notificationPanelCount: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 1.4,
    color: "var(--admin-text-soft)",
  },
  notificationList: {
    maxHeight: 360,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
  notificationItem: {
    width: "100%",
    border: "none",
    background: "var(--admin-surface)",
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "14px 16px",
    textAlign: "left",
    cursor: "pointer",
    borderBottom: "1px solid var(--admin-border-soft)",
  },
  notificationItemUnread: {
    background: "var(--admin-surface-muted)",
  },
  notificationItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: "var(--admin-surface-muted)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notificationItemText: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  notificationItemTitle: {
    fontSize: 13,
    lineHeight: 1.35,
    fontWeight: 700,
    color: "var(--admin-text)",
  },
  notificationItemMessage: {
    fontSize: 12,
    lineHeight: 1.45,
    color: "var(--admin-text-soft)",
  },
  notificationItemTime: {
    fontSize: 11,
    lineHeight: 1.2,
    color: "var(--admin-text-muted)",
    fontWeight: 700,
  },
  notificationEmpty: {
    padding: 20,
    textAlign: "center",
    color: "var(--admin-text-muted)",
    fontSize: 13,
  },
  notificationFooter: {
    padding: 12,
    borderTop: "1px solid var(--admin-border)",
    background: "var(--admin-card-muted-bg)",
  },
  notificationFooterButton: {
    width: "100%",
    minHeight: 40,
    borderRadius: 14,
    border: "1px solid var(--admin-border)",
    background: "var(--admin-surface)",
    color: "var(--admin-text)",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  profileButton: {
    minHeight: 44,
    borderRadius: 18,
    border: "1px solid var(--admin-border)",
    background: "var(--admin-surface)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 10px 0 0",
    cursor: "pointer",
    overflow: "hidden",
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
  },
  profileAvatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  profileAvatarFallback: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #7a1f1f 0%, #b02a2a 100%)",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 800,
  },
  profileText: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  profileName: {
    fontSize: 13,
    lineHeight: 1.2,
    fontWeight: 700,
    color: "var(--admin-text)",
    maxWidth: 120,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  profileRole: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 1.1,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--admin-text-muted)",
    fontWeight: 800,
  },
  userMenu: {
    position: "absolute",
    top: "calc(100% + 12px)",
    right: 0,
    width: "min(260px, calc(100vw - 24px))",
    borderRadius: 20,
    border: "1px solid var(--admin-border)",
    background: "var(--admin-surface)",
    boxShadow: "var(--admin-shadow-soft)",
    overflow: "hidden",
    zIndex: 60,
  },
  userMenuHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottom: "1px solid var(--admin-border)",
    background: "var(--admin-card-muted-bg)",
  },
  userMenuAvatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
  },
  userMenuText: {
    minWidth: 0,
  },
  userMenuName: {
    fontSize: 14,
    lineHeight: 1.2,
    fontWeight: 700,
    color: "var(--admin-text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  userMenuRole: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 1.1,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--admin-text-muted)",
    fontWeight: 800,
  },
  userMenuList: {
    padding: 8,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  userMenuFooter: {
    padding: 8,
    borderTop: "1px solid var(--admin-border)",
  },
  userMenuItem: {
    width: "100%",
    minHeight: 42,
    borderRadius: 14,
    border: "none",
    background: "var(--admin-surface)",
    color: "var(--admin-text-soft)",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "0 12px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
  },
  contentScroller: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
  },
  contentInner: {
    boxSizing: "border-box",
    minWidth: 0,
    maxWidth: 1500,
    margin: "0 auto",
    width: "100%",
  },
  loadingState: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  spinner: {
    width: 40,
    height: 40,
    border: "4px solid #e5e7eb",
    borderTopColor: "#7a1f1f",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    fontSize: 14,
    color: "var(--admin-text-soft)",
  },
  sectionLoadingState: {
    minHeight: 280,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  restrictedState: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    textAlign: "center",
  },
  restrictedTitle: {
    margin: "16px 0 8px",
    fontSize: 24,
    fontWeight: 800,
    color: "#111827",
  },
  restrictedText: {
    margin: 0,
    fontSize: 16,
    color: "#6b7280",
  },
  restrictedSubtext: {
    margin: "8px 0 0",
    fontSize: 14,
    color: "#9ca3af",
  },
}
