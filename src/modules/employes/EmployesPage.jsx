import { useEffect, useMemo, useRef, useState } from "react"
import {
  FaEdit,
  FaExclamationTriangle,
  FaFileExcel,
  FaFilePdf,
  FaFilter,
  FaIdBadge,
  FaPlus,
  FaSearch,
  FaTrash,
  FaUserCheck,
  FaWallet,
} from "react-icons/fa"
import Button from "../../components/ui/Button"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import Input from "../../components/ui/Input"
import { AdminPage, AdminPanel } from "../../components/ui/AdminPage"
import Modal from "../../components/ui/Modal"
import Table from "../../components/ui/Table"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import { exportToExcel } from "../../utils/exportToExcel"
import { exportToPDF } from "../../utils/exportToPDF"
import EmployeForm from "./EmployeForm"
import {
  createEmploye,
  deleteEmploye,
  listEmployesPageData,
  updateEmploye,
} from "./employes.service"
import {
  buildEmployeAlerts,
  buildEmployeExportRows,
  buildEmployesPerCentre,
  EMPLOYE_STATUS_OPTIONS,
  filterEmployes,
  formatEmployeCurrency,
  formatEmployeDate,
  getEmployePosteOptions,
  getEmployeStatusStyles,
  getPaymentStatusStyles,
  PAYMENT_STATUS_OPTIONS,
} from "./employes.utils"

