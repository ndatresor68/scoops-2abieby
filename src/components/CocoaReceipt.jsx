import React, { useMemo } from "react"
import jsPDF from "jspdf"
import { QRCodeCanvas } from "qrcode.react"

/**
 * Professional Cocoa Purchase Receipt Component
 * Displays a receipt with two identical sections: "Copie Planteur" and "Copie Coopérative"
 */
export default function CocoaReceipt({ achat, centreNom, onClose }) {
  const receiptData = useMemo(() => {
    if (!achat) return null

    return {
      datePesee: achat.date_pesee 
        ? new Date(achat.date_pesee).toLocaleDateString("fr-FR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : achat.created_at
        ? new Date(achat.created_at).toLocaleDateString("fr-FR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-",
      datePeseeRaw: achat.date_pesee || achat.created_at || "",
      centre: centreNom || "-",
      nomAgent: achat.nom_agent || "-",
      nomProducteur: achat.nom_producteur || "-",
      codeProducteur: achat.code_producteur || "-",
      typeCacao: "Cacao", // Default type
      nombreSacs: achat.sacs || 0,
      poidsTotal: achat.poids || 0,
      prixParKg: achat.prix_unitaire || achat.prix_kg || 0,
      montantTotal: achat.montant || 0,
      purchaseId: achat.id,
    }
  }, [achat, centreNom])

  if (!receiptData) {
    return (
      <div style={container}>
        <p>Aucune donnée disponible</p>
      </div>
    )
  }

  return (
    <div style={container}>
      <div style={receiptWrapper}>
        {/* Top Section - Copie Planteur */}
        <ReceiptSection
          title="Copie Planteur"
          data={receiptData}
          achat={achat}
          isTop={true}
        />

        {/* Cutting Line */}
        <div style={cuttingLine}>
          <div style={cuttingLineDashed}></div>
          <span style={cuttingLineText}>Couper ici</span>
          <div style={cuttingLineDashed}></div>
        </div>

        {/* Bottom Section - Copie Coopérative */}
        <ReceiptSection
          title="Copie Coopérative"
          data={receiptData}
          achat={achat}
          isTop={false}
        />
      </div>

      <div style={actions}>
        <button style={printButton} onClick={() => window.print()}>
          Imprimer
        </button>
        <button style={pdfButton} onClick={() => generatePDF(receiptData, centreNom)}>
          Exporter PDF
        </button>
        {onClose && (
          <button style={closeButton} onClick={onClose}>
            Fermer
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Receipt Section Component
 */
function ReceiptSection({ title, data, achat, isTop }) {
  return (
    <div style={section}>
      {/* Header */}
      <div style={header}>
        <div style={coopName}>SCOOP ASAB-COOP-CA</div>
        <div style={motto}>Union • Discipline • Travail</div>
        <div style={receiptTitle}>Reçu officiel de pesée</div>
      </div>

      {/* Purchase Information */}
      <div style={infoSection}>
        <div style={infoRow}>
          <span style={infoLabel}>Date de pesée :</span>
          <span style={infoValue}>{data.datePesee}</span>
        </div>
        <div style={infoRow}>
          <span style={infoLabel}>Centre :</span>
          <span style={infoValue}>{data.centre}</span>
        </div>
        <div style={infoRow}>
          <span style={infoLabel}>Nom de l'agent :</span>
          <span style={infoValue}>{data.nomAgent}</span>
        </div>
        <div style={infoRow}>
          <span style={infoLabel}>Nom du producteur :</span>
          <span style={infoValue}>{data.nomProducteur}</span>
        </div>
        <div style={infoRow}>
          <span style={infoLabel}>Code producteur :</span>
          <span style={infoValue}>{data.codeProducteur}</span>
        </div>
      </div>

      {/* Purchase Details Table */}
      <div style={tableSection}>
        <table style={table}>
          <tbody>
            <tr>
              <td style={tableLabel}>Type cacao</td>
              <td style={tableValue}>{data.typeCacao}</td>
            </tr>
            <tr>
              <td style={tableLabel}>Nombre de sacs</td>
              <td style={tableValue}>{data.nombreSacs}</td>
            </tr>
            <tr>
              <td style={tableLabel}>Poids total (kg)</td>
              <td style={tableValue}>{data.poidsTotal.toLocaleString("fr-FR")}</td>
            </tr>
            <tr>
              <td style={tableLabel}>Prix par kg</td>
              <td style={tableValue}>{Number(data.prixParKg).toLocaleString("fr-FR")} FCFA</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Total Amount */}
      <div style={totalSection}>
        <div style={totalLabel}>Montant total</div>
        <div style={totalAmount}>
          {Number(data.montantTotal).toLocaleString("fr-FR")} FCFA
        </div>
      </div>

      {/* QR Code */}
      <div style={qrSection}>
        <QRCodeDisplay data={data} achat={achat} />
      </div>

      {/* Footer Message */}
      <div style={footerSection}>
        <div style={footerMessage}>
          Merci pour votre confiance.
          <br />
          <br />
          La SCOOP ASAB-COOP-CA travaille chaque jour
          <br />
          pour valoriser le cacao de ses planteurs
          <br />
          et garantir une commercialisation juste
          <br />
          et transparente.
          <br />
          <br />
          Ensemble, faisons grandir notre coopérative.
        </div>
      </div>
    </div>
  )
}

/**
 * QR Code Display Component
 * Uses qrcode.react library for React component rendering
 */
function QRCodeDisplay({ data, achat }) {
  // Generate QR code data string in format: id|code|poids|montant|date
  const qrData = useMemo(() => {
    if (!achat) return ""
    // Use raw date from achat object (date_pesee or created_at)
    const dateValue = achat.date_pesee || achat.created_at || ""
    return `${achat.id}|${achat.code_producteur}|${achat.poids}|${achat.montant}|${dateValue}`
  }, [achat])

  if (!qrData) {
    return null
  }

  return (
    <div style={qrContainer}>
      <QRCodeCanvas
        value={qrData}
        size={120}
        bgColor="#ffffff"
        fgColor="#000000"
        level="M"
        includeMargin={true}
      />
    </div>
  )
}


/**
 * Generate PDF Receipt
 */
async function generatePDF(data, centreNom) {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 200], // Receipt width: 80mm (approx 320px), height: 200mm
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const receiptHeight = pageHeight / 2 - 5 // Half page minus margin

    // Note: QR code in PDF is not included as qrcode.react is a React component
    // For PDF export, QR code generation would require server-side rendering or canvas extraction
    // The QR code is available in the on-screen receipt view

    // Function to draw a receipt section
    function drawReceiptSection(yStart, title) {
      let y = yStart

      // Header
      doc.setFillColor(22, 101, 52) // Green color
      doc.rect(0, y, pageWidth, 12, "F")

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text("SCOOP ASAB-COOP-CA", pageWidth / 2, y + 5, { align: "center" })

      doc.setFontSize(7)
      doc.setFont("helvetica", "normal")
      doc.text("Union • Discipline • Travail", pageWidth / 2, y + 8.5, { align: "center" })

      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.text("Reçu officiel de pesée", pageWidth / 2, y + 11, { align: "center" })

      y += 14

      // Purchase Information
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(7)
      doc.setFont("helvetica", "normal")

      const infoLines = [
        [`Date de pesée :`, data.datePesee],
        [`Centre :`, data.centre],
        [`Nom de l'agent :`, data.nomAgent],
        [`Nom du producteur :`, data.nomProducteur],
        [`Code producteur :`, data.codeProducteur],
      ]

      infoLines.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold")
        doc.text(label, 2, y)
        doc.setFont("helvetica", "normal")
        doc.text(value, 40, y)
        y += 4
      })

      y += 2

      // Purchase Details Table
      doc.setFillColor(245, 247, 250)
      doc.rect(2, y, pageWidth - 4, 20, "F")

      const tableData = [
        ["Type cacao", data.typeCacao],
        ["Nombre de sacs", data.nombreSacs],
        ["Poids total (kg)", data.poidsTotal.toLocaleString("fr-FR")],
        ["Prix par kg", `${Number(data.prixParKg).toLocaleString("fr-FR")} FCFA`],
      ]

      tableData.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold")
        doc.text(label, 3, y + 3)
        doc.setFont("helvetica", "normal")
        doc.text(value, 50, y + 3)
        y += 5
      })

      y += 3

      // Total Amount
      doc.setFillColor(22, 101, 52)
      doc.rect(2, y, pageWidth - 4, 10, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.text("Montant total", pageWidth / 2, y + 4, { align: "center" })
      doc.setFontSize(12)
      doc.text(
        `${Number(data.montantTotal).toLocaleString("fr-FR")} FCFA`,
        pageWidth / 2,
        y + 8,
        { align: "center" },
      )

      y += 12

      // QR Code placeholder in PDF (QR code is available in on-screen receipt)
      doc.setFontSize(6)
      doc.setTextColor(150, 150, 150)
      doc.text("QR Code disponible dans la version écran", pageWidth / 2, y + 5, { align: "center" })
      y += 10

      // Footer Message
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(6)
      doc.setFont("helvetica", "normal")
      const footerText = [
        "Merci pour votre confiance.",
        "",
        "La SCOOP ASAB-COOP-CA travaille chaque jour",
        "pour valoriser le cacao de ses planteurs",
        "et garantir une commercialisation juste",
        "et transparente.",
        "",
        "Ensemble, faisons grandir notre coopérative.",
      ]

      footerText.forEach((line) => {
        doc.text(line, pageWidth / 2, y, { align: "center" })
        y += 3
      })
    }

    // Draw top section (Copie Planteur)
    drawReceiptSection(2, "Copie Planteur")

    // Draw cutting line
    doc.setDrawColor(150, 150, 150)
    doc.setLineWidth(0.5)
    doc.setLineDashPattern([2, 2], 0)
    doc.line(5, receiptHeight, pageWidth - 5, receiptHeight)
    doc.setLineDashPattern([], 0)

    doc.setFontSize(6)
    doc.setTextColor(100, 100, 100)
    doc.text("Couper ici", pageWidth / 2, receiptHeight + 3, { align: "center" })

    // Draw bottom section (Copie Coopérative)
    drawReceiptSection(receiptHeight + 8, "Copie Coopérative")

    // Save PDF
    const fileName = `Reçu_Pesée_${data.codeProducteur}_${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(fileName)
  } catch (error) {
    console.error("PDF generation error:", error)
    alert("Erreur lors de la génération du PDF")
  }
}

// Styles
const container = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "20px",
  background: "#f9fafb",
  minHeight: "100vh",
}

const receiptWrapper = {
  width: "320px",
  background: "white",
  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  borderRadius: "8px",
  overflow: "hidden",
  marginBottom: "20px",
}

const section = {
  padding: "20px",
  borderBottom: "none",
}

const cuttingLine = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 0",
  background: "#f9fafb",
}

const cuttingLineDashed = {
  flex: 1,
  height: "1px",
  borderTop: "2px dashed #9ca3af",
}

const cuttingLineText = {
  padding: "0 10px",
  fontSize: "11px",
  color: "#6b7280",
  fontWeight: 600,
  background: "#f9fafb",
}

const header = {
  textAlign: "center",
  marginBottom: "20px",
  paddingBottom: "15px",
  borderBottom: "2px solid #166534",
}

const coopName = {
  fontSize: "18px",
  fontWeight: 800,
  color: "#166534",
  marginBottom: "4px",
  letterSpacing: "0.5px",
}

const motto = {
  fontSize: "11px",
  color: "#6b7280",
  marginBottom: "8px",
  fontWeight: 600,
}

const receiptTitle = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#1f2937",
  marginTop: "8px",
}

const infoSection = {
  marginBottom: "20px",
}

const infoRow = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "8px",
  fontSize: "12px",
}

const infoLabel = {
  fontWeight: 600,
  color: "#6b7280",
}

const infoValue = {
  color: "#1f2937",
  fontWeight: 500,
}

const tableSection = {
  marginBottom: "20px",
  background: "#f9fafb",
  borderRadius: "8px",
  padding: "12px",
}

const table = {
  width: "100%",
  borderCollapse: "collapse",
}

const tableLabel = {
  padding: "6px 0",
  fontSize: "12px",
  fontWeight: 600,
  color: "#6b7280",
  borderBottom: "1px solid #e5e7eb",
}

const tableValue = {
  padding: "6px 0",
  fontSize: "12px",
  color: "#1f2937",
  textAlign: "right",
  borderBottom: "1px solid #e5e7eb",
}

const totalSection = {
  background: "#166534",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "20px",
  textAlign: "center",
}

const totalLabel = {
  fontSize: "12px",
  fontWeight: 600,
  color: "white",
  marginBottom: "8px",
}

const totalAmount = {
  fontSize: "24px",
  fontWeight: 800,
  color: "white",
  letterSpacing: "0.5px",
}

const qrSection = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: "20px",
  padding: "10px",
  background: "#f9fafb",
  borderRadius: "8px",
}

const qrContainer = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "10px",
}

const footerSection = {
  marginTop: "20px",
  paddingTop: "20px",
  borderTop: "1px solid #e5e7eb",
}

const footerMessage = {
  fontSize: "11px",
  color: "#6b7280",
  lineHeight: "1.6",
  textAlign: "center",
  fontStyle: "italic",
}

const actions = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  justifyContent: "center",
}

const printButton = {
  padding: "12px 24px",
  background: "#166534",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 0.2s",
}

const pdfButton = {
  padding: "12px 24px",
  background: "#7a1f1f",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 0.2s",
}

const closeButton = {
  padding: "12px 24px",
  background: "#6b7280",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 0.2s",
}

// Export generatePDF function
export { generatePDF }
