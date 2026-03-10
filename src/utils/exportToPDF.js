import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

/**
 * Export data to PDF with professional formatting
 * @param {Object} options - Export options
 * @param {Array} options.data - Array of data objects to export
 * @param {Array} options.columns - Column definitions [{key, label, width?, render?}]
 * @param {String} options.title - Main title of the PDF
 * @param {String} options.subtitle - Optional subtitle
 * @param {String} options.filename - Filename for the PDF (without .pdf extension)
 * @param {Function} options.onProgress - Optional progress callback
 * @returns {Promise<void>}
 */
export async function exportToPDF({
  data = [],
  columns = [],
  title = "Export",
  subtitle = "",
  filename = "export",
  onProgress,
}) {
  try {
    if (!data || data.length === 0) {
      throw new Error("Aucune donnée à exporter")
    }

    if (!columns || columns.length === 0) {
      throw new Error("Aucune colonne définie")
    }

    onProgress?.(10)

    // Initialize PDF document
    const doc = new jsPDF({
      orientation: "landscape", // Use landscape for wider tables
      unit: "mm",
      format: "a4",
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const headerHeight = 50
    const footerHeight = 20

    onProgress?.(20)

    // Header with brand colors
    doc.setFillColor(122, 31, 31) // Brand red
    doc.rect(0, 0, pageWidth, headerHeight, "F")

    // Brand name
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont("helvetica", "bold")
    doc.text("SCOOP ASAB-COOP-CA", pageWidth / 2, 15, { align: "center" })

    // Motto
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text("Union • Discipline • Travail", pageWidth / 2, 23, { align: "center" })

    // Title
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    const titleY = headerHeight + 10
    doc.text(title, pageWidth / 2, titleY, { align: "center" })

    // Subtitle and date
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    const exportDate = new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    let currentY = titleY + 8
    if (subtitle) {
      doc.text(subtitle, pageWidth / 2, currentY, { align: "center" })
      currentY += 6
    }
    doc.text(`Date d'export : ${exportDate}`, pageWidth / 2, currentY, { align: "center" })

    onProgress?.(40)

    // Prepare table data
    const tableHead = columns.map((col) => col.label)
    const tableBody = data.map((row) => {
      return columns.map((col) => {
        const value = getNestedValue(row, col.key)
        return col.render ? col.render(value, row) : value || "-"
      })
    })

    onProgress?.(60)

    // Calculate column widths
    const availableWidth = pageWidth - 2 * margin
    const totalWidth = columns.reduce((sum, col) => sum + (col.width || 1), 0)
    const columnWidths = columns.map((col) => {
      const ratio = (col.width || 1) / totalWidth
      return availableWidth * ratio
    })

    // Generate table using autoTable function
    // Note: For jspdf-autotable v5, use autoTable(doc, {...}) syntax
    if (typeof autoTable !== "function") {
      throw new Error("autoTable is not a function. Make sure jspdf-autotable is correctly installed.")
    }
    autoTable(doc, {
      startY: currentY + 10,
      head: [tableHead],
      body: tableBody,
      theme: "grid", // Professional grid theme
      headStyles: {
        fillColor: [122, 31, 31], // Brand red
        textColor: 255,
        fontStyle: "bold",
        fontSize: 10,
        halign: "center",
        cellPadding: { top: 6, bottom: 6, left: 4, right: 4 },
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [0, 0, 0],
        cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      columnStyles: columns.reduce((styles, col, index) => {
        styles[index] = {
          cellWidth: columnWidths[index],
          halign: col.align || "left",
        }
        return styles
      }, {}),
      margin: { top: currentY + 10, left: margin, right: margin },
      styles: {
        lineWidth: 0.1,
        lineColor: [200, 200, 200],
        cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      },
      didDrawPage: (data) => {
        // Footer on each page
        const pageNum = doc.internal.getNumberOfPages()
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.text(
          `Page ${data.pageNumber} sur ${pageNum}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        )
      },
    })

    onProgress?.(90)

    // Final footer - get the Y position after the table
    const finalY = doc.lastAutoTable?.finalY || pageHeight - footerHeight - 10
    if (finalY < pageHeight - footerHeight) {
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(
        "Logiciel SCOOPS - Gestion Coopérative",
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
      )
      doc.text(
        `Total : ${data.length} enregistrement${data.length > 1 ? "s" : ""}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      )
    }

    // Generate filename with date
    const dateStr = new Date().toISOString().split("T")[0]
    const safeFilename = filename
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
    const finalFilename = `${safeFilename}-${dateStr}.pdf`

    // Save PDF
    doc.save(finalFilename)

    onProgress?.(100)

    return {
      success: true,
      filename: finalFilename,
      count: data.length,
    }
  } catch (error) {
    console.error("[exportToPDF] Error:", error)
    throw error
  }
}

/**
 * Helper function to get nested object values
 */
function getNestedValue(obj, path) {
  if (!path) return obj
  return path.split(".").reduce((current, prop) => current?.[prop], obj)
}

/**
 * Helper function to load image and convert to base64
 */
async function loadImageAsBase64(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error("Failed to load image")
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.warn("[exportToPDF] Failed to load image:", url, error)
    return null
  }
}

/**
 * Export producteurs to PDF with photos and all required columns
 */
export async function exportProducteursPDF(producteurs, centres, filterCentreId = null) {
  const centresMap = Object.fromEntries(centres.map((c) => [String(c.id), c.nom]))

  let dataToExport = producteurs
  if (filterCentreId) {
    dataToExport = producteurs.filter((p) => String(p.centre_id) === String(filterCentreId))
  }

  const centreNom = filterCentreId
    ? centresMap[String(filterCentreId)] || "Inconnu"
    : "Tous les centres"

  try {
    if (!dataToExport || dataToExport.length === 0) {
      throw new Error("Aucune donnée à exporter")
    }

    // Initialize PDF document in landscape orientation
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const headerHeight = 40
    const footerHeight = 15

    // Header with brand colors
    doc.setFillColor(122, 31, 31) // Brand red
    doc.rect(0, 0, pageWidth, headerHeight, "F")

    // Brand name
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("SCOOP ASAB-COOP-CA", pageWidth / 2, 12, { align: "center" })

    // Motto
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text("Union • Discipline • Travail", pageWidth / 2, 18, { align: "center" })

    // Title
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    const titleY = headerHeight + 8
    doc.text("Liste officielle des producteurs", pageWidth / 2, titleY, { align: "center" })

    // Subtitle and date
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    const exportDate = new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    let currentY = titleY + 6
    if (centreNom !== "Tous les centres") {
      doc.text(`Centre : ${centreNom}`, pageWidth / 2, currentY, { align: "center" })
      currentY += 5
    }
    doc.text(`Date d'export : ${exportDate}`, pageWidth / 2, currentY, { align: "center" })

    // Prepare table data with images
    const tableHead = ["Photo", "Code Producteur", "Nom et Prénom", "Téléphone", "Centre", "Ville", "Statut"]
    
    // Load images and prepare table body
    const tableBody = []
    const imagePromises = []
    const imageMap = new Map()

    // Pre-load all images
    for (const producteur of dataToExport) {
      if (producteur.photo) {
        imagePromises.push(
          loadImageAsBase64(producteur.photo).then((base64) => {
            if (base64) imageMap.set(producteur.id, base64)
          })
        )
      }
    }

    // Wait for all images to load (with timeout)
    await Promise.allSettled(imagePromises)

    // Build table body
    // Store image data separately for rendering in didDrawCell
    const imageDataMap = new Map()
    for (const producteur of dataToExport) {
      const rowIndex = tableBody.length
      if (producteur.photo && imageMap.has(producteur.id)) {
        imageDataMap.set(rowIndex, imageMap.get(producteur.id))
        tableBody.push([
          "", // Empty string for photo column, will be rendered in didDrawCell
          producteur.code || "—",
          producteur.nom || "—",
          producteur.telephone || "—",
          producteur.centre_id ? (centresMap[String(producteur.centre_id)] || "—") : "—",
          producteur.localite || "—",
          producteur.statut || "—",
        ])
      } else {
        tableBody.push([
          "—",
          producteur.code || "—",
          producteur.nom || "—",
          producteur.telephone || "—",
          producteur.centre_id ? (centresMap[String(producteur.centre_id)] || "—") : "—",
          producteur.localite || "—",
          producteur.statut || "—",
        ])
      }
    }

    // Calculate column widths (optimized for landscape)
    const photoWidth = 15 // Small square for photo
    const codeWidth = 25 // Medium
    const nameWidth = 50 // Large
    const phoneWidth = 30 // Medium
    const centreWidth = 35 // Medium
    const villeWidth = 30 // Medium
    const statutWidth = 25 // Small
    const totalWidth = photoWidth + codeWidth + nameWidth + phoneWidth + centreWidth + villeWidth + statutWidth
    const availableWidth = pageWidth - 2 * margin
    const scaleFactor = availableWidth / totalWidth

    const columnWidths = [
      photoWidth * scaleFactor,
      codeWidth * scaleFactor,
      nameWidth * scaleFactor,
      phoneWidth * scaleFactor,
      centreWidth * scaleFactor,
      villeWidth * scaleFactor,
      statutWidth * scaleFactor,
    ]

    // Generate table using autoTable
    if (typeof autoTable !== "function") {
      throw new Error("autoTable is not a function. Make sure jspdf-autotable is correctly installed.")
    }

    autoTable(doc, {
      startY: currentY + 8,
      head: [tableHead],
      body: tableBody,
      theme: "grid",
      headStyles: {
        fillColor: [122, 31, 31], // Dark red
        textColor: 255, // White
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
        cellPadding: { top: 5, bottom: 5, left: 3, right: 3 },
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [0, 0, 0],
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      columnStyles: {
        0: { cellWidth: columnWidths[0], halign: "center", valign: "middle" }, // Photo
        1: { cellWidth: columnWidths[1], halign: "center" }, // Code
        2: { cellWidth: columnWidths[2], halign: "left" }, // Nom
        3: { cellWidth: columnWidths[3], halign: "center" }, // Téléphone
        4: { cellWidth: columnWidths[4], halign: "center" }, // Centre
        5: { cellWidth: columnWidths[5], halign: "center" }, // Ville
        6: { cellWidth: columnWidths[6], halign: "center" }, // Statut
      },
      margin: { top: currentY + 8, left: margin, right: margin },
      styles: {
        lineWidth: 0.1,
        lineColor: [200, 200, 200],
      },
      didDrawCell: (data) => {
        // Handle image rendering in photo column (column 0)
        if (data.column.index === 0 && imageDataMap.has(data.row.index)) {
          try {
            const imgData = imageDataMap.get(data.row.index)
            const cellWidth = data.cell.width
            const cellHeight = data.cell.height
            const imgSize = Math.min(cellWidth - 2, cellHeight - 2, 12) // Max 12mm square
            const x = data.cell.x + (cellWidth - imgSize) / 2
            const y = data.cell.y + (cellHeight - imgSize) / 2
            
            // Determine image format from base64 data
            let imgFormat = "JPEG"
            if (imgData.startsWith("data:image/png")) {
              imgFormat = "PNG"
            } else if (imgData.startsWith("data:image/jpeg") || imgData.startsWith("data:image/jpg")) {
              imgFormat = "JPEG"
            }
            
            doc.addImage(imgData, imgFormat, x, y, imgSize, imgSize)
            return false // Prevent default text rendering
          } catch (error) {
            console.warn("[exportToPDF] Error rendering image:", error)
            return true // Fall back to text rendering
          }
        }
        return true // Default rendering for other cells
      },
      didDrawPage: (data) => {
        // Footer on each page
        const pageNum = data.pageNumber
        const totalPages = doc.internal.getNumberOfPages()
        
        doc.setFontSize(7)
        doc.setTextColor(128, 128, 128)
        
        // Left footer
        doc.text(
          "Document généré automatiquement par le système SCOOP ASAB-COOP-CA",
          margin,
          pageHeight - 8,
          { align: "left" }
        )
        
        // Right footer (page number)
        doc.text(
          `Page ${pageNum} sur ${totalPages}`,
          pageWidth - margin,
          pageHeight - 8,
          { align: "right" }
        )
      },
    })

    // Final footer with total count
    const finalY = doc.lastAutoTable?.finalY || pageHeight - footerHeight - 10
    if (finalY < pageHeight - footerHeight) {
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(
        `Total : ${dataToExport.length} producteur${dataToExport.length > 1 ? "s" : ""}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: "center" }
      )
    }

    // Generate filename with date
    const dateStr = new Date().toISOString().split("T")[0]
    const safeFilename = `liste-producteurs-${filterCentreId ? centreNom.replace(/\s+/g, "-") : "tous"}-${dateStr}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
    const finalFilename = `${safeFilename}.pdf`

    // Save PDF
    doc.save(finalFilename)

    return {
      success: true,
      filename: finalFilename,
      count: dataToExport.length,
    }
  } catch (error) {
    console.error("[exportProducteursPDF] Error:", error)
    throw error
  }
}

/**
 * Export centres to PDF
 */
export async function exportCentresPDF(centres) {
  return exportToPDF({
    data: centres,
    columns: [
      { key: "code", label: "Code", width: 1.5 },
      { key: "nom", label: "Nom", width: 3 },
      { key: "localite", label: "Localité", width: 2.5 },
    ],
    title: "Liste des Centres",
    filename: "liste-centres",
  })
}

/**
 * Export agents to PDF
 */
export async function exportAgentsPDF(agents, centres) {
  const centresMap = Object.fromEntries(centres.map((c) => [String(c.id), c.nom]))

  return exportToPDF({
    data: agents,
    columns: [
      { key: "nom", label: "Nom", width: 2 },
      { key: "email", label: "Email", width: 2.5 },
      {
        key: "centre_id",
        label: "Centre",
        width: 2,
        render: (value) => centresMap[String(value)] || "-",
      },
      {
        key: "created_at",
        label: "Créé le",
        width: 1.5,
        render: (value) => (value ? new Date(value).toLocaleDateString("fr-FR") : "-"),
      },
    ],
    title: "Liste des Agents",
    filename: "liste-agents",
  })
}

/**
 * Export users to PDF
 */
export async function exportUsersPDF(users, centres) {
  const centresMap = Object.fromEntries(centres.map((c) => [String(c.id), c.nom]))

  return exportToPDF({
    data: users,
    columns: [
      { key: "nom", label: "Nom", width: 2 },
      { key: "email", label: "Email", width: 2.5 },
      { key: "role", label: "Rôle", width: 1 },
      {
        key: "centre_id",
        label: "Centre",
        width: 2,
        render: (value) => centresMap[String(value)] || "-",
      },
      {
        key: "created_at",
        label: "Créé le",
        width: 1.5,
        render: (value) => (value ? new Date(value).toLocaleDateString("fr-FR") : "-"),
      },
    ],
    title: "Liste des Utilisateurs",
    filename: "liste-utilisateurs",
  })
}

/**
 * Export activities audit log to PDF
 */
export async function exportActivitiesPDF(activities) {
  function getActionLabel(action) {
    const labels = {
      login: "Connexion",
      logout: "Déconnexion",
      user_created: "Créé",
      user_updated: "Modifié",
      user_deleted: "Supprimé",
      user_suspended: "Suspendu",
      user_banned: "Banni",
      user_reactivated: "Réactivé",
      producer_created: "Créé",
      producer_updated: "Modifié",
      producer_deleted: "Supprimé",
      centre_created: "Créé",
      centre_updated: "Modifié",
      centre_deleted: "Supprimé",
      achat_created: "Créé",
      pdf_exported: "Exporté",
      settings_updated: "Modifié",
    }
    return labels[action] || action
  }

  function getTargetLabel(target) {
    const labels = {
      user: "Utilisateur",
      centre: "Centre",
      producteur: "Producteur",
      achat: "Achat",
      system: "Système",
      pdf: "PDF",
      settings: "Paramètres",
    }
    return labels[target] || target
  }

  return exportToPDF({
    data: activities,
    columns: [
      {
        key: "created_at",
        label: "Date",
        width: 2,
        render: (value) => (value ? new Date(value).toLocaleString("fr-FR") : "-"),
      },
      {
        key: "user_email",
        label: "Utilisateur",
        width: 2.5,
        render: (value) => value || "Système",
      },
      {
        key: "action",
        label: "Action",
        width: 1.5,
        render: (value) => getActionLabel(value),
      },
      {
        key: "target",
        label: "Cible",
        width: 1.5,
        render: (value) => getTargetLabel(value),
      },
      {
        key: "ip_address",
        label: "IP",
        width: 1.5,
        render: (value) => value || "-",
      },
      {
        key: "device",
        label: "Device",
        width: 1.2,
        render: (value) => value || "-",
      },
      {
        key: "browser",
        label: "Browser",
        width: 2,
        render: (value) => value || "-",
      },
      {
        key: "details",
        label: "Détails",
        width: 3,
        render: (value) => value || "-",
      },
    ],
    title: "Journal d'Audit - Activités Système",
    subtitle: `Export du ${new Date().toLocaleDateString("fr-FR")} - ${activities.length} activité${activities.length > 1 ? "s" : ""}`,
    filename: `audit-activites-${new Date().toISOString().split("T")[0]}`,
  })
}
