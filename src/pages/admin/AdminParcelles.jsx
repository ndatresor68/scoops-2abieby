import { useEffect, useState } from "react"
import { supabase } from "../../supabaseClient"
import { FaMapMarkerAlt } from "react-icons/fa"
import Card from "../../components/ui/Card"
import ParcelMap from "../../components/maps/ParcelMap"
import { useMediaQuery } from "../../hooks/useMediaQuery"

/**
 * Vue admin pour afficher toutes les parcelles sur une carte Leaflet
 */
export default function AdminParcelles() {
  const [parcelles, setParcelles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedParcelle, setSelectedParcelle] = useState(null)
  const isMobile = useMediaQuery("(max-width: 640px)")

  useEffect(() => {
    fetchParcelles()
  }, [])

  async function fetchParcelles() {
    try {
      setLoading(true)
      
      // Récupérer toutes les parcelles avec les informations de producteur et centre
      const { data, error } = await supabase
        .from("parcelles")
        .select(`
          *,
          producteurs:producteur_id(nom, code),
          centres:centre_id(nom)
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[AdminParcelles] Error loading parcelles:", error)
        return
      }

      // Formater les données
      const formatted = (data || []).map((p) => ({
        ...p,
        producteur_nom: p.producteurs?.nom || "-",
        producteur_code: p.producteurs?.code || "-",
        centre_nom: p.centres?.nom || "-",
      }))

      setParcelles(formatted)
    } catch (error) {
      console.error("[AdminParcelles] Exception loading parcelles:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculer le centre de la carte (moyenne des centres des parcelles)
  const mapCenter = (() => {
    if (parcelles.length === 0) return [5.3600, -4.0083] // Côte d'Ivoire par défaut

    let totalLat = 0
    let totalLng = 0
    let count = 0

    parcelles.forEach((p) => {
      if (p.coordonnees) {
        try {
          const coords = JSON.parse(p.coordonnees)
          if (Array.isArray(coords) && coords.length > 0) {
            const firstPoint = coords[0]
            totalLat += firstPoint.lat || firstPoint[0]
            totalLng += firstPoint.lng || firstPoint[1]
            count++
          }
        } catch (err) {
          // Ignorer les erreurs de parsing
        }
      }
    })

    if (count === 0) return [5.3600, -4.0083]

    return [totalLat / count, totalLng / count]
  })()

  return (
    <div style={container}>
      <div style={header}>
        <div>
          <h1 style={title}>Carte des Parcelles</h1>
          <p style={subtitle}>
            Visualisation de toutes les parcelles mesurées ({parcelles.length})
          </p>
        </div>
      </div>

      {loading ? (
        <Card>
          <div style={loadingState}>
            <div style={spinner}></div>
            <p>Chargement de la carte...</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Carte principale */}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ height: isMobile ? "400px" : "600px", position: "relative" }}>
              <ParcelMap
                parcelles={parcelles}
                center={mapCenter}
                zoom={12}
                fullScreen={false}
              />
            </div>
          </Card>

          {/* Liste des parcelles */}
          <Card>
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: "18px", fontWeight: 700 }}>
              Liste des Parcelles
            </h3>
            
            {parcelles.length === 0 ? (
              <div style={emptyState}>
                <p style={emptyText}>Aucune parcelle enregistrée</p>
              </div>
            ) : (
              <div style={tableContainer}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Code</th>
                      <th style={th}>Producteur</th>
                      <th style={th}>Centre</th>
                      <th style={th}>Superficie (ha)</th>
                      <th style={th}>Date mesure</th>
                      <th style={th}>Type Cacao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parcelles.map((p) => (
                      <tr
                        key={p.id}
                        style={{
                          cursor: "pointer",
                          background: selectedParcelle?.id === p.id ? "#f3f4f6" : "transparent",
                        }}
                        onClick={() => setSelectedParcelle(p)}
                      >
                        <td style={td}>
                          <strong>{p.code_parcelle || "-"}</strong>
                        </td>
                        <td style={td}>
                          <strong>{p.producteur_nom}</strong>
                          <br />
                          <small style={{ color: "#6b7280" }}>{p.producteur_code}</small>
                        </td>
                        <td style={td}>{p.centre_nom}</td>
                        <td style={td}>
                          {p.superficie ? Number(p.superficie).toFixed(4) : "-"}
                        </td>
                        <td style={td}>{p.date_mesure || "-"}</td>
                        <td style={td}>{p.type_cacao || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Détails de la parcelle sélectionnée */}
          {selectedParcelle && (
            <Card>
              <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: "18px", fontWeight: 700 }}>
                Détails de la Parcelle
              </h3>
              <div style={detailsGrid}>
                <div style={detailItem}>
                  <strong>Code parcelle:</strong> {selectedParcelle.code_parcelle || "-"}
                </div>
                <div style={detailItem}>
                  <strong>Producteur:</strong> {selectedParcelle.producteur_nom} ({selectedParcelle.producteur_code})
                </div>
                <div style={detailItem}>
                  <strong>Centre:</strong> {selectedParcelle.centre_nom}
                </div>
                <div style={detailItem}>
                  <strong>Superficie:</strong> {selectedParcelle.superficie ? Number(selectedParcelle.superficie).toFixed(4) : "-"} hectares
                </div>
                <div style={detailItem}>
                  <strong>Date mesure:</strong> {selectedParcelle.date_mesure || "-"}
                </div>
                <div style={detailItem}>
                  <strong>Type cacao:</strong> {selectedParcelle.type_cacao || "-"}
                </div>
                <div style={detailItem}>
                  <strong>Année plantation:</strong> {selectedParcelle.annee_plantation || "-"}
                </div>
                {selectedParcelle.notes && (
                  <div style={{ ...detailItem, gridColumn: "1 / -1" }}>
                    <strong>Notes:</strong> {selectedParcelle.notes}
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// Styles
const container = {
  display: "flex",
  flexDirection: "column",
  gap: 32,
}

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: 20,
  marginBottom: 8,
}

const title = {
  margin: 0,
  fontSize: "28px",
  fontWeight: 700,
  color: "#0f172a",
  letterSpacing: "-0.03em",
}

const subtitle = {
  margin: "6px 0 0 0",
  fontSize: "14px",
  color: "#64748b",
  fontWeight: 500,
}

const loadingState = {
  padding: 60,
  textAlign: "center",
  color: "#6b7280",
}

const spinner = {
  width: "40px",
  height: "40px",
  border: "4px solid #e5e7eb",
  borderTopColor: "#7a1f1f",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
  margin: "0 auto 16px",
}

const emptyState = {
  padding: 60,
  textAlign: "center",
}

const emptyText = {
  color: "#6b7280",
  fontSize: "15px",
}

const tableContainer = {
  overflowX: "auto",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
}

const table = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "800px",
}

const th = {
  padding: "16px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: 600,
  color: "#6b7280",
  background: "#f9fafb",
  borderBottom: "2px solid #e5e7eb",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
}

const td = {
  padding: "16px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: "14px",
  color: "#1f2937",
}

const detailsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 16,
}

const detailItem = {
  padding: "12px",
  background: "#f9fafb",
  borderRadius: "8px",
  fontSize: "14px",
  color: "#1f2937",
}
