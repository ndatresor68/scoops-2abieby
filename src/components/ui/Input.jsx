import { useMediaQuery } from "../../hooks/useMediaQuery"

export default function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  disabled = false,
  required = false,
  error = "",
  icon,
  style = {},
  ...props
}) {
  const isMobile = useMediaQuery("(max-width: 640px)")
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label style={{ fontSize: "13px", color: "#374151", fontWeight: 600, marginBottom: "8px", display: "block", letterSpacing: "0.01em" }}>
          {label} {required && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
        </label>
      )}
      <div style={{ position: "relative" }}>
        {icon && (
          <span
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#6b7280",
              fontSize: "16px",
              zIndex: 1,
            }}
          >
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          style={{
            width: "100%",
            padding: icon ? (isMobile ? "14px 12px 14px 44px" : "13px 14px 13px 44px") : (isMobile ? "14px 14px" : "13px 14px"),
            borderRadius: "10px",
            border: error ? "1px solid #dc2626" : "1px solid #d1d5db",
            fontSize: isMobile ? "16px" : "14px",
            outline: "none",
            transition: "all 0.2s ease",
            background: disabled ? "#f9fafb" : "white",
            color: disabled ? "#6b7280" : "#111827",
            minHeight: isMobile ? "44px" : "44px",
            fontFamily: "inherit",
            boxShadow: error ? "0 0 0 3px rgba(220, 38, 38, 0.1)" : "none",
            ...(props.style || {}),
          }}
          onFocus={(e) => {
            if (!error && !disabled) {
              e.target.style.borderColor = "#7a1f1f"
              e.target.style.boxShadow = "0 0 0 3px rgba(122, 31, 31, 0.1)"
            }
          }}
          onBlur={(e) => {
            if (!error && !disabled) {
              e.target.style.borderColor = "#d1d5db"
              e.target.style.boxShadow = "none"
            }
          }}
          {...props}
        />
      </div>
      {error && (
        <span style={{ fontSize: "12px", color: "#dc2626", marginTop: -4 }}>{error}</span>
      )}
    </div>
  )
}
