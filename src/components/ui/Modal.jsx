import { useEffect } from "react"
import { FaTimes } from "react-icons/fa"
import { useMediaQuery } from "../../hooks/useMediaQuery"

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  style = {},
  mobileFullscreen = false,
}) {
  const isMobile = useMediaQuery("(max-width: 640px)")

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = {
    sm: { maxWidth: "420px" },
    md: { maxWidth: "620px" },
    lg: { maxWidth: "860px" },
    xl: { maxWidth: "1200px" },
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: isMobile ? "flex-start" : "center",
        zIndex: 3000,
        padding: isMobile ? 0 : 20,
        backdropFilter: "blur(10px)",
        overflowY: "auto",
        overflowX: "hidden",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: isMobile ? "100%" : sizes[size].maxWidth,
          background: "linear-gradient(180deg, rgba(255,255,255,0.98), #ffffff)",
          borderRadius: isMobile && mobileFullscreen ? 0 : 28,
          boxShadow: "0 36px 80px rgba(15, 23, 42, 0.24)",
          border: "1px solid rgba(226, 232, 240, 0.88)",
          maxHeight: isMobile && mobileFullscreen ? "100vh" : "90vh",
          minHeight: isMobile && mobileFullscreen ? "100vh" : "auto",
          display: "flex",
          flexDirection: "column",
          margin: isMobile ? (mobileFullscreen ? "0" : "16px") : "0",
          overflow: "hidden",
          ...style,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              padding: isMobile ? "18px 18px 16px" : "22px 24px 18px",
              borderBottom: "1px solid rgba(226, 232, 240, 0.9)",
              background: "linear-gradient(180deg, rgba(248,250,252,0.95), rgba(255,255,255,0.92))",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: isMobile ? 17 : 20,
                  fontWeight: 800,
                  color: "#0f172a",
                  letterSpacing: "-0.03em",
                }}
              >
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              style={{
                border: "1px solid rgba(226, 232, 240, 0.95)",
                background: "rgba(255,255,255,0.94)",
                cursor: "pointer",
                fontSize: "20px",
                color: "#64748b",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 14,
                transition: "all 0.2s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f8fafc"
                e.currentTarget.style.color = "#0f172a"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.94)"
                e.currentTarget.style.color = "#64748b"
              }}
            >
              <FaTimes />
            </button>
          </div>
        )}
        <div
          style={{
            padding: isMobile ? "18px" : "24px",
            overflowY: "auto",
            flex: 1,
            background: "transparent",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
