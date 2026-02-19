import { useState, useEffect } from "react"
import { supabase } from "./supabaseClient"
import Login from "./Login"
import DashboardCentral from "./DashboardCentral"
import Producteurs from "./Producteurs"
import Centres from "./Centres"
import Parametres from "./Parametres"

export default function App() {

  const [user, setUser] = useState(null)
  const [page, setPage] = useState("dashboard")
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null)
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (!user) {
    return <Login onLogin={setUser} />
  }

  /* ===== STYLES DYNAMIQUES ===== */

  const menuStyle = {
    width: "260px",
    background: "#7a1f1f",
    color: "white",
    padding: "20px",
    boxSizing: "border-box",
    position: "fixed",
    left: menuOpen ? "0" : "-260px",
    top: "0",
    height: "100vh",
    transition: "left 0.3s ease",
    zIndex: 1000
  }

  const rightZone = {
    marginLeft: "0",
    width: "100%",
    display: "flex",
    flexDirection: "column"
  }

  const headerStyle = {
    height: "70px",
    background: "linear-gradient(90deg,#7a1f1f,#b02a2a)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "bold",
    letterSpacing: "2px",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 500
  }

  return (
    <div style={appContainer}>

      {/* ===== BOUTON MENU MOBILE ===== */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        style={menuButtonStyle}
      >
        ☰
      </button>

      {/* ===== MENU ===== */}
      <div style={menuStyle}>

        <h2 style={logoStyle}>
          SCOOP ASAB-COOP-CA
        </h2>

        <div style={{ flex: 1 }}>
          <MenuButton active={page==="dashboard"} onClick={()=>{setPage("dashboard"); setMenuOpen(false)}} text="📊 Dashboard" />
          <MenuButton active={page==="producteurs"} onClick={()=>{setPage("producteurs"); setMenuOpen(false)}} text="👨‍🌾 Producteurs" />
          <MenuButton active={page==="centres"} onClick={()=>{setPage("centres"); setMenuOpen(false)}} text="🏢 Centres" />
          <MenuButton active={page==="parametres"} onClick={()=>{setPage("parametres"); setMenuOpen(false)}} text="⚙️ Paramètres" />
        </div>

        <button style={logoutStyle} onClick={handleLogout}>
          🚪 Déconnexion
        </button>

      </div>

      {/* ===== ZONE DROITE ===== */}
      <div style={rightZone}>

        {/* HEADER */}
        <div style={headerStyle}>
          {page === "dashboard" && "TABLEAU CENTRAL"}
          {page === "producteurs" && "GESTION DES PRODUCTEURS"}
          {page === "centres" && "GESTION DES CENTRES"}
          {page === "parametres" && "PARAMÈTRES"}
        </div>

        {/* CONTENU */}
        <div style={contentStyle}>
          {page === "dashboard" && <DashboardCentral />}
          {page === "producteurs" && <Producteurs />}
          {page === "centres" && <Centres />}
          {page === "parametres" && <Parametres />}
        </div>

      </div>

    </div>
  )
}

/* ===== STYLES FIXES ===== */

const appContainer = {
  display: "flex",
  height: "100vh",
  overflow: "hidden"
}

const logoStyle = {
  textAlign: "center",
  marginBottom: "40px",
  fontWeight: "bold"
}

const contentStyle = {
  marginTop: "70px",
  padding: "20px",
  overflowY: "auto",
  flex: 1,
  background: "#f4f6f9"
}

const logoutStyle = {
  width: "100%",
  padding: "12px",
  background: "#8b0000",
  border: "none",
  borderRadius: "8px",
  color: "white",
  cursor: "pointer"
}

const menuButtonStyle = {
  position: "fixed",
  top: "15px",
  left: "15px",
  fontSize: "26px",
  background: "#8B0000",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "8px 12px",
  cursor: "pointer",
  zIndex: 2000
}

/* ===== MENU BUTTON ===== */

function MenuButton({ text, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "14px",
        marginBottom: "15px",
        borderRadius: "10px",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        background: active ? "white" : "rgba(255,255,255,0.15)",
        color: active ? "#7a1f1f" : "white",
        fontWeight: "600"
      }}
    >
      {text}
    </button>
  )
}