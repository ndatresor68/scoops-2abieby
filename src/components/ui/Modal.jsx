import { FaXmark } from "react-icons/fa6"
import { useMediaQuery } from "../../hooks/useMediaQuery"

export default function Modal({ isOpen, onClose, title, children, size = "md", style = {} }) {
  const isMobile = useMediaQuery("(max-width: 640px)")
  
  if (!isOpen) return null

  const sizes = {
    sm: { maxWidth: "400px" },
    md: { maxWidth: "560px" },
    lg: { maxWidth: "800px" },
    xl: { maxWidth: "1200px" },
  }

  return (
    <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: isMobile ? "flex-start" : "center",
          zIndex: 3000,
          padding: isMobile ? "0" : 16,
          backdropFilter: "blur(4px)",
          overflowY: "auto",
        }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: isMobile ? "100%" : sizes[size].maxWidth,
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 20px 42px rgba(0,0,0,0.2)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          margin: isMobile ? "16px" : "0",
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
              padding: "20px 24px",
              borderBottom: "1px solid #f1f1f1",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#1f2937" }}>{title}</h3>
            <button
              onClick={onClose}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "20px",
                color: "#6b7280",
                padding: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#f3f4f6"
                e.target.style.color = "#1f2937"
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent"
                e.target.style.color = "#6b7280"
              }}
            >
              <FaXmark />
            </button>
          </div>
        )}
        <div style={{ padding: isMobile ? "16px" : "24px", overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  )
}