export default function EmployesPage() {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const [employes, setEmployes] = useState([])
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingEmploye, setEditingEmploye] = useState(null)
  const [deletingEmploye, setDeletingEmploye] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedCentre, setSelectedCentre] = useState("")
  const [selectedPoste, setSelectedPoste] = useState("")
  const [selectedStatut, setSelectedStatut] = useState("")
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("")
  const [exportingPDF, setExportingPDF] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)

  const centresMap = useMemo(
    () => Object.fromEntries(centres.map((centre) => [String(centre.id), centre.nom])),
    [centres]
  )

  const loadPromiseRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 220)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  async function loadData({ force = false, silent = false } = {}) {
    if (!force && loadPromiseRef.current) {
      return loadPromiseRef.current
    }

    const currentPromise = (async () => {
      if (!silent) {
        setLoading(true)
      }
      setHasError(false)

      try {
        const { employes: nextEmployes, centres: nextCentres } = await listEmployesPageData({ force })

        if (!mountedRef.current) {
          return
        }

        setEmployes(nextEmployes)
        setCentres(nextCentres)
      } catch (error) {
        if (!mountedRef.current) {
          return
        }

        console.error("[EmployesPage] Load error:", error)
        setHasError(true)
        showToast(error.message || "Erreur lors du chargement du personnel.", "error")
      } finally {
        if (mountedRef.current && !silent) {
          setLoading(false)
        }
      }
    })()

    loadPromiseRef.current = currentPromise

    try {
      await currentPromise
    } finally {
      if (loadPromiseRef.current === currentPromise) {
        loadPromiseRef.current = null
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true
    loadData()

    return () => {
      mountedRef.current = false
    }
    // Intentionally mount-only to prevent duplicate refresh loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function closeFormModal() {
    if (saving) return
    setShowFormModal(false)
    setEditingEmploye(null)
  }

  function openCreateModal() {
    setEditingEmploye(null)
    setShowFormModal(true)
  }

  function openEditModal(employe) {
    setEditingEmploye(employe)
    setShowFormModal(true)
  }

  function openDeleteDialog(employe) {
    setDeletingEmploye(employe)
    setShowDeleteDialog(true)
  }

  async function handleSubmit(payload) {
    setSaving(true)

    try {
      if (editingEmploye?.id) {
        await updateEmploye(editingEmploye.id, payload)
        showToast("Employé mis à jour avec succès.", "success")
      } else {
        await createEmploye(payload)
        showToast("Employé créé avec succès.", "success")
      }

      setShowFormModal(false)
      setEditingEmploye(null)
      await loadData({ force: true, silent: true })
    } catch (error) {
      console.error("[EmployesPage] Save error:", error)
      showToast(error.message || "Erreur lors de l'enregistrement.", "error")
    } finally {
      if (mountedRef.current) {
        setSaving(false)
      }
    }
  }

  async function handleDelete() {
    if (!deletingEmploye?.id) return

    setDeleting(true)

    try {
      await deleteEmploye(deletingEmploye.id)
      showToast("Employé supprimé avec succès.", "success")
      setShowDeleteDialog(false)
      setDeletingEmploye(null)
      await loadData({ force: true, silent: true })
    } catch (error) {
      console.error("[EmployesPage] Delete error:", error)
      showToast(error.message || "Erreur lors de la suppression.", "error")
    } finally {
      if (mountedRef.current) {
        setDeleting(false)
      }
    }
  }

  const summaryStats = useMemo(() => {
    const activeCount = employes.filter((entry) => entry.statut === "ACTIF").length
    const inactiveCount = employes.filter((entry) => entry.statut !== "ACTIF").length
    const totalSalary = employes.reduce((total, entry) => total + (Number(entry.salaire) || 0), 0)

    return [
      {
        label: "Total employés",
        value: employes.length,
        helper: "Effectif",
        icon: <FaIdBadge />,
        accent: "#2563eb",
      },
      {
        label: "Employés actifs",
        value: activeCount,
        helper: "Disponibles",
        icon: <FaUserCheck />,
        accent: "#059669",
      },
      {
        label: "Employés inactifs",
        value: inactiveCount,
        helper: "Hors activité",
        icon: <FaExclamationTriangle />,
        accent: "#dc2626",
      },
      {
        label: "Coût total mensuel",
        value: formatEmployeCurrency(totalSalary),
        helper: "Masse salariale",
        icon: <FaWallet />,
        accent: "#7c3aed",
      },
    ]
  }, [employes])

  const posteOptions = useMemo(() => getEmployePosteOptions(employes), [employes])

  const filteredEmployes = useMemo(
    () =>
      filterEmployes(employes, {
        query: debouncedSearch,
        centreId: selectedCentre,
        poste: selectedPoste,
        statut: selectedStatut,
        statutPaiement: selectedPaymentStatus,
      }),
    [debouncedSearch, employes, selectedCentre, selectedPaymentStatus, selectedPoste, selectedStatut]
  )

  const filtersActive = useMemo(
    () =>
      !!(
        debouncedSearch.trim() ||
        selectedCentre ||
        selectedPoste ||
        selectedStatut ||
        selectedPaymentStatus
      ),
    [debouncedSearch, selectedCentre, selectedPaymentStatus, selectedPoste, selectedStatut]
  )

  const employeAlerts = useMemo(() => buildEmployeAlerts(employes), [employes])

  const employesPerCentre = useMemo(
    () => buildEmployesPerCentre(filteredEmployes, centres).slice(0, 6),
    [centres, filteredEmployes]
  )

  const exportColumns = useMemo(
    () => [
      { key: "nom_prenom", label: "Nom et prénom", width: 24 },
      { key: "poste", label: "Poste", width: 18 },
      { key: "centre", label: "Centre", width: 20 },
      { key: "salaire", label: "Salaire", width: 16, render: (value) => formatEmployeCurrency(value) },
      { key: "statut", label: "Statut", width: 14 },
      { key: "statut_paiement", label: "Paiement", width: 16 },
    ],
    []
  )

  const exportRows = useMemo(
    () => buildEmployeExportRows(filteredEmployes, centresMap),
    [centresMap, filteredEmployes]
  )

  async function handleExportPDF() {
    if (exportRows.length === 0) {
      showToast("Aucun employé à exporter.", "warning")
      return
    }

    setExportingPDF(true)

    try {
      await exportToPDF({
        data: exportRows,
        columns: exportColumns,
        title: "Liste du personnel",
        subtitle: filtersActive
          ? "Export filtré du personnel"
          : "Export complet du répertoire du personnel",
        filename: "liste-personnel",
      })
      showToast("Export PDF généré avec succès.", "success")
    } catch (error) {
      console.error("[EmployesPage] PDF export error:", error)
      showToast(error.message || "Erreur lors de l'export PDF.", "error")
    } finally {
      if (mountedRef.current) {
        setExportingPDF(false)
      }
    }
  }

  async function handleExportExcel() {
    if (exportRows.length === 0) {
      showToast("Aucun employé à exporter.", "warning")
      return
    }

    setExportingExcel(true)

    try {
      await exportToExcel(exportRows, exportColumns, "liste-personnel", "Personnel")
      showToast("Export Excel généré avec succès.", "success")
    } catch (error) {
      console.error("[EmployesPage] Excel export error:", error)
      showToast(error.message || "Erreur lors de l'export Excel.", "error")
    } finally {
      if (mountedRef.current) {
        setExportingExcel(false)
      }
    }
  }

  function resetFilters() {
    setSearchInput("")
    setDebouncedSearch("")
    setSelectedCentre("")
    setSelectedPoste("")
    setSelectedStatut("")
    setSelectedPaymentStatus("")
  }

  const columns = useMemo(
    () => [
      {
        key: "nom_prenom",
        label: "Nom et prénom",
        sortable: true,
      },
      {
        key: "telephone",
        label: "Téléphone",
        sortable: true,
        render: (value) => value || "-",
      },
      {
        key: "poste",
        label: "Poste",
        sortable: true,
        render: (value) => value || "-",
      },
      {
        key: "centre_id",
        label: "Centre",
        sortable: true,
        render: (value) => centresMap[String(value)] || "Non assigné",
      },
      {
        key: "salaire",
        label: "Salaire",
        sortable: true,
        render: (value) => formatEmployeCurrency(value),
      },
      {
        key: "statut",
        label: "Statut",
        sortable: true,
        render: (value) => (
          <span
            style={{
              ...styles.statusBadge,
              ...getEmployeStatusStyles(value),
            }}
          >
            {value || "ACTIF"}
          </span>
        ),
      },
      {
        key: "statut_paiement",
        label: "Paiement",
        sortable: true,
        render: (value) => (
          <span
            style={{
              ...styles.statusBadge,
              ...getPaymentStatusStyles(value),
            }}
          >
            {String(value || "NON_PAYE").replace("_", " ")}
          </span>
        ),
      },
      {
        key: "date_embauche",
        label: "Date d'embauche",
        sortable: true,
        render: (value) => formatEmployeDate(value),
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        render: (_, row) => (
          <div style={styles.rowActions}>
            <Button
              variant="secondary"
              size="sm"
              icon={<FaEdit />}
              onClick={(event) => {
                event.stopPropagation()
                openEditModal(row)
              }}
            >
              Modifier
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<FaTrash />}
              onClick={(event) => {
                event.stopPropagation()
                openDeleteDialog(row)
              }}
            >
              Supprimer
            </Button>
          </div>
        ),
      },
    ],
    [centresMap]
  )

  if (!isAdmin) {
    return (
      <AdminPanel title="Accès restreint" subtitle="La gestion du personnel est réservée aux administrateurs.">
        <div style={styles.restrictedState}>Votre profil ne permet pas d'accéder au module personnel.</div>
      </AdminPanel>
    )
  }

  return (
    <>
      <AdminPage
        title="Personnel"
        subtitle="Centralisez les employés, filtrez rapidement les dossiers et suivez la situation salariale avec une expérience admin plus robuste."
        stats={summaryStats}
        actions={
          <>
            <Button
              variant="secondary"
              icon={<FaFilePdf />}
              onClick={handleExportPDF}
              disabled={exportingPDF || exportRows.length === 0}
            >
              {exportingPDF ? "Export PDF..." : "Export PDF"}
            </Button>
            <Button
              variant="secondary"
              icon={<FaFileExcel />}
              onClick={handleExportExcel}
              disabled={exportingExcel || exportRows.length === 0}
            >
              {exportingExcel ? "Export Excel..." : "Export Excel"}
            </Button>
            <Button variant="secondary" onClick={() => loadData({ force: true })} disabled={loading}>
              {loading ? "Actualisation..." : "Actualiser"}
            </Button>
          </>
        }
      >
        <AdminPanel
          title="Recherche & filtres"
          subtitle="Recherchez en temps réel par nom ou téléphone, puis combinez les filtres par centre, poste, statut et paiement."
        >
          <div style={styles.filterGrid}>
            <Input
              label="Recherche instantanée"
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Nom ou téléphone"
              icon={<FaSearch />}
            />

            <div style={styles.filterField}>
              <label style={styles.filterLabel}>Centre</label>
              <select value={selectedCentre} onChange={(event) => setSelectedCentre(event.target.value)} style={styles.select}>
                <option value="">Tous les centres</option>
                {centres.map((centre) => (
                  <option key={centre.id} value={centre.id}>
                    {centre.nom}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.filterField}>
              <label style={styles.filterLabel}>Poste</label>
              <select value={selectedPoste} onChange={(event) => setSelectedPoste(event.target.value)} style={styles.select}>
                <option value="">Tous les postes</option>
                {posteOptions.map((poste) => (
                  <option key={poste} value={poste}>
                    {poste}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.filterField}>
              <label style={styles.filterLabel}>Statut</label>
              <select value={selectedStatut} onChange={(event) => setSelectedStatut(event.target.value)} style={styles.select}>
                {EMPLOYE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.filterField}>
              <label style={styles.filterLabel}>Paiement</label>
              <select
                value={selectedPaymentStatus}
                onChange={(event) => setSelectedPaymentStatus(event.target.value)}
                style={styles.select}
              >
                {PAYMENT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.filterFooter}>
            <div style={styles.resultInfo}>
              <FaFilter size={13} />
              <span>
                {filteredEmployes.length} résultat{filteredEmployes.length > 1 ? "s" : ""}
                {filtersActive ? " après filtrage" : ""}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters} disabled={!filtersActive}>
              Réinitialiser
            </Button>
          </div>
        </AdminPanel>

        <AdminPanel
          title="Répertoire du personnel"
          subtitle="Tableau administrable avec tri, pagination et suivi du statut de paiement."
        >
          {hasError ? (
            <div style={styles.errorState}>
              Une erreur est survenue lors du chargement. Réessayez ou vérifiez vos droits.
            </div>
          ) : null}

          <Table
            data={filteredEmployes}
            columns={columns}
            sortable
            pagination
            pageSize={10}
            loading={loading && !hasError}
            emptyMessage={filtersActive ? "Aucun employé ne correspond aux critères." : "Aucun employé enregistré"}
          />
        </AdminPanel>

        <div style={styles.bottomGrid}>
          <AdminPanel
            title="Alertes salariales"
            subtitle="Indicateurs rapides sur les situations de paiement à surveiller."
          >
            {employeAlerts.length === 0 ? (
              <div style={styles.emptyPanel}>Aucune alerte salariale en cours.</div>
            ) : (
              <div style={styles.alertList}>
                {employeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      ...styles.alertCard,
                      ...(alert.tone === "danger"
                        ? styles.alertDanger
                        : alert.tone === "warning"
                          ? styles.alertWarning
                          : styles.alertInfo),
                    }}
                  >
                    <div style={styles.alertTitle}>{alert.title}</div>
                    <div style={styles.alertDescription}>{alert.description}</div>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>

          <AdminPanel
            title="Employés par centre"
            subtitle="Répartition du personnel sur la vue courante."
          >
            {employesPerCentre.length === 0 ? (
              <div style={styles.emptyPanel}>Aucune donnée centre disponible.</div>
            ) : (
              <div style={styles.centreList}>
                {employesPerCentre.map((entry) => (
                  <div key={entry.centre} style={styles.centreRow}>
                    <div>
                      <div style={styles.centreName}>{entry.centre}</div>
                      <div style={styles.centreMeta}>{formatEmployeCurrency(entry.totalSalary)} de coût mensuel</div>
                    </div>
                    <div style={styles.centreCount}>{entry.count}</div>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>
        </div>
      </AdminPage>

      <button type="button" onClick={openCreateModal} style={styles.floatingButton} aria-label="Ajouter un employé">
        <span style={styles.floatingIcon}>
          <FaPlus />
        </span>
        <span style={styles.floatingLabel}>Ajouter employé</span>
      </button>

      <Modal
        isOpen={showFormModal}
        onClose={closeFormModal}
        title={editingEmploye ? "Modifier un employé" : "Ajouter un employé"}
        size="lg"
      >
        <EmployeForm
          initialValues={editingEmploye}
          centres={centres}
          submitting={saving}
          onSubmit={handleSubmit}
          onCancel={closeFormModal}
        />
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          if (deleting) return
          setShowDeleteDialog(false)
          setDeletingEmploye(null)
        }}
        onConfirm={handleDelete}
        title="Supprimer l'employé"
        message={`Êtes-vous sûr de vouloir supprimer "${deletingEmploye?.nom_prenom || "cet employé"}" ? Cette action est irréversible.`}
        type="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
        loading={deleting}
      />
    </>
  )
}

const styles = {
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
  },
  filterField: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    color: "#334155",
    fontWeight: 700,
    display: "block",
    letterSpacing: "0.01em",
  },
  select: {
    width: "100%",
    minHeight: 48,
    borderRadius: 16,
    border: "1px solid rgba(203, 213, 225, 0.95)",
    padding: "0 16px",
    background: "rgba(255,255,255,0.96)",
    color: "#0f172a",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  },
  filterFooter: {
    marginTop: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  resultInfo: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    color: "#64748b",
    fontSize: 13,
    fontWeight: 700,
  },
  rowActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 28,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
  },
  errorState: {
    marginBottom: 16,
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
    fontWeight: 700,
  },
  restrictedState: {
    padding: "8px 0",
    color: "var(--admin-text-soft)",
    fontSize: 14,
    lineHeight: 1.6,
  },
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  emptyPanel: {
    minHeight: 120,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--admin-text-muted)",
    fontSize: 14,
  },
  alertList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  alertCard: {
    borderRadius: 16,
    padding: "14px 16px",
    border: "1px solid transparent",
  },
  alertDanger: {
    background: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.22)",
  },
  alertWarning: {
    background: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.22)",
  },
  alertInfo: {
    background: "rgba(59, 130, 246, 0.12)",
    borderColor: "rgba(59, 130, 246, 0.22)",
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: "var(--admin-text)",
  },
  alertDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 1.5,
    color: "var(--admin-text-soft)",
  },
  centreList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  centreRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid var(--admin-border)",
    background: "var(--admin-surface)",
  },
  centreName: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--admin-text)",
  },
  centreMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "var(--admin-text-soft)",
  },
  centreCount: {
    minWidth: 40,
    minHeight: 40,
    borderRadius: 12,
    background: "rgba(37, 99, 235, 0.12)",
    color: "#2563eb",
    fontSize: 15,
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  floatingButton: {
    position: "fixed",
    right: 24,
    bottom: 24,
    zIndex: 70,
    border: "none",
    borderRadius: 999,
    background: "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)",
    color: "#ffffff",
    boxShadow: "0 20px 42px rgba(153, 27, 27, 0.28)",
    minHeight: 58,
    padding: "0 18px",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 800,
  },
  floatingIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.16)",
    flexShrink: 0,
  },
  floatingLabel: {
    whiteSpace: "nowrap",
  },
}
