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
  inputStyle = {},
  ...props
}) {
  const isMobile = useMediaQuery("(max-width: 640px)")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, ...style }}>
      {label ? (
        <label
          style={{
            fontSize: 13,
            color: "#334155",
            fontWeight: 700,
            display: "block",
            letterSpacing: "0.01em",
          }}
        >
          {label}
          {required ? <span style={{ color: "#dc2626", marginLeft: 4 }}>*</span> : null}
        </label>
      ) : null}
      <div style={{ position: "relative" }}>
        {icon ? (
          <span
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              color: error ? "#dc2626" : "#64748b",
              fontSize: 16,
              zIndex: 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            {icon}
          </span>
        ) : null}
        <input
          type={type}
          value={value || ""}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          style={{
            width: "100%",
            padding: icon
              ? isMobile
                ? "14px 16px 14px 46px"
                : "13px 16px 13px 46px"
              : isMobile
                ? "14px 16px"
                : "13px 16px",
            borderRadius: 16,
            border: error ? "1px solid rgba(220, 38, 38, 0.55)" : "1px solid rgba(203, 213, 225, 0.95)",
            fontSize: isMobile ? 16 : 14,
            outline: "none",
            transition: "border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease",
            background: disabled ? "#f8fafc" : "rgba(255,255,255,0.96)",
            color: disabled ? "#94a3b8" : "#0f172a",
            minHeight: 48,
            fontFamily: "inherit",
            boxSizing: "border-box",
            boxShadow: error ? "0 0 0 4px rgba(220, 38, 38, 0.08)" : "0 1px 2px rgba(15, 23, 42, 0.02)",
            ...inputStyle,
          }}
          onFocus={(event) => {
            if (!error && !disabled) {
              event.target.style.borderColor = "rgba(153, 27, 27, 0.45)"
              event.target.style.boxShadow = "0 0 0 4px rgba(153, 27, 27, 0.08)"
            }
            props.onFocus?.(event)
          }}
          onBlur={(event) => {
            if (!error && !disabled) {
              event.target.style.borderColor = "rgba(203, 213, 225, 0.95)"
              event.target.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.02)"
            }
            props.onBlur?.(event)
          }}
          {...props}
        />
      </div>
      {error ? <span style={{ fontSize: 12, color: "#dc2626", marginTop: -2 }}>{error}</span> : null}
    </div>
  )
}
