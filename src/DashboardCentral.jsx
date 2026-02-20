import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"
import { FaBalanceScale } from "react-icons/fa"
import { GiFarmer } from "react-icons/gi"
import { FaBuilding } from "react-icons/fa"
import { FaCheckCircle } from "react-icons/fa"
import { FaClock } from "react-icons/fa"
import { FaBoxes } from "react-icons/fa"

export default function DashboardCentral() {

  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({
    producteurs: 0,
    centres: 0,
    achats: 0,
    livraisonsValidees: 0,
    livraisonsAttente: 0,
    stockGlobal: 0
  })

  const [centresStats, setCentresStats] = useState([])

  useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    try {
      setLoading(true)

      /* ================= STATS GLOBALES ================= */

      const [
        producteursRes,
        centresRes,
        achatsRes,
        livraisonsValideesRes,
        livraisonsAttenteRes
      ] = await Promise.all([
        supabase.from("producteurs").select("*", { count: "exact", head: true }),
        supabase.from("centres").select("*", { count: "exact", head: true }),
        supabase.from("achats").select("*", { count: "exact", head: true }),
        supabase.from("livraisons").select("*", { count: "exact", head: true }).eq("statut", "VALIDEE"),
        supabase.from("livraisons").select("*", { count: "exact", head: true }).eq("statut", "EN_ATTENTE")
      ])

      /* ===== Calcul stock global ===== */

      const { data: achatsData } = await supabase
        .from("achats")
        .select("quantite")

      const { data: livraisonsData } = await supabase
        .from("livraisons")
        .select("quantite")
        .eq("statut", "VALIDEE")

      const totalAchats = achatsData
        ? achatsData.reduce((sum, item) => sum + (item.quantite || 0), 0)
        : 0

      const totalLivraisons = livraisonsData
        ? livraisonsData.reduce((sum, item) => sum + (item.quantite || 0), 0)
        : 0

      const stockGlobal = totalAchats - totalLivraisons

      setStats({
        producteurs: producteursRes.count || 0,
        centres: centresRes.count || 0,
        achats: achatsRes.count || 0,
        livraisonsValidees: livraisonsValideesRes.count || 0,
        livraisonsAttente: livraisonsAttenteRes.count || 0,
        stockGlobal
      })

      /* ================= STOCK PAR CENTRE ================= */

      const { data: centresData } = await supabase
        .from("centres")
        .select("id, nom, code")

      if (!centresData) return

      const centresCalcul = await Promise.all(
        centresData.map(async (centre) => {

          const { data: achatsCentre } = await supabase
            .from("achats")
            .select("quantite")
            .eq("centre_id", centre.id)

          const { data: livraisonsCentre } = await supabase
            .from("livraisons")
            .select("quantite")
            .eq("centre_id", centre.id)
            .eq("statut", "VALIDEE")

          const totalCentreAchats = achatsCentre
            ? achatsCentre.reduce((sum, item) => sum + (item.quantite || 0), 0)
            : 0

          const totalCentreLivraisons = livraisonsCentre
            ? livraisonsCentre.reduce((sum, item) => sum + (item.quantite || 0), 0)
            : 0

          return {
            id: centre.id,
            nom: centre.nom,
            code: centre.code,
            stock: totalCentreAchats - totalCentreLivraisons
          }
        })
      )

      setCentresStats(centresCalcul)

    } catch (error) {
      console.error("Erreur Dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Chargement du dashboard...</h2>
      </div>
    )
  }

  return (
    <div>

      {/* ================= CARTES PRINCIPALES ================= */}

      <div style={gridStyle}>
        <Card
  title={
    <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: "bold"}}>
      <GiFarmer size={50} color="#7a1f1f" />
      PRODUCTEURS
    </span>
  }
  value={stats.producteurs}
/>
        <Card
  title={
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 22,      // ⭐ taille du texte
        fontWeight: "bold"
      }}
    >
      <FaBuilding size={28} color="#7a1f1f" />
      CENTRES
    </span>
  }
  value={stats.centres}
/>
        <Card
  title={
    <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: "bold" }}>
      <FaBalanceScale size={50} color="#7a1f1f" />
      PESEE
    </span>
  }
  value={stats.achats}
/>
        <Card
  title={
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 22,
        fontWeight: "bold"
      }}
    >
      <FaCheckCircle size={50} color="#16a34a" />
      LIVRAISON VALIDEES
    </span>
  }
  value={stats.livraisonsValidees}
/>
        <Card
  title={
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 22,
        fontWeight: "bold"
      }}
    >
      <FaClock size={50} color="#f59e0b" />
      LIVRAISON EN ATTENTE
    </span>
  }
  value={stats.livraisonsAttente}
/>
        <Card
  title={
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 18,
        fontWeight: "bold"
      }}
    >
      <FaBoxes size={28} color="#6366f1" />
      STOCK GLOBAL
    </span>
  }
  value={stats.stockGlobal}
/>
      </div>

      {/* ================= STOCK PAR CENTRE ================= */}

      <div style={{ marginTop: 60 }}>

        <h2 style={sectionTitle}>
         STOCK PAR CENTRE :
        </h2>

        <div style={gridStyle}>
          {centresStats.map((centre) => (
            <div key={centre.id} style={centreCard}>
              <h4 style={{ margin: 0 }}>
                {centre.nom} [{centre.code}]
              </h4>

              <p style={{
                marginTop: 15,
                fontSize: 28,
                fontWeight: "bold",
                color: centre.stock < 100 ? "#ff4d4f" : "#16a34a"
              }}>
                {centre.stock} Kg
              </p>
            </div>
          ))}
        </div>

      </div>

    </div>
  )
}

/* ================= COMPONENTS ================= */

function Card({ title, value, highlight }) {
  return (
    <div style={{
      background: "white",
      padding: 30,
      borderRadius: 15,
      textAlign: "center",
      boxShadow: "0 15px 35px rgba(0,0,0,0.08)",
      border: highlight ? "2px solid #7a1f1f" : "none"
    }}>
      <h3 style={{ marginBottom: 15 }}>{title}</h3>
      <p style={{
        fontSize: 38,
        fontWeight: "bold",
        color: "#7a1f1f"
      }}>
        {value}
      </p>
    </div>
  )
}

/* ================= STYLES ================= */

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 25
}

const centreCard = {
  background: "white",
  padding: 25,
  borderRadius: 12,
  boxShadow: "0 10px 25px rgba(0,0,0,0.08)"
}

const sectionTitle = {
  marginBottom: 25,
  fontSize: 22,
  fontWeight: "bold"
}