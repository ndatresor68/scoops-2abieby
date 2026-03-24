/**
 * Excel export utility using xlsx library
 * Install: npm install xlsx
 */

// Dynamic import to handle case where xlsx might not be installed
let XLSX = null

async function loadXLSX() {
  if (!XLSX) {
    try {
      XLSX = await import("xlsx")
    } catch (error) {
      XLSX = null
    }
  }
  return XLSX
}

function escapeSpreadsheetValue(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function getCellValue(row, col) {
  const value = row[col.key]

  if (value === null || value === undefined) {
    return ""
  }

  if (value instanceof Date) {
    return value.toLocaleString("fr-FR")
  }

  if (typeof value === "object") {
    return JSON.stringify(value)
  }

  return value
}

function downloadExcelCompatibleFile(worksheetData, filename, sheetName = "Sheet1") {
  const rowsXml = worksheetData
    .map(
      (row) =>
        `<Row>${row
          .map(
            (cell) =>
              `<Cell><Data ss:Type="String">${escapeSpreadsheetValue(cell)}</Data></Cell>`
          )
          .join("")}</Row>`
    )
    .join("")

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${escapeSpreadsheetValue(sheetName)}">
  <Table>${rowsXml}</Table>
 </Worksheet>
</Workbook>`

  const blob = new Blob([xml], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${filename}.xls`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)

  return `${filename}.xls`
}

/**
 * Export data to Excel file
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Column definitions [{key, label, width}]
 * @param {string} filename - Output filename (without extension)
 * @param {string} sheetName - Sheet name
 */
export async function exportToExcel(data, columns, filename = "export", sheetName = "Sheet1") {
  try {
    const xlsx = await loadXLSX()

    // Prepare worksheet data
    const worksheetData = []

    // Add header row
    const headers = columns.map((col) => col.label || col.key)
    worksheetData.push(headers)

    // Add data rows
    data.forEach((row) => {
      const rowData = columns.map((col) => getCellValue(row, col))
      worksheetData.push(rowData)
    })

    if (!xlsx) {
      const fallbackFilename = downloadExcelCompatibleFile(worksheetData, filename, sheetName)
      return {
        success: true,
        filename: fallbackFilename,
        count: data.length,
      }
    }

    // Create workbook and worksheet
    const workbook = xlsx.utils.book_new()
    const worksheet = xlsx.utils.aoa_to_sheet(worksheetData)

    // Set column widths
    const colWidths = columns.map((col) => ({
      wch: col.width || 15,
    }))
    worksheet["!cols"] = colWidths

    // Add worksheet to workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName)

    // Generate Excel file
    xlsx.writeFile(workbook, `${filename}.xlsx`)

    return {
      success: true,
      filename: `${filename}.xlsx`,
      count: data.length,
    }
  } catch (error) {
    console.error("[exportToExcel] Error:", error)
    throw error
  }
}

/**
 * Export producers to Excel
 */
export async function exportProducersToExcel(producers, centres) {
  const centresMap = Object.fromEntries(centres.map((c) => [String(c.id), c.nom]))

  const columns = [
    { key: "code", label: "Code Producteur", width: 15 },
    { key: "nom", label: "Nom et Prénom", width: 25 },
    { key: "telephone", label: "Téléphone", width: 15 },
    { key: "centre_id", label: "Centre", width: 20 },
    { key: "statut", label: "Statut", width: 12 },
    { key: "localite", label: "Ville", width: 15 },
  ]

  const data = producers.map((p) => ({
    ...p,
    centre_id: centresMap[String(p.centre_id)] || "-",
  }))

  return exportToExcel(data, columns, "liste-producteurs", "Producteurs")
}

/**
 * Export activities to Excel
 */
export async function exportActivitiesToExcel(activities) {
  const columns = [
    { key: "created_at", label: "Date", width: 20 },
    { key: "user_email", label: "Utilisateur", width: 25 },
    { key: "action", label: "Action", width: 15 },
    { key: "target", label: "Cible", width: 15 },
    { key: "ip_address", label: "IP", width: 15 },
    { key: "device", label: "Device", width: 15 },
    { key: "browser", label: "Browser", width: 15 },
    { key: "details", label: "Détails", width: 30 },
  ]

  const data = activities.map((a) => ({
    ...a,
    created_at: a.created_at
      ? new Date(a.created_at).toLocaleString("fr-FR", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
  }))

  return exportToExcel(data, columns, "historique-activites", "Activités")
}

/**
 * Export users to Excel
 */
export async function exportUsersToExcel(users, centres) {
  const centresMap = Object.fromEntries(centres.map((c) => [String(c.id), c.nom]))

  const columns = [
    { key: "nom", label: "Nom", width: 20 },
    { key: "email", label: "Email", width: 25 },
    { key: "role", label: "Rôle", width: 12 },
    { key: "centre_id", label: "Centre", width: 20 },
    { key: "status", label: "Statut", width: 12 },
    { key: "created_at", label: "Date de création", width: 20 },
  ]

  const data = users.map((u) => ({
    ...u,
    centre_id: centresMap[String(u.centre_id)] || "-",
    created_at: u.created_at
      ? new Date(u.created_at).toLocaleString("fr-FR")
      : "",
  }))

  return exportToExcel(data, columns, "liste-utilisateurs", "Utilisateurs")
}
