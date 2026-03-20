import Card from "./Card"
import { useMediaQuery } from "../../hooks/useMediaQuery"

export const ADMIN_TOKENS = {
  layoutMaxWidth: 1440,
  headerHeight: 76,
  sidebarWidth: 296,
  sidebarCollapsedWidth: 104,
  radius: {
    md: 16,
    lg: 20,
    xl: 24,
  },
  spacing: {
    xs: 8,
    sm: 16,
    md: 20,
    lg: 32,
  },
  shadow: {
    soft: "0 12px 28px rgba(15, 23, 42, 0.06)",
    card: "0 18px 36px rgba(15, 23, 42, 0.06)",
  },
  border: "1px solid rgba(226, 232, 240, 0.95)",
  text: {
    title: "#0f172a",
    body: "#475569",
    muted: "#94a3b8",
  },
}

export function getAdminThemeVars(mode = "light") {
  if (mode === "dark") {
    return {
      "--admin-bg": "#0f172a",
      "--admin-surface": "#111827",
      "--admin-surface-elevated": "rgba(17, 24, 39, 0.94)",
      "--admin-surface-muted": "#1e293b",
      "--admin-border": "rgba(51, 65, 85, 0.9)",
      "--admin-border-soft": "rgba(71, 85, 105, 0.45)",
      "--admin-text": "#f8fafc",
      "--admin-text-soft": "#cbd5e1",
      "--admin-text-muted": "#94a3b8",
      "--admin-shadow-soft": "0 18px 40px rgba(2, 6, 23, 0.36)",
      "--admin-shadow-card": "0 18px 36px rgba(2, 6, 23, 0.34)",
      "--admin-sidebar-active-bg": "rgba(127, 29, 29, 0.34)",
      "--admin-sidebar-active-text": "#fecaca",
      "--admin-overlay": "rgba(2, 6, 23, 0.62)",
      "--admin-header-bg": "rgba(15, 23, 42, 0.82)",
      "--admin-card-bg": "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(15,23,42,0.98))",
      "--admin-card-muted-bg": "#0f172a",
    }
  }

  return {
    "--admin-bg": "#f8fafc",
    "--admin-surface": "#ffffff",
    "--admin-surface-elevated": "rgba(255,255,255,0.96)",
    "--admin-surface-muted": "#f8fafc",
    "--admin-border": "rgba(226, 232, 240, 0.95)",
    "--admin-border-soft": "rgba(226, 232, 240, 0.72)",
    "--admin-text": "#0f172a",
    "--admin-text-soft": "#475569",
    "--admin-text-muted": "#94a3b8",
    "--admin-shadow-soft": "0 12px 28px rgba(15, 23, 42, 0.06)",
    "--admin-shadow-card": "0 18px 36px rgba(15, 23, 42, 0.06)",
    "--admin-sidebar-active-bg": "#fff5f5",
    "--admin-sidebar-active-text": "#7a1f1f",
    "--admin-overlay": "rgba(15, 23, 42, 0.42)",
    "--admin-header-bg": "rgba(255,255,255,0.92)",
    "--admin-card-bg": "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))",
    "--admin-card-muted-bg": "#fbfdff",
  }
}

export function AdminPage({ title, subtitle, actions, stats = [], children, aside, contentStyle = {} }) {
  const isCompact = useMediaQuery("(max-width: 1024px)")
  const padding = isCompact ? ADMIN_TOKENS.spacing.sm : ADMIN_TOKENS.spacing.md

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <section style={{ ...styles.headerSurface, padding }}>
          <div style={styles.header}>
            <div style={styles.headerText}>
              <div style={styles.eyebrow}>Admin workspace</div>
              <h1 style={styles.title}>{title}</h1>
              {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
            </div>
            {actions ? <div style={styles.actions}>{actions}</div> : null}
          </div>
        </section>
      </div>

      {stats.length > 0 ? (
        <div style={styles.container}>
          <section style={styles.statsGrid}>
            {stats.map((item) => (
              <Card key={item.label} style={styles.statCard} padding={`${padding}px`}>
                <div style={styles.statContent}>
                  <div style={styles.statTop}>
                    <div
                      style={{
                        ...styles.statIcon,
                        background: `${item.accent || "#0f172a"}14`,
                        color: item.accent || "#0f172a",
                      }}
                    >
                      {item.icon}
                    </div>
                    {item.helper ? <div style={styles.statHelper}>{item.helper}</div> : <div style={styles.statHelperSpacer} />}
                  </div>
                  <div style={styles.statBody}>
                    <div style={styles.statValue}>{item.value}</div>
                    <div style={styles.statLabel}>{item.label}</div>
                  </div>
                </div>
              </Card>
            ))}
          </section>
        </div>
      ) : null}

      <div style={styles.container}>
        <div
          style={{
            ...styles.contentGrid,
            ...(aside && !isCompact ? styles.contentGridWithAside : styles.contentGridSingle),
            ...contentStyle,
          }}
        >
          <div style={styles.main}>{children}</div>
          {aside ? <aside style={styles.aside}>{aside}</aside> : null}
        </div>
      </div>
    </div>
  )
}

