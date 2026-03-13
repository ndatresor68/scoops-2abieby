import { useMediaQuery } from "../../hooks/useMediaQuery"

export default function Card({ children, title, style = {}, className = "", onMouseEnter, onMouseLeave }) {
  const isMobile = useMediaQuery("(max-width: 640px)")
  
  return (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        padding: isMobile ? "20px" : "28px",
        border: "1px solid rgba(0,0,0,0.04)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        ...style,
      }}
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {title && (
        <h3 style={{
          marginTop: 0,
          marginBottom: 20,
          fontSize: "20px",
          fontWeight: 700,
          color: "#0f172a",
          letterSpacing: "-0.02em",
        }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}
