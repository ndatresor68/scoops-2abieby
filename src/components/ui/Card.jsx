export default function Card({ children, title, style = {}, className = "" }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        padding: "24px",
        ...style,
      }}
      className={className}
    >
      {title && (
        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: "18px", fontWeight: 700, color: "#1f2937" }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}
