import { useMemo, useState } from "react"
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

  const totalPages = Math.ceil(sortedData.length / pageSize)

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
      {/* Search Bar */}
      {searchable && (
        <div style={searchContainer}>
          <Input
            icon={<FaSearch />}
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={setSearchTerm}
            style={{ maxWidth: isMobile ? "100%" : "400px" }}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
              style={{ marginLeft: 8 }}
            >
              Effacer
            </Button>
          )}
        </div>
      )}

      {/* Actions Bar */}
      {actions && <div style={actionsContainer}>{actions}</div>}

      {/* Table */}
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
                >
                  {columns.map((col) => {
                    if (col.hideOnMobile) return null
                    const value = getNestedValue(row, col.key)
                    return (
                      <div key={col.key} style={mobileRow}>
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
}

const searchContainer = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
}

const actionsContainer = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
}

const tableWrapper = {
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  overflow: "hidden",
}

const table = {
  width: "100%",
  borderCollapse: "collapse",
}

const th = {
  padding: "16px",
  textAlign: "left",
  background: "#f9fafb",
  borderBottom: "2px solid #e5e7eb",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
}

const thContent = {
  display: "flex",
  alignItems: "center",
  gap: 8,
}

const tr = {
  borderBottom: "1px solid #f3f4f6",
  transition: "background 0.2s ease",
}

const trHover = {
  background: "#f9fafb",
}

const td = {
  padding: "16px",
  fontSize: "14px",
  color: "#111827",
}

const emptyCell = {
  padding: "40px 16px",
  textAlign: "center",
  color: "#6b7280",
  fontSize: "14px",
}

const mobileContainer = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: "16px",
}

const mobileCard = {
  background: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  border: "1px solid #e5e7eb",
}

const mobileRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  padding: "8px 0",
  borderBottom: "1px solid #e5e7eb",
}

const mobileLabel = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#6b7280",
  minWidth: "100px",
}

const mobileValue = {
  fontSize: "14px",
  color: "#111827",
  textAlign: "right",
  flex: 1,
}

const emptyState = {
  padding: "60px 20px",
  textAlign: "center",
}

const emptyText = {
  color: "#6b7280",
  fontSize: "14px",
  margin: 0,
}

const paginationContainer = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 0",
  flexWrap: "wrap",
  gap: 12,
}

const paginationInfo = {
  fontSize: "13px",
  color: "#6b7280",
}

const paginationControls = {
  display: "flex",
  alignItems: "center",
  gap: 12,
}

const pageInfo = {
  fontSize: "13px",
  color: "#374151",
  fontWeight: 500,
}

const loadingContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "60px 20px",
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
