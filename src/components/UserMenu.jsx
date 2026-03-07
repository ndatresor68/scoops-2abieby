import { useMemo, useState, useEffect, useRef } from "react"
import { FaChevronDown, FaGear, FaRightFromBracket, FaUser } from "react-icons/fa6"
import { useAuth } from "../context/AuthContext"
import { useMediaQuery } from "../hooks/useMediaQuery"

function initialsFromName(name, email) {
  if (name) {
    const parts = name.trim().split(" ").filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  return (email || "U").slice(0, 2).toUpperCase()
}

export default function UserMenu({ onOpenProfile, onOpenSettings }) {
  const [open, setOpen] = useState(false)
  const { user, profile, role, displayName, signOut } = useAuth()
  const isMobile = useMediaQuery("(max-width: 640px)")
  const menuRef = useRef(null)
  
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  const initials = useMemo(
    () => initialsFromName(displayName, user?.email),
    [displayName, user?.email],
  )

  return (
    <div style={wrapper} ref={menuRef}>
      <button style={{
        ...trigger,
        padding: isMobile ? "6px 10px" : "8px 12px",
      }} onClick={() => setOpen((v) => !v)}>
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={displayName} style={{
            ...avatarImage,
            width: isMobile ? 32 : 36,
            height: isMobile ? 32 : 36,
          }} />
        ) : (
          <div style={{
            ...avatar,
            width: isMobile ? 32 : 36,
            height: isMobile ? 32 : 36,
            fontSize: isMobile ? 10 : 12,
          }}>{initials}</div>
        )}
        {!isMobile && (
          <div style={userInfo}>
            <strong style={{ fontSize: 13 }}>{displayName}</strong>
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              {user?.email} • {role}
            </span>
          </div>
        )}
        {!isMobile && <FaChevronDown size={12} />}
      </button>

      {open && (
        <div style={{
          ...menu,
          minWidth: isMobile ? 180 : 220,
        }}>
          <button
            style={menuItem}
            onClick={() => {
              onOpenProfile()
              setOpen(false)
            }}
          >
            <FaUser size={14} /> Profil
          </button>
          <button
            style={menuItem}
            onClick={() => {
              onOpenSettings()
              setOpen(false)
            }}
          >
            <FaGear size={14} /> Parametres
          </button>
          <button
            style={dangerItem}
            onClick={async () => {
              await signOut()
              setOpen(false)
            }}
          >
            <FaRightFromBracket size={14} /> Deconnexion
          </button>
        </div>
      )}
    </div>
  )
}

const wrapper = {
  position: "relative",
}

const trigger = {
  border: "none",
  background: "white",
  borderRadius: 14,
  padding: "8px 12px",
  display: "flex",
  alignItems: "center",
  gap: 10,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(0,0,0,0.08)",
}

const avatar = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(135deg, #b02a2a, #7a1f1f)",
  color: "white",
  fontSize: 12,
  fontWeight: 700,
}

const avatarImage = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  objectFit: "cover",
  border: "2px solid #f1f5f9",
}

const userInfo = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
}

const menu = {
  position: "absolute",
  right: 0,
  top: "calc(100% + 8px)",
  minWidth: 220,
  background: "white",
  borderRadius: 12,
  boxShadow: "0 16px 30px rgba(0,0,0,0.15)",
  padding: 8,
  zIndex: 2000,
}

const menuItem = {
  width: "100%",
  border: "none",
  borderRadius: 8,
  padding: "10px 12px",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  textAlign: "left",
}

const dangerItem = {
  ...menuItem,
  color: "#b91c1c",
}