export function AdminPanel({ title, subtitle, actions, children, style = {} }) {
  return (
    <Card
      title={title}
      subtitle={subtitle}
      actions={actions}
      style={{
        minWidth: 0,
        borderRadius: ADMIN_TOKENS.radius.xl,
        boxShadow: ADMIN_TOKENS.shadow.card,
        ...style,
      }}
    >
      {children}
    </Card>
  )
}

export function AdminQuickActions({ title = "Actions rapides", items = [] }) {
  return (
    <AdminPanel title={title} subtitle="Acces directs aux operations les plus frequentes.">
      <div style={styles.quickList}>
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            style={styles.quickAction}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = "var(--admin-surface-muted)"
              event.currentTarget.style.borderColor = "var(--admin-border)"
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "var(--admin-surface)"
              event.currentTarget.style.borderColor = "var(--admin-border)"
            }}
          >
            <div
              style={{
                ...styles.quickActionIcon,
                background: `${item.accent || "#0f172a"}14`,
                color: item.accent || "#0f172a",
              }}
            >
              {item.icon}
            </div>
            <div style={styles.quickActionText}>
              <div style={styles.quickActionTitle}>{item.label}</div>
              {item.description ? <div style={styles.quickActionDescription}>{item.description}</div> : null}
            </div>
          </button>
        ))}
      </div>
    </AdminPanel>
  )
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: ADMIN_TOKENS.spacing.md,
    minWidth: 0,
    width: "100%",
  },
  container: {
    width: "100%",
    maxWidth: ADMIN_TOKENS.layoutMaxWidth,
    margin: "0 auto",
    minWidth: 0,
  },
  headerSurface: {
    borderRadius: ADMIN_TOKENS.radius.xl,
    border: "1px solid var(--admin-border)",
    background: "var(--admin-card-bg)",
    boxShadow: "var(--admin-shadow-soft)",
    transition: "background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: ADMIN_TOKENS.spacing.sm,
    flexWrap: "wrap",
  },
  headerText: {
    minWidth: 0,
    flex: "1 1 360px",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--admin-text-muted)",
    lineHeight: 1.2,
  },
  title: {
    margin: "8px 0 0",
    fontSize: "clamp(26px, 4vw, 32px)",
    fontWeight: 800,
    letterSpacing: "-0.05em",
    lineHeight: 1.05,
    color: "var(--admin-text)",
  },
  subtitle: {
    margin: "10px 0 0",
    maxWidth: 760,
    fontSize: 14,
    lineHeight: 1.65,
    color: "var(--admin-text-soft)",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    flexShrink: 0,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: ADMIN_TOKENS.spacing.md,
    alignItems: "stretch",
  },
  statCard: {
    minHeight: 144,
    borderRadius: ADMIN_TOKENS.radius.xl,
    boxShadow: "var(--admin-shadow-card)",
  },
  statContent: {
    minHeight: 104,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    textAlign: "center",
  },
  statTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    width: "100%",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    flexShrink: 0,
  },
  statHelper: {
    fontSize: 11,
    lineHeight: 1,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--admin-text-muted)",
    textAlign: "center",
  },
  statHelperSpacer: {
    minWidth: 0,
    minHeight: 11,
    flexShrink: 0,
  },
  statBody: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  statValue: {
    fontSize: "clamp(22px, 3vw, 28px)",
    lineHeight: 1.1,
    letterSpacing: "-0.04em",
    fontWeight: 800,
    color: "var(--admin-text)",
  },
  statLabel: {
    fontSize: 13,
    lineHeight: 1.3,
    fontWeight: 700,
    color: "var(--admin-text-soft)",
    maxWidth: 160,
  },
  contentGrid: {
    display: "grid",
    gap: ADMIN_TOKENS.spacing.md,
    minWidth: 0,
    alignItems: "start",
  },
  contentGridWithAside: {
    gridTemplateColumns: "minmax(0, 1.5fr) minmax(280px, 360px)",
  },
  contentGridSingle: {
    gridTemplateColumns: "1fr",
  },
  main: {
    display: "flex",
    flexDirection: "column",
    gap: ADMIN_TOKENS.spacing.md,
    minWidth: 0,
  },
  aside: {
    display: "flex",
    flexDirection: "column",
    gap: ADMIN_TOKENS.spacing.md,
    minWidth: 0,
    position: "relative",
  },
  quickList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  quickAction: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    borderRadius: 18,
    border: "1px solid var(--admin-border)",
    background: "var(--admin-surface)",
    textAlign: "left",
    cursor: "pointer",
    transition: "background 0.25s ease, border-color 0.25s ease",
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  quickActionText: {
    minWidth: 0,
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 14,
    lineHeight: 1.25,
    fontWeight: 700,
    color: "var(--admin-text)",
  },
  quickActionDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 1.45,
    color: "var(--admin-text-soft)",
  },
}
