import { useMediaQuery } from "../../hooks/useMediaQuery"

const VARIANTS = {
  primary: {
    background: "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)",
    color: "#ffffff",
    border: "1px solid rgba(153, 27, 27, 0.16)",
    boxShadow: "0 14px 30px rgba(153, 27, 27, 0.22)",
    hoverShadow: "0 18px 34px rgba(153, 27, 27, 0.28)",
  },
  secondary: {
    background: "rgba(255, 255, 255, 0.94)",
    color: "#0f172a",
    border: "1px solid rgba(203, 213, 225, 0.95)",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
    hoverShadow: "0 14px 30px rgba(15, 23, 42, 0.1)",
  },
  danger: {
    background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
    color: "#ffffff",
    border: "1px solid rgba(220, 38, 38, 0.18)",
    boxShadow: "0 14px 30px rgba(220, 38, 38, 0.2)",
    hoverShadow: "0 18px 34px rgba(220, 38, 38, 0.26)",
  },
  success: {
    background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    color: "#ffffff",
    border: "1px solid rgba(5, 150, 105, 0.18)",
    boxShadow: "0 14px 30px rgba(5, 150, 105, 0.2)",
    hoverShadow: "0 18px 34px rgba(5, 150, 105, 0.26)",
  },
  ghost: {
    background: "transparent",
    color: "#475569",
    border: "1px solid transparent",
    boxShadow: "none",
    hoverShadow: "none",
  },
}

const DESKTOP_SIZES = {
  sm: { padding: "9px 14px", fontSize: "13px", minHeight: 38 },
  md: { padding: "11px 18px", fontSize: "14px", minHeight: 44 },
  lg: { padding: "14px 22px", fontSize: "15px", minHeight: 50 },
}

const MOBILE_SIZES = {
  sm: { padding: "10px 14px", fontSize: "13px", minHeight: 40 },
  md: { padding: "12px 18px", fontSize: "14px", minHeight: 46 },
  lg: { padding: "15px 22px", fontSize: "15px", minHeight: 52 },
}

export default function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  icon,
  style = {},
  fullWidth = false,
  ...props
}) {
  const isMobile = useMediaQuery("(max-width: 640px)")
  const palette = VARIANTS[variant] || VARIANTS.primary
  const sizeStyles = (isMobile ? MOBILE_SIZES : DESKTOP_SIZES)[size] || DESKTOP_SIZES.md

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      style={{
        appearance: "none",
        borderRadius: 16,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, opacity 0.22s ease, background 0.22s ease",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        width: fullWidth ? "100%" : undefined,
        whiteSpace: "nowrap",
        opacity: disabled ? 0.55 : 1,
        transform: "translateY(0)",
        fontFamily: "inherit",
        lineHeight: 1,
        ...palette,
        ...sizeStyles,
        ...style,
      }}
      onMouseEnter={(event) => {
        if (!disabled) {
          event.currentTarget.style.transform = "translateY(-1px)"
          event.currentTarget.style.boxShadow = palette.hoverShadow
        }
        props.onMouseEnter?.(event)
      }}
      onMouseLeave={(event) => {
        if (!disabled) {
          event.currentTarget.style.transform = "translateY(0)"
          event.currentTarget.style.boxShadow = palette.boxShadow
        }
        props.onMouseLeave?.(event)
      }}
      onMouseDown={(event) => {
        if (!disabled) {
          event.currentTarget.style.transform = "translateY(0)"
        }
        props.onMouseDown?.(event)
      }}
      onMouseUp={(event) => {
        if (!disabled) {
          event.currentTarget.style.transform = "translateY(-1px)"
        }
        props.onMouseUp?.(event)
      }}
      {...props}
    >
      {icon ? <span style={{ display: "flex", alignItems: "center", fontSize: "0.95em" }}>{icon}</span> : null}
      {children}
    </button>
  )
}
