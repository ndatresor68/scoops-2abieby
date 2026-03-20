import { useMediaQuery } from "../../hooks/useMediaQuery"

export default function Card({
  children,
  title,
  subtitle,
  actions,
  padding,
  style = {},
  className = "",
  onMouseEnter,
  onMouseLeave,
}) {
  const isMobile = useMediaQuery("(max-width: 640px)")

  return (
    <section
      style={{
        background: "var(--admin-card-bg, linear-gradient(180deg, rgba(255,255,255,0.98), #ffffff))",
        borderRadius: 24,
        boxShadow: "var(--admin-shadow-card, 0 18px 40px rgba(15, 23, 42, 0.07))",
        padding: padding || (isMobile ? "20px" : "24px"),
        border: "1px solid var(--admin-border, rgba(226, 232, 240, 0.9))",
        transition:
          "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease, color 0.25s ease",
        backdropFilter: "blur(12px)",
        boxSizing: "border-box",
        minWidth: 0,
        ...style,
      }}
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {title || subtitle || actions ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 16,
            paddingBottom: 14,
            borderBottom: "1px solid var(--admin-border-soft, rgba(226, 232, 240, 0.72))",
          }}
        >
          <div style={{ minWidth: 0 }}>
            {title ? (
              <h3
                style={{
                  margin: 0,
                  fontSize: isMobile ? "17px" : "18px",
                  fontWeight: 800,
                  color: "var(--admin-text, #0f172a)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.2,
                }}
              >
                {title}
              </h3>
            ) : null}
            {subtitle ? (
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: "var(--admin-text-soft, #64748b)",
                }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? <div style={{ flexShrink: 0 }}>{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
