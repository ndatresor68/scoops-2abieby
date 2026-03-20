import { useEffect, useMemo, useState } from "react"
import { FaSearch, FaSort, FaSortUp, FaSortDown } from "react-icons/fa"
import Input from "./Input"
import Button from "./Button"
import { useMediaQuery } from "../../hooks/useMediaQuery"

export default function Table({
  data = [],
  columns = [],
  searchable = false,
  searchPlaceholder = "Rechercher...",
  searchFields = [],
  sortable = true,
  pagination = true,
  pageSize = 10,
  onRowClick,
  emptyMessage = "Aucune donnée disponible",
  loading = false,
  actions,
  style = {},
}) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState("asc")
  const [currentPage, setCurrentPage] = useState(1)

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchTerm || !searchFields.length) return data

    const term = searchTerm.toLowerCase()
    return data.filter((row) =>
      searchFields.some((field) => {
        const value = getNestedValue(row, field)
        return String(value || "").toLowerCase().includes(term)
      })
    )
  }, [data, searchTerm, searchFields])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortable) return filteredData

    return [...filteredData].sort((a, b) => {
      const aVal = getNestedValue(a, sortColumn)
      const bVal = getNestedValue(b, sortColumn)

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      const comparison =
        typeof aVal === "number"
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal), "fr", { numeric: true })

      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [filteredData, sortColumn, sortDirection, sortable])

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize, pagination])

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize))

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, sortColumn, sortDirection, pageSize, data.length])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  function handleSort(columnKey) {
    if (!sortable || !columnKey) return

    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(columnKey)
      setSortDirection("asc")
    }
  }

  function getNestedValue(obj, path) {
    return path.split(".").reduce((current, prop) => current?.[prop], obj)
  }

  function getSortIcon(columnKey) {
    if (sortColumn !== columnKey) {
      return <FaSort style={{ opacity: 0.3 }} />
    }
    return sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />
  }

  if (loading) {
    return (
      <div style={loadingContainer}>
        <div style={spinner}></div>
        <p style={loadingText}>Chargement...</p>
      </div>
    )
  }

  return (
    <div style={{ ...container, ...style }}>
      {(searchable || actions) && (
        <div style={toolbar}>
          {searchable ? (
            <div style={searchContainer}>
              <Input
                icon={<FaSearch />}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={setSearchTerm}
                style={{ flex: 1, minWidth: isMobile ? "100%" : "280px", maxWidth: isMobile ? "100%" : "420px" }}
              />
              {searchTerm ? (
                <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")}>
                  Effacer
                </Button>
              ) : null}
            </div>
          ) : (
            <div />
          )}
          {actions ? <div style={actionsContainer}>{actions}</div> : null}
        </div>
      )}

      <div style={tableWrapper}>
        {isMobile ? (
          <div style={mobileContainer}>
            {paginatedData.length === 0 ? (
              <div style={emptyState}>
                <p style={emptyText}>{emptyMessage}</p>
              </div>
            ) : (
              paginatedData.map((row, index) => (
                <div
                  key={index}
                  style={{
                    ...mobileCard,
                    ...(onRowClick ? { cursor: "pointer" } : {}),
                  }}
                  onClick={() => onRowClick?.(row)}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.transform = "translateY(-1px)"
                    event.currentTarget.style.boxShadow = "0 16px 32px rgba(15, 23, 42, 0.08)"
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.transform = "translateY(0)"
                    event.currentTarget.style.boxShadow = "none"
                  }}
                >
                  {columns.map((col) => {
                    if (col.hideOnMobile) return null
                    const value = getNestedValue(row, col.key)
                    return (
                      <div
                        key={col.key}
                        style={{
                          ...mobileRow,
                          borderBottom: col.key === columns[columns.length - 1]?.key ? "none" : mobileRow.borderBottom,
                        }}
                      >
                        <span style={mobileLabel}>{col.label}:</span>
                        <span style={mobileValue}>
                          {col.render ? col.render(value, row) : value || "-"}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      ...th,
                      ...(col.width ? { width: col.width } : {}),
                      ...(sortable && col.sortable !== false ? { cursor: "pointer" } : {}),
                    }}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                  >
                    <div style={thContent}>
                      <span>{col.label}</span>
                      {sortable && col.sortable !== false && getSortIcon(col.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} style={emptyCell}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => (
                  <tr
                    key={index}
                    style={{
                      ...tr,
                      ...(onRowClick ? { cursor: "pointer" } : {}),
                    }}
                    onClick={() => onRowClick?.(row)}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = "#f8fafc"
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = "#ffffff"
                    }}
                  >
                    {columns.map((col) => {
                      const value = getNestedValue(row, col.key)
                      return (
                        <td key={col.key} style={td}>
                          {col.render ? col.render(value, row) : value || "-"}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div style={paginationContainer}>
          <div style={paginationInfo}>
            Affichage de {(currentPage - 1) * pageSize + 1} à{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} sur {sortedData.length}
          </div>
          <div style={paginationControls}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            <span style={pageInfo}>
              Page {currentPage} sur {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

const container = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
}

const toolbar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
}

const searchContainer = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  minWidth: 0,
}

const actionsContainer = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
}

const tableWrapper = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), #ffffff)",
  borderRadius: 24,
  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
  overflow: "hidden",
  border: "1px solid rgba(226, 232, 240, 0.9)",
}

const table = {
  width: "100%",
  borderCollapse: "collapse",
}

const th = {
  padding: "18px 20px",
  textAlign: "left",
  background: "linear-gradient(180deg, #fbfdff 0%, #f8fafc 100%)",
  borderBottom: "1px solid rgba(226, 232, 240, 0.95)",
  fontSize: 12,
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
}

const thContent = {
  display: "flex",
  alignItems: "center",
  gap: 8,
}

const tr = {
  borderBottom: "1px solid #f1f5f9",
  transition: "background 0.2s ease",
  background: "#ffffff",
}

const td = {
  padding: "18px 20px",
  fontSize: 14,
  color: "#0f172a",
  verticalAlign: "top",
}

const emptyCell = {
  padding: "56px 20px",
  textAlign: "center",
  color: "#6b7280",
  fontSize: 14,
}

const mobileContainer = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: 16,
}

const mobileCard = {
  background: "linear-gradient(180deg, rgba(248,250,252,0.9), #ffffff)",
  borderRadius: 20,
  padding: 16,
  border: "1px solid rgba(226, 232, 240, 0.95)",
  transition: "transform 0.22s ease, box-shadow 0.22s ease",
}

const mobileRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  padding: "10px 0",
  borderBottom: "1px solid #e2e8f0",
}

const mobileLabel = {
  fontSize: 12,
  fontWeight: 700,
  color: "#6b7280",
  minWidth: 92,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
}

const mobileValue = {
  fontSize: 14,
  color: "#0f172a",
  textAlign: "right",
  flex: 1,
  wordBreak: "break-word",
}

const emptyState = {
  padding: "56px 20px",
  textAlign: "center",
}

const emptyText = {
  color: "#6b7280",
  fontSize: 14,
  margin: 0,
}

const paginationContainer = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 4px 0",
  flexWrap: "wrap",
  gap: 12,
}

const paginationInfo = {
  fontSize: 13,
  color: "#6b7280",
}

const paginationControls = {
  display: "flex",
  alignItems: "center",
  gap: 12,
}

const pageInfo = {
  fontSize: 13,
  color: "#334155",
  fontWeight: 700,
}

const loadingContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "72px 20px",
  gap: 16,
}

const spinner = {
  width: "40px",
  height: "40px",
  border: "4px solid #e5e7eb",
  borderTopColor: "#7a1f1f",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
}

const loadingText = {
  color: "#6b7280",
  fontSize: "14px",
}
