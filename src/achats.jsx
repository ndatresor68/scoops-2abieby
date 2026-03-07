import { useEffect, useMemo, useState } from "react"
import { supabase } from "./supabaseClient"
import { FaPlus, FaFilePdf, FaMagnifyingGlass, FaCalendar } from "react-icons/fa6"
import { jsPDF } from "jspdf"
import Card from "./components/ui/Card"
import Button from "./components/ui/Button"
import Input from "./components/ui/Input"
import Modal from "./components/ui/Modal"
import { useToast } from "./components/ui/Toast"
import { useAuth } from "./context/AuthContext"
import { useMediaQuery } from "./hooks/useMediaQuery"

export default function Achats() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const isMobile = useMediaQuery("(max-width: 640px)")

  const [achats, setAchats] = useState([])
  const [producteurs, setProducteurs] = useState([])
  const [selectedProdId, setSelectedProdId] = useState("")
  const [centres, setCentres] = useState([])

  const [sacs, setSacs] = useState("")
  const [poids, setPoids] = useState("")
  const [prixKg, setPrixKg] = useState("")

  const selectedProd = useMemo(
    () => producteurs.find((p) => String(p.id) === String(selectedProdId)) || null,
    [producteurs, selectedProdId],
  )

  const montant = poids && prixKg ? Number(poids) * Number(prixKg) : 0

  async function fetchInitialData() {
    setLoading(true)
    try {
      const [{ data: producteursData }, { data: centresData }, { data: achatsData }] = await Promise.all([
        supabase.from("producteurs").select("*").order("nom"),
        supabase.from("centres").select("id, nom").order("nom"),
        supabase.from("achats").select("*").order("created_at", { ascending: false }),
      ])

    setProducteurs(producteursData || [])
    setCentres(centresData || [])
    setAchats(achatsData || [])
    } catch (error) {
      showToast("Erreur lors du chargement", "error")
    } finally {
    setLoading(false)
    }
  }

  useEffect(() => {
    fetchInitialData()
  }, [])

  function getCentreNom(centreId) {
    return centres.find((c) => String(c.id) === String(centreId))?.nom || ""
  }

  function resetForm() {
    setSelectedProdId("")
    setSacs("")
    setPoids("")
    setPrixKg("")
  }

  async function savePesee() {
    if (!selectedProd) {
      showToast("Choisissez un producteur", "error")
      return
    }

    if (!poids || !prixKg) {
      showToast("Remplissez le poids et le prix", "error")
      return
    }

    try {
    const payload = {
      producteur_id: selectedProd.id,
      centre_id: selectedProd.centre_id || null,
      nom_producteur: selectedProd.nom,
      code_producteur: selectedProd.code,
      sacs: Number(sacs) || 0,
      poids: Number(poids),
      prix_kg: Number(prixKg),
      montant,
      utilisateur_id: user?.id || null,
    }

    const { error } = await supabase.from("achats").insert([payload])

      if (error) throw error

      showToast("Pesée enregistrée avec succès", "success")
      setShowForm(false)
      resetForm()
      await fetchInitialData()
    } catch (error) {
      console.error(error)
      showToast("Erreur lors de l'enregistrement", "error")
    }
  }

  async function generatePDFReceipt(achat) {
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Logo et en-tête
      doc.setFillColor(122, 31, 31)
      doc.rect(0, 0, pageWidth, 40, "F")

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont("helvetica", "bold")
      doc.text("SCOOP ASAB-COOP-CA", pageWidth / 2, 18, { align: "center" })

      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")
      doc.text("Union • Discipline • Travail", pageWidth / 2, 28, { align: "center" })

      // Titre du document
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("REÇU DE PESÉE", pageWidth / 2, 55, { align: "center" })

      // Informations
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      const startY = 70

      doc.setFont("helvetica", "bold")
      doc.text("Date :", 20, startY)
      doc.setFont("helvetica", "normal")
      doc.text(
        achat.created_at ? new Date(achat.created_at).toLocaleDateString("fr-FR") : "-",
        50,
        startY,
      )

      doc.setFont("helvetica", "bold")
      doc.text("Centre :", 20, startY + 8)
      doc.setFont("helvetica", "normal")
      doc.text(getCentreNom(achat.centre_id) || "-", 50, startY + 8)

      // Ligne de séparation
      doc.setDrawColor(200, 200, 200)
      doc.line(20, startY + 18, pageWidth - 20, startY + 18)

      // Informations producteur
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("INFORMATIONS PRODUCTEUR", 20, startY + 30)

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      let yPos = startY + 40

      doc.setFont("helvetica", "bold")
      doc.text("Nom :", 20, yPos)
      doc.setFont("helvetica", "normal")
      doc.text(achat.nom_producteur || "-", 50, yPos)

      doc.setFont("helvetica", "bold")
      doc.text("Code :", 20, yPos + 8)
      doc.setFont("helvetica", "normal")
      doc.text(achat.code_producteur || "-", 50, yPos + 8)

      // Détails de la pesée
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("DÉTAILS DE LA PESÉE", 20, yPos + 25)

      doc.setFontSize(10)
      yPos += 35

      const details = [
        ["Nombre de sacs", achat.sacs || 0],
        ["Poids net (Kg)", achat.poids || 0],
        ["Prix par Kg (FCFA)", Number(achat.prix_kg || 0).toLocaleString()],
      ]

      details.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold")
        doc.text(`${label} :`, 20, yPos)
        doc.setFont("helvetica", "normal")
        doc.text(String(value), 80, yPos)
        yPos += 8
      })

      // Ligne de séparation
      doc.setDrawColor(200, 200, 200)
      doc.line(20, yPos + 5, pageWidth - 20, yPos + 5)

      // Montant total
      yPos += 15
      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.setFillColor(245, 245, 245)
      doc.rect(20, yPos - 5, pageWidth - 40, 12, "F")
      doc.text("MONTANT TOTAL :", 20, yPos + 3)
      doc.setFontSize(16)
      doc.text(
        `${Number(achat.montant || 0).toLocaleString()} FCFA`,
        pageWidth - 20,
        yPos + 3,
        { align: "right" },
      )

      // Zone signature
      yPos = pageHeight - 50
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.line(20, yPos, 80, yPos)
      doc.text("Signature Agent", 20, yPos + 8)

      doc.line(pageWidth - 80, yPos, pageWidth - 20, yPos)
      doc.text("Signature Producteur", pageWidth - 80, yPos + 8)

      // Pied de page
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20)
      doc.text("Document généré automatiquement - SCOOP ASAB-COOP-CA", pageWidth / 2, pageHeight - 12, {
        align: "center",
      })
      doc.text("Contacts : 0758005921 / 0506458555 / 0748009763", pageWidth / 2, pageHeight - 6, {
        align: "center",
      })

      const fileName = `Reçu_Pesée_${achat.code_producteur}_${new Date(achat.created_at).toISOString().split("T")[0]}.pdf`
      doc.save(fileName)
      showToast("PDF généré avec succès", "success")
    } catch (error) {
      console.error("Erreur génération PDF:", error)
      showToast("Erreur lors de la génération du PDF", "error")
    }
  }

  const filteredAchats = achats.filter(
    (a) =>
      a.nom_producteur?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code_producteur?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCentreNom(a.centre_id)?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div style={container}>
      <div style={{
        ...header,
        flexDirection: isMobile ? "column" : "row",
      }}>
        <div>
          <h1 style={{
            ...title,
            fontSize: isMobile ? "24px" : "32px",
          }}>Gestion des Achats / Pesées</h1>
          <p style={subtitle}>Enregistrez et gérez les pesées de cacao</p>
        </div>
        <Button onClick={() => setShowForm(true)} icon={<FaPlus />} style={{
          width: isMobile ? "100%" : "auto",
        }}>
          {isMobile ? "Nouvelle pesée" : "Nouvelle pesée"}
        </Button>
      </div>

      <Card>
        <div style={searchBar}>
          <Input
            icon={<FaMagnifyingGlass />}
            placeholder="Rechercher une pesée..."
            value={searchTerm}
            onChange={setSearchTerm}
            style={{ flex: 1, maxWidth: "400px" }}
          />
          <div style={statsBadge}>
            {filteredAchats.length} pesée{filteredAchats.length > 1 ? "s" : ""}
          </div>
        </div>

        {loading ? (
          <div style={loadingState}>
            <div style={spinner}></div>
            <p>Chargement...</p>
          </div>
        ) : filteredAchats.length === 0 ? (
          <div style={emptyState}>
            <p style={emptyText}>
              {searchTerm ? "Aucune pesée trouvée" : "Aucune pesée enregistrée"}
            </p>
          </div>
        ) : (
          <div style={tableContainer}>
        <table style={table}>
          <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Producteur</th>
                  <th style={th}>Code</th>
                  <th style={th}>Centre</th>
                  <th style={th}>Sacs</th>
                  <th style={th}>Poids (Kg)</th>
                  <th style={th}>Prix/Kg</th>
                  <th style={th}>Montant</th>
                  <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
                {filteredAchats.map((a) => (
                  <tr key={a.id}>
                    <td style={td}>
                      <div style={dateCell}>
                        <FaCalendar style={{ color: "#6b7280", fontSize: 12, marginRight: 6 }} />
                        <span>
                          {a.created_at ? new Date(a.created_at).toLocaleDateString("fr-FR") : "-"}
                        </span>
                      </div>
                    </td>
                    <td style={td}>
                      <strong style={nameText}>{a.nom_producteur || "-"}</strong>
                    </td>
                    <td style={td}>
                      <span style={codeBadge}>{a.code_producteur || "-"}</span>
                    </td>
                    <td style={td}>{getCentreNom(a.centre_id) || "-"}</td>
                    <td style={td}>{a.sacs ?? "-"}</td>
                    <td style={td}>
                      <strong>{a.poids ?? "-"}</strong>
                    </td>
                    <td style={td}>{Number(a.prix_kg || 0).toLocaleString()} FCFA</td>
                    <td style={td}>
                      <strong style={montantText}>
                        {Number(a.montant || 0).toLocaleString()} FCFA
                      </strong>
                    </td>
                    <td style={td}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => generatePDFReceipt(a)}
                        icon={<FaFilePdf />}
                        style={{
                          width: isMobile ? "100%" : "auto",
                          minWidth: isMobile ? "100%" : "auto",
                        }}
                      >
                        PDF
                      </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        )}
      </Card>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          resetForm()
        }}
        title="Nouvelle pesée"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            savePesee()
          }}
        >
          <div style={formGrid}>
            <div style={formGroup}>
              <label style={label}>Producteur *</label>
              <select
                value={selectedProdId}
                onChange={(e) => setSelectedProdId(e.target.value)}
                style={selectInput}
                required
              >
                <option value="">Choisir un producteur</option>
                {producteurs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Code producteur"
              value={selectedProd?.code || ""}
              readOnly
              disabled
              style={{ background: "#f9fafb" }}
            />

            <Input
              label="Centre"
              value={getCentreNom(selectedProd?.centre_id) || "-"}
              readOnly
              disabled
              style={{ background: "#f9fafb" }}
            />

            <Input
              label="Nombre de sacs"
                type="number"
                min="0"
                value={sacs}
              onChange={setSacs}
              placeholder="0"
              />

            <Input
              label="Poids net (Kg) *"
                type="number"
                min="0"
              step="0.01"
                value={poids}
              onChange={setPoids}
              required
              placeholder="0.00"
              />

            <Input
              label="Prix par Kg (FCFA) *"
                type="number"
                min="0"
              step="0.01"
                value={prixKg}
              onChange={setPrixKg}
              required
              placeholder="0.00"
              />
          </div>

          <div style={montantBox}>
            <div style={montantLabel}>Montant total</div>
            <div style={montantValue}>{montant.toLocaleString()} FCFA</div>
            </div>

          <div style={agentInfo}>
            <strong>Agent :</strong> {user?.email || "-"}
          </div>

          <div style={{
            ...modalActions,
            flexDirection: isMobile ? "column" : "row",
          }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
              style={{
                width: isMobile ? "100%" : "auto",
              }}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary" style={{
              width: isMobile ? "100%" : "auto",
            }}>
              Enregistrer la pesée
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

