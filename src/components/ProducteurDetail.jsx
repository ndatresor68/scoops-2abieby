import { FaPhone, FaUser, FaCalendar, FaBuilding, FaIdCard, FaFile } from "react-icons/fa"
import Modal from "./ui/Modal"
import Card from "./ui/Card"
import { useMediaQuery } from "../hooks/useMediaQuery"

export default function ProducteurDetail({ producteur, centres, isOpen, onClose }) {
  const isMobile = useMediaQuery("(max-width: 640px)")

  if (!producteur) return null

  function getCentreNom(centreId) {
    if (!centreId) return "Non assigné"
    const centre = centres.find((c) => String(c.id) === String(centreId))
    return centre?.nom || "Non assigné"
  }

  function formatDate(dateString) {
    if (!dateString) return "Non disponible"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return "Non disponible"
    }
  }

  const documents = [
    { key: "photo_cni_recto", label: "CNI Recto", icon: <FaIdCard /> },
    { key: "photo_cni_verso", label: "CNI Verso", icon: <FaIdCard /> },
    { key: "carte_planteur", label: "Carte Planteur", icon: <FaFile /> },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Détails du producteur" size="lg">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Photo et informations principales */}
        <div style={infoSection}>
          <div style={photoContainer}>
            {producteur.photo ? (
              <img src={producteur.photo} alt={producteur.nom} style={photoImage} />
            ) : (
              <div style={photoPlaceholder}>
                <FaUser style={{ fontSize: 48, color: "#9ca3af" }} />
              </div>
            )}
          </div>

          <div style={mainInfo}>
            <h2 style={nameTitle}>{producteur.nom || "Non renseigné"}</h2>
            <div style={infoGrid}>
              <div style={infoItem}>
                <FaPhone style={infoIcon} />
                <div>
                  <div style={infoLabel}>Téléphone</div>
                  <div style={infoValue}>{producteur.telephone || "-"}</div>
                </div>
              </div>

              <div style={infoItem}>
                <FaBuilding style={infoIcon} />
                <div>
                  <div style={infoLabel}>Centre</div>
                  <div style={infoValue}>{getCentreNom(producteur.centre_id)}</div>
                </div>
              </div>

              <div style={infoItem}>
                <FaCalendar style={infoIcon} />
                <div>
                  <div style={infoLabel}>Date d'enregistrement</div>
                  <div style={infoValue}>{formatDate(producteur.created_at)}</div>
                </div>
              </div>

              {producteur.code && (
                <div style={infoItem}>
                  <FaIdCard style={infoIcon} />
                  <div>
                    <div style={infoLabel}>Code</div>
                    <div style={infoValue}>{producteur.code}</div>
                  </div>
                </div>
              )}

              {producteur.sexe && (
                <div style={infoItem}>
                  <FaUser style={infoIcon} />
                  <div>
                    <div style={infoLabel}>Sexe</div>
                    <div style={infoValue}>{producteur.sexe}</div>
                  </div>
                </div>
              )}

              {producteur.localite && (
                <div style={infoItem}>
                  <FaBuilding style={infoIcon} />
                  <div>
                    <div style={infoLabel}>Localité</div>
                    <div style={infoValue}>{producteur.localite}</div>
                  </div>
                </div>
              )}

              {producteur.statut && (
                <div style={infoItem}>
                  <FaUser style={infoIcon} />
                  <div>
                    <div style={infoLabel}>Statut</div>
                    <div style={infoValue}>
                      <span style={statutBadge(producteur.statut)}>{producteur.statut}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Documents */}
        <Card>
          <h3 style={sectionTitle}>Documents</h3>
          <div style={documentsGrid}>
            {documents.map((doc) => {
              const docUrl = producteur[doc.key]
              return (
                <div key={doc.key} style={documentCard}>
                  <div style={documentHeader}>
                    {doc.icon}
                    <span style={documentLabel}>{doc.label}</span>
                  </div>
                  {docUrl ? (
                    <div style={documentImageContainer}>
                      <img src={docUrl} alt={doc.label} style={documentImage} />
                    </div>
                  ) : (
                    <div style={documentPlaceholder}>
                      <span style={documentPlaceholderText}>Document non disponible</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </Modal>
  )
}

const infoSection = {
  display: "flex",
  gap: 24,
  flexDirection: "column",
  alignItems: "center",
}

const photoContainer = {
  width: "150px",
  height: "150px",
  borderRadius: "50%",
  overflow: "hidden",
  border: "4px solid #e5e7eb",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  flexShrink: 0,
}

const photoImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
}

const photoPlaceholder = {
  width: "100%",
  height: "100%",
  background: "#f3f4f6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const mainInfo = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 20,
}

const nameTitle = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 700,
  color: "#1f2937",
  textAlign: "center",
}

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 16,
}

const infoItem = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
}

const infoIcon = {
  fontSize: 18,
  color: "#7a1f1f",
  marginTop: 2,
  flexShrink: 0,
}

const infoLabel = {
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 4,
}

const infoValue = {
  fontSize: "14px",
  color: "#1f2937",
  fontWeight: 500,
}

const sectionTitle = {
  margin: "0 0 20px 0",
  fontSize: "18px",
  fontWeight: 700,
  color: "#1f2937",
}

const documentsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 16,
}

const documentCard = {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: 16,
  background: "#f9fafb",
}

const documentHeader = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 12,
  color: "#6b7280",
  fontSize: "13px",
  fontWeight: 600,
}

const documentLabel = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#6b7280",
}

const documentImageContainer = {
  width: "100%",
  borderRadius: "8px",
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  background: "white",
}

const documentImage = {
  width: "100%",
  height: "auto",
  display: "block",
  maxHeight: "200px",
  objectFit: "contain",
}

const documentPlaceholder = {
  padding: "40px 20px",
  textAlign: "center",
  background: "#f3f4f6",
  borderRadius: "8px",
  border: "2px dashed #d1d5db",
}

const documentPlaceholderText = {
  fontSize: "12px",
  color: "#9ca3af",
}

const statutBadge = (statut) => ({
  padding: "4px 12px",
  background: statut === "Membre" ? "#ecfdf3" : "#fffbeb",
  color: statut === "Membre" ? "#16a34a" : "#f59e0b",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
  display: "inline-block",
})
