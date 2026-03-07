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
        <label style={{ fontSize: "13px", color: "#6b7280", fontWeight: 600 }}>
          {label} {required && <span style={{ color: "#dc2626" }}>*</span>}
        </label>
      )}
      <div style={{ position: "relative" }}>
        {icon && (
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
              fontSize: "16px",
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
            padding: icon ? (isMobile ? "14px 12px 14px 40px" : "12px 12px 12px 40px") : (isMobile ? "14px" : "12px"),
            borderRadius: "10px",
            border: error ? "1px solid #dc2626" : "1px solid #e5e7eb",
            fontSize: isMobile ? "16px" : "14px",
            outline: "none",
            transition: "all 0.2s ease",
            background: disabled ? "#f9fafb" : "white",
            color: disabled ? "#6b7280" : "#1f2937",
            minHeight: isMobile ? "44px" : "auto",
            ...(props.style || {}),
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