const container = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
}

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: 16,
}

const title = {
  margin: 0,
  fontSize: "32px",
  fontWeight: 800,
  color: "#1f2937",
  letterSpacing: "-0.02em",
}

const subtitle = {
  margin: "8px 0 0 0",
  fontSize: "15px",
  color: "#6b7280",
}

const searchBar = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  marginBottom: 24,
  flexWrap: "wrap",
}

const statsBadge = {
  padding: "8px 16px",
  background: "#f3f4f6",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#6b7280",
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
  minWidth: "900px",
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

const dateCell = {
  display: "flex",
  alignItems: "center",
  color: "#6b7280",
}

const nameText = {
  color: "#1f2937",
  fontSize: "15px",
}

const codeBadge = {
  padding: "6px 12px",
  background: "#fef2f2",
  color: "#7a1f1f",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
}

const montantText = {
  color: "#16a34a",
  fontSize: "15px",
}

const formGrid = {
  display: "grid",
  gap: 16,
  marginBottom: 20,
}

const formGroup = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
}

const label = {
  fontSize: "13px",
  color: "#6b7280",
  fontWeight: 600,
}

const selectInput = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #e5e7eb",
  fontSize: "14px",
  outline: "none",
  background: "white",
}

const montantBox = {
  background: "linear-gradient(135deg, #f9fafb, #f3f4f6)",
  padding: "20px",
  borderRadius: "12px",
  marginBottom: 20,
  border: "2px solid #e5e7eb",
}

const montantLabel = {
  fontSize: "13px",
  color: "#6b7280",
  fontWeight: 600,
  marginBottom: 8,
}

const montantValue = {
  fontSize: "28px",
  fontWeight: 800,
  color: "#7a1f1f",
}

const agentInfo = {
  padding: "12px",
  background: "#f9fafb",
  borderRadius: "8px",
  fontSize: "13px",
  color: "#6b7280",
  marginBottom: 20,
}

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 24,
  paddingTop: 24,
  borderTop: "1px solid #e5e7eb",
  flexWrap: "wrap",
}
