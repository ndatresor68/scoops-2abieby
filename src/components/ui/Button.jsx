export default function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  icon,
  style = {},
  ...props
}) {
  const baseStyle = {
    border: "none",
    borderRadius: "10px",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    opacity: disabled ? 0.6 : 1,
    ...style,
  }

  const variants = {
    primary: {
      background: "linear-gradient(90deg, #7a1f1f, #b02a2a)",
      color: "white",
      boxShadow: "0 4px 12px rgba(122, 31, 31, 0.3)",
    },
    secondary: {
      background: "white",
      color: "#374151",
      border: "1px solid #d1d5db",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    },
    danger: {
      background: "#dc2626",
      color: "white",
      boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
    },
    success: {
      background: "#16a34a",
      color: "white",
      boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)",
    },
    ghost: {
      background: "transparent",
      color: "#6b7280",
    },
  }

  const sizes = {
    sm: { padding: "8px 12px", fontSize: "13px" },
    md: { padding: "10px 16px", fontSize: "14px" },
    lg: { padding: "12px 20px", fontSize: "15px" },
  }

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      style={{
        ...baseStyle,
        ...variants[variant],
        ...sizes[size],
      }}
      {...props}
    >
      {icon && <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>}
      {children}
    </button>
  )
}
