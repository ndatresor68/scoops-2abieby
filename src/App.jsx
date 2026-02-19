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

  return (
    <div style={appContainer}>

      {/* ===== MENU FIXE ===== */}
      <div style={menuStyle}>

        <h2 style={logoStyle}>
          SCOOPS 2A-BIEBY
        </h2>

        <div style={{ flex: 1 }}>
          <MenuButton active={page==="dashboard"} onClick={()=>setPage("dashboard")} text="📊 Dashboard" />
          <MenuButton active={page==="producteurs"} onClick={()=>setPage("producteurs")} text="👨‍🌾 Producteurs" />
          <MenuButton active={page==="centres"} onClick={()=>setPage("centres")} text="🏢 Centres" />
          <MenuButton active={page==="parametres"} onClick={()=>setPage("parametres")} text="⚙️ Paramètres" />
        </div>

        <button style={logoutStyle} onClick={handleLogout}>
          🚪 Déconnexion
        </button>

      </div>

      {/* ===== ZONE DROITE ===== */}
      <div style={rightZone}>

        {/* HEADER FIXE */}
        <div style={headerStyle}>
          {page === "dashboard" && "TABLEAU CENTRAL"}
          {page === "producteurs" && "GESTION DES PRODUCTEURS"}
          {page === "centres" && "GESTION DES CENTRES"}
          {page === "parametres" && "PARAMÈTRES"}
        </div>

        {/* CONTENU SCROLLABLE */}
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

/* ================= STRUCTURE ================= */

const appContainer = {
  display: "flex",
  height: "100vh",
  overflow: "hidden"
}

const menuStyle = {
  width: "240px",
  background: "linear-gradient(180deg,#5c1111,#a61e1e)",
  color: "white",
  padding: "25px",
  display: "flex",
  flexDirection: "column",
  position: "fixed",
  height: "100vh",
  left: 0,
  top: 0
}

const logoStyle = {
  textAlign: "center",
  marginBottom: "40px",
  fontWeight: "bold",
  letterSpacing: "1px"
}

const rightZone = {
  marginLeft: "240px",
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
  fontSize: "22px",
  fontWeight: "bold",
  letterSpacing: "2px",
  position: "fixed",
  top: 0,
  left: "240px",
  right: 0,
  zIndex: 1000
}

const contentStyle = {
  marginTop: "70px",
  padding: "30px",
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

/* ================= MENU BUTTON ================= */

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
        fontWeight: "600",
        transition: "0.2s"
      }}
    >
      {text}
    </button>
  )
}