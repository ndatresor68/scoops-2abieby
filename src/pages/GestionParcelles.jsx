import { useEffect, useState, useCallback } from "react"
import { supabase } from "../supabaseClient"
import { FaPlus, FaSearch, FaEdit, FaTrash, FaMapMarkerAlt, FaPlay, FaStop, FaCheck, FaTimes, FaWifi } from "react-icons/fa"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import Modal from "../components/ui/Modal"
import { useToast } from "../components/ui/Toast"
import { useAuth } from "../context/AuthContext"
import { useMediaQuery } from "../hooks/useMediaQuery"
import { getParcellesQuery, getProducteursQuery, getUserRoleInfo } from "../utils/rolePermissions"
import useGpsTracker from "../components/maps/GpsTracker"
import ParcelMap from "../components/maps/ParcelMap"
import { generateParcelleCode } from "../utils/parcelleCode"
import { saveParcelleOffline, getPendingParcelles, isOnline, onOnlineStatusChange, markParcelleSynced, deleteSyncedParcelle } from "../utils/localStorageParcelles"
import * as turf from "@turf/turf"

/**
 * Page principale de gestion des parcelles avec GPS et Leaflet
 */
export default function GestionParcelles() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const [parcelles, setParcelles] = useState([])
  const [producteurs, setProducteurs] = useState([])
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const isMobile = useMediaQuery("(max-width: 640px)")

  // États pour le workflow GPS
  const [showStartButton, setShowStartButton] = useState(true) // Afficher le bouton "Démarrer la mesure"
  const [isTracking, setIsTracking] = useState(false)
  const [trackPoints, setTrackPoints] = useState([])
  const [currentPosition, setCurrentPosition] = useState(null)
  const [gpsError, setGpsError] = useState(null)
  const [showMeasurementForm, setShowMeasurementForm] = useState(false)
  const [measuredArea, setMeasuredArea] = useState(null) // en hectares
  const [estimatedArea, setEstimatedArea] = useState(0) // Surface estimée en temps réel
  const [measuredPolygon, setMeasuredPolygon] = useState(null)
  const [onlineStatus, setOnlineStatus] = useState(true)

  const { isCentre, centreId } = getUserRoleInfo(user)

  // Formulaire après mesure
  const [formData, setFormData] = useState({
    producteur_id: "",
    code_parcelle: "",
    superficie: "",
    coordonnees: "",
    date_mesure: new Date().toISOString().split("T")[0],
    type_cacao: "",
    annee_plantation: "",
    notes: "",
  })

  // Fonction de callback pour les mises à jour GPS
  const handlePositionUpdate = useCallback((position) => {
    setCurrentPosition(position)
    setGpsError(null)

    if (isTracking) {
      // Ajouter le point au tracé
      setTrackPoints((prev) => {
        const newTrackPoints = [...prev, position]

        // Calculer la surface estimée en temps réel si on a au moins 3 points
        if (newTrackPoints.length >= 3) {
          try {
            const closedPolygon = [...newTrackPoints, newTrackPoints[0]]
            const coordinates = closedPolygon.map((pt) => [pt.lng, pt.lat])
            const polygon = turf.polygon([coordinates])
            const areaM2 = turf.area(polygon)
            const areaHa = areaM2 / 10000
            setEstimatedArea(areaHa)
          } catch (err) {
            console.error("[GestionParcelles] Error calculating estimated area:", err)
          }
        }

        return newTrackPoints
      })
    }
  }, [isTracking])

  // Utiliser le tracker GPS
  const { currentPosition: gpsPosition, error: trackerError, accuracy, lowAccuracyWarning } = useGpsTracker({
    onPositionUpdate: handlePositionUpdate,
    isTracking,
    accuracyThreshold: 20, // 20 mètres
  })

  useEffect(() => {
    if (trackerError) {
      setGpsError(trackerError)
    }
  }, [trackerError])

  // Surveiller le statut de connexion
  useEffect(() => {
    setOnlineStatus(isOnline())
    const cleanup = onOnlineStatusChange((online) => {
      setOnlineStatus(online)
      if (online) {
        showToast("Connexion rétablie - Synchronisation en cours...", "success")
        syncPendingParcelles()
      } else {
        showToast("Mode hors ligne activé", "warning")
      }
    })
    return cleanup
  }, [])

  async function fetchParcelles() {
    try {
      setLoading(true)
      const query = getParcellesQuery(user)
      if (!query) {
        setParcelles([])
        return
      }

      // Joindre les informations de producteur et centre
      const { data, error } = await query
        .select(`
          *,
          producteurs:producteur_id(nom, code),
          centres:centre_id(nom)
        `)

      if (error) {
        console.error("[GestionParcelles] Error loading parcelles:", error)
        showToast("Erreur lors du chargement des parcelles", "error")
        return
      }

      // Formater les données avec les noms
      const formatted = (data || []).map((p) => ({
        ...p,
        producteur_nom: p.producteurs?.nom || "-",
        producteur_code: p.producteurs?.code || "-",
        centre_nom: p.centres?.nom || "-",
      }))

      setParcelles(formatted)
    } catch (error) {
      console.error("[GestionParcelles] Exception loading parcelles:", error)
      showToast("Erreur lors du chargement", "error")
    } finally {
      setLoading(false)
    }
  }

  async function fetchProducteurs() {
    try {
      const query = getProducteursQuery(user)
      const { data, error } = await query

      if (error) {
        console.error("[GestionParcelles] Error loading producteurs:", error)
        return
      }

      setProducteurs(data || [])
    } catch (error) {
      console.error("[GestionParcelles] Exception loading producteurs:", error)
    }
  }

  async function fetchCentres() {
    try {
      const { data, error } = await supabase
        .from("centres")
        .select("id, nom, code")
        .order("nom")

      if (error) {
        console.error("[GestionParcelles] Error loading centres:", error)
        return
      }

      setCentres(data || [])
    } catch (error) {
      console.error("[GestionParcelles] Exception loading centres:", error)
    }
  }

  useEffect(() => {
    fetchParcelles()
    fetchProducteurs()
    fetchCentres()
    syncPendingParcelles()
  }, [user])

  // Synchroniser les parcelles en attente
  async function syncPendingParcelles() {
    if (!isOnline()) return

    try {
      const pending = await getPendingParcelles()
      if (pending.length === 0) return

      showToast(`Synchronisation de ${pending.length} parcelle(s)...`, "info")

      for (const parcelle of pending) {
        try {
          const { error } = await supabase.from("parcelles").insert([parcelle])

          if (!error) {
            await markParcelleSynced(parcelle.id)
            await deleteSyncedParcelle(parcelle.id)
          }
        } catch (err) {
          console.error("[GestionParcelles] Error syncing parcelle:", err)
        }
      }

      await fetchParcelles()
      showToast("Synchronisation terminée", "success")
    } catch (error) {
      console.error("[GestionParcelles] Error syncing:", error)
    }
  }

  // Démarrer la mesure GPS
  function startMeasurement() {
    if (!navigator.geolocation) {
      showToast("La géolocalisation n'est pas disponible", "error")
      return
    }

    // Demander la permission
    navigator.geolocation.getCurrentPosition(
      () => {
        setIsTracking(true)
        setShowStartButton(false)
        setTrackPoints([])
        setEstimatedArea(0)
        setGpsError(null)
        setMeasuredArea(null)
        setMeasuredPolygon(null)
        showToast("Mesure démarrée - Marchez autour du champ", "success")
      },
      (err) => {
        showToast("Permission GPS refusée", "error")
        setGpsError("Permission refusée")
      }
    )
  }

  // Terminer la mesure et calculer la surface
  function finishMeasurement() {
    if (trackPoints.length < 3) {
      showToast("Au moins 3 points sont nécessaires pour créer une parcelle", "error")
      return
    }

    setIsTracking(false)

    // Fermer le polygone en ajoutant le premier point à la fin
    const closedPolygon = [...trackPoints, trackPoints[0]]

    // Convertir en format GeoJSON pour Turf.js
    const coordinates = closedPolygon.map((pt) => [pt.lng, pt.lat])
    const polygon = turf.polygon([coordinates])

    // Calculer la surface en m²
    const areaM2 = turf.area(polygon)

    // Convertir en hectares
    const areaHa = areaM2 / 10000

    setMeasuredArea(areaHa)
    setMeasuredPolygon(closedPolygon.map((pt) => [pt.lat, pt.lng]))

    // Ouvrir le formulaire
    setFormData({
      producteur_id: "",
      code_parcelle: "", // Sera généré quand le producteur sera sélectionné
      superficie: areaHa.toFixed(4),
      coordonnees: JSON.stringify(closedPolygon),
      date_mesure: new Date().toISOString().split("T")[0],
      type_cacao: "",
      annee_plantation: "",
      notes: "",
    })

    setShowMeasurementForm(true)
    setShowStartButton(true)
    showToast(`Surface mesurée: ${areaHa.toFixed(4)} hectares`, "success")
  }

  // Annuler la mesure
  function cancelMeasurement() {
    setIsTracking(false)
    setShowStartButton(true)
    setTrackPoints([])
    setEstimatedArea(0)
    setMeasuredArea(null)
    setMeasuredPolygon(null)
    setShowMeasurementForm(false)
  }

  // Gérer le changement de producteur
  async function handleProducteurChange(producteurId) {
    const producteur = producteurs.find((p) => String(p.id) === String(producteurId))
    if (producteur) {
      // Récupérer le code du centre pour générer le code parcelle
      const centreIdForCode = isCentre ? centreId : (producteur?.centre_id || null)
      const centre = centres.find((c) => String(c.id) === String(centreIdForCode))
      const centreCode = centre?.code || "UNK"
      
      // Générer le code parcelle avec le code centre
      const code = await generateParcelleCode(centreCode)
      
      setFormData((prev) => ({
        ...prev,
        producteur_id: producteurId,
        code_parcelle: code,
      }))
    }
  }

  // Sauvegarder la parcelle
  async function handleSaveParcelle(e) {
    e.preventDefault()

    if (!formData.producteur_id) {
      showToast("Sélectionnez un producteur", "error")
      return
    }

    try {
      const selectedProducteur = producteurs.find((p) => String(p.id) === String(formData.producteur_id))
      
      const payload = {
        code_parcelle: formData.code_parcelle,
        producteur_id: formData.producteur_id,
        centre_id: isCentre ? centreId : (selectedProducteur?.centre_id || null),
        superficie: Number(formData.superficie),
        coordonnees: formData.coordonnees,
        date_mesure: formData.date_mesure,
        type_cacao: formData.type_cacao || null,
        annee_plantation: formData.annee_plantation ? Number(formData.annee_plantation) : null,
        notes: formData.notes || null,
        created_by: user?.id || null,
        statut: "active",
      }

      if (isOnline()) {
        // Sauvegarder directement dans Supabase
        const { error } = await supabase.from("parcelles").insert([payload])

        if (error) throw error

        showToast("Parcelle enregistrée avec succès", "success")
      } else {
        // Sauvegarder dans IndexedDB pour synchronisation ultérieure
        await saveParcelleOffline(payload)
        showToast("Parcelle sauvegardée hors ligne - Synchronisation à la reconnexion", "info")
      }

      // Réinitialiser
      cancelMeasurement()
      await fetchParcelles()
    } catch (error) {
      console.error("[GestionParcelles] Error saving parcelle:", error)
      showToast("Erreur lors de l'enregistrement", "error")
    }
  }

  function getProducteurNom(producteurId) {
    return producteurs.find((p) => String(p.id) === String(producteurId))?.nom || "-"
  }

  const filteredParcelles = parcelles.filter((p) => {
    const producteurNom = getProducteurNom(p.producteur_id)
    return (
      producteurNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code_parcelle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.localisation?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  // Centre de la carte (toujours centré sur l'utilisateur si disponible)
  const mapCenter = currentPosition
    ? [currentPosition.lat, currentPosition.lng]
    : [5.3600, -4.0083]
  
  // Mettre à jour le centre de la carte quand la position change
  useEffect(() => {
    if (currentPosition && isTracking) {
      // La carte se centrera automatiquement via le composant MapCenter
    }
  }, [currentPosition, isTracking])

  return (
    <div style={container}>
      {/* En-tête */}
      <div style={{
        ...header,
        flexDirection: isMobile ? "column" : "row",
      }}>
        <div>
          <h1 style={{
            ...title,
            fontSize: isMobile ? "24px" : "32px",
          }}>
            Gestion des Parcelles
            {!onlineStatus && (
              <span style={{ marginLeft: 12, fontSize: "14px", color: "#f59e0b", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <FaWifi style={{ opacity: 0.5, transform: "rotate(45deg)" }} /> Hors ligne
              </span>
            )}
          </h1>
          <p style={subtitle}>Mesure GPS des parcelles avec Leaflet</p>
        </div>
        {showStartButton && (
          <Button
            onClick={() => {
              setShowMeasurementForm(false)
              startMeasurement()
            }}
            icon={<FaPlus />}
            style={{
              width: isMobile ? "100%" : "auto",
            }}
          >
            Ajouter parcelle
          </Button>
        )}
      </div>

      {/* Mode mesure GPS */}
      {isTracking && (
        <div style={fullScreenContainer}>
          {/* En-tête flottant avec statistiques */}
          <div style={measurementHeaderFloating}>
            <div style={statsContainer}>
              <div style={statItem}>
                <strong style={{ fontSize: "24px", color: "#3b82f6" }}>{trackPoints.length}</strong>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>Points GPS</span>
              </div>
              {accuracy !== null && (
                <div style={statItem}>
                  <strong style={{ 
                    fontSize: "20px", 
                    color: accuracy > 20 ? "#f59e0b" : "#10b981" 
                  }}>
                    {Math.round(accuracy)}m
                  </strong>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>Précision</span>
                </div>
              )}
              {estimatedArea > 0 && (
                <div style={statItem}>
                  <strong style={{ fontSize: "24px", color: "#10b981" }}>
                    {estimatedArea.toFixed(4)}
                  </strong>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>Hectares</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button
                variant="success"
                onClick={finishMeasurement}
                icon={<FaCheck />}
                disabled={trackPoints.length < 3}
                size="lg"
              >
                Terminer la mesure
              </Button>
              <Button
                variant="danger"
                onClick={cancelMeasurement}
                icon={<FaTimes />}
                size="lg"
              >
                Annuler
              </Button>
            </div>
          </div>

          {/* Avertissement précision faible */}
          {lowAccuracyWarning && (
            <div style={warningBoxFloating}>
              <strong>⚠️ Attendez une meilleure précision GPS...</strong>
              <span style={{ fontSize: "12px", marginLeft: 8 }}>
                Précision actuelle: {Math.round(accuracy)}m (recommandé: &lt;20m)
              </span>
            </div>
          )}

          {/* Erreur GPS (affichée après 10 secondes) */}
          {trackerError && (
            <div style={{
              ...errorBoxFloating,
              top: lowAccuracyWarning ? 160 : 100, // Ajuster la position selon l'avertissement
            }}>
              <strong>Erreur GPS:</strong> {trackerError}
            </div>
          )}

          {/* Carte plein écran */}
          <ParcelMap
            trackPoints={trackPoints}
            currentUserPosition={currentPosition}
            center={mapCenter}
            zoom={17}
            maxZoom={19}
            fullScreen={true}
          />
        </div>
      )}

      {/* Bouton flottant mobile pour démarrer la mesure */}
      {showStartButton && isMobile && !isTracking && (
        <button
          onClick={() => {
            setShowMeasurementForm(false)
            startMeasurement()
          }}
          style={floatingButton}
          aria-label="Ajouter parcelle"
        >
          <FaPlus size={24} />
        </button>
      )}

      {/* Liste des parcelles */}
      <Card>
        <div style={searchBar}>
          <Input
            icon={<FaSearch />}
            placeholder="Rechercher une parcelle..."
            value={searchTerm}
            onChange={setSearchTerm}
            style={{ flex: 1, maxWidth: "400px" }}
          />
          <div style={statsBadge}>
            {filteredParcelles.length} parcelle{filteredParcelles.length > 1 ? "s" : ""}
          </div>
        </div>

        {loading ? (
          <div style={loadingState}>
            <div style={spinner}></div>
            <p>Chargement...</p>
          </div>
        ) : filteredParcelles.length === 0 ? (
          <div style={emptyState}>
            <p style={emptyText}>
              {searchTerm ? "Aucune parcelle trouvée" : "Aucune parcelle enregistrée"}
            </p>
          </div>
        ) : (
          <div style={tableContainer}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Code</th>
                  <th style={th}>Producteur</th>
                  <th style={th}>Superficie (ha)</th>
                  <th style={th}>Date mesure</th>
                  <th style={th}>Type Cacao</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParcelles.map((p) => (
                  <tr key={p.id}>
                    <td style={td}>
                      <strong>{p.code_parcelle || "-"}</strong>
                    </td>
                    <td style={td}>
                      <strong>{p.producteur_nom || getProducteurNom(p.producteur_id)}</strong>
                      <br />
                      <small style={{ color: "#6b7280" }}>{p.producteur_code}</small>
                    </td>
                    <td style={td}>{p.superficie ? Number(p.superficie).toFixed(4) : "-"}</td>
                    <td style={td}>{p.date_mesure || "-"}</td>
                    <td style={td}>{p.type_cacao || "-"}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            // Afficher la parcelle sur la carte
                            if (p.coordonnees) {
                              try {
                                const coords = JSON.parse(p.coordonnees)
                                if (coords.length > 0) {
                                  const center = [coords[0].lat, coords[0].lng]
                                  // TODO: Ouvrir une modal avec la carte centrée
                                  showToast("Visualisation de la parcelle sur la carte", "info")
                                }
                              } catch (err) {
                                showToast("Erreur lors de l'affichage", "error")
                              }
                            }
                          }}
                          icon={<FaMapMarkerAlt />}
                        >
                          Voir carte
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={async () => {
                            if (!confirm("Êtes-vous sûr de vouloir supprimer cette parcelle ?")) {
                              return
                            }
                            try {
                              const { error } = await supabase.from("parcelles").delete().eq("id", p.id)
                              if (error) throw error
                              showToast("Parcelle supprimée", "success")
                              fetchParcelles()
                            } catch (error) {
                              showToast("Erreur lors de la suppression", "error")
                            }
                          }}
                          icon={<FaTrash />}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal formulaire après mesure */}
      <Modal
        isOpen={showMeasurementForm}
        onClose={cancelMeasurement}
        title="Enregistrer la parcelle mesurée"
        size="lg"
      >
        <form onSubmit={handleSaveParcelle}>
          <div style={formGrid}>
            {/* Champs non modifiables */}
            <Input
              label="Code parcelle"
              value={formData.code_parcelle}
              disabled
              style={{ background: "#f9fafb" }}
            />
            <Input
              label="Superficie (hectares)"
              value={formData.superficie}
              disabled
              style={{ background: "#f9fafb" }}
            />
            <Input
              label="Date mesure"
              type="date"
              value={formData.date_mesure}
              disabled
              style={{ background: "#f9fafb" }}
            />
            <Input
              label="Agent"
              value={user?.nom || user?.email || "-"}
              disabled
              style={{ background: "#f9fafb" }}
            />

            {/* Champs modifiables */}
            <div style={formGroup}>
              <label style={label}>Producteur *</label>
              <select
                value={formData.producteur_id}
                onChange={(e) => handleProducteurChange(e.target.value)}
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

            {formData.producteur_id && (
              <>
                <Input
                  label="Code producteur"
                  value={producteurs.find((p) => String(p.id) === String(formData.producteur_id))?.code || ""}
                  disabled
                  style={{ background: "#f9fafb" }}
                />
                <Input
                  label="Centre"
                  value={producteurs.find((p) => String(p.id) === String(formData.producteur_id))?.centre_nom || "-"}
                  disabled
                  style={{ background: "#f9fafb" }}
                />
              </>
            )}

            <Input
              label="Type de cacao"
              value={formData.type_cacao}
              onChange={(v) => setFormData({ ...formData, type_cacao: v })}
              placeholder="Ex: Forastero, Criollo"
            />

            <Input
              label="Année de plantation"
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              value={formData.annee_plantation}
              onChange={(v) => setFormData({ ...formData, annee_plantation: v })}
              placeholder="Ex: 2020"
            />

            <div style={formGroup}>
              <label style={label}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{
                  ...selectInput,
                  minHeight: "100px",
                  resize: "vertical",
                }}
                placeholder="Notes supplémentaires..."
              />
            </div>
          </div>

          {/* Aperçu de la parcelle sur la carte */}
          {measuredPolygon && (
            <div style={{ marginTop: 24, marginBottom: 24 }}>
              <label style={label}>Aperçu de la parcelle</label>
              <div style={{ height: "300px", borderRadius: "12px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
                <ParcelMap
                  polygon={measuredPolygon}
                  center={mapCenter}
                  zoom={17}
                  maxZoom={19}
                  fullScreen={false}
                />
              </div>
            </div>
          )}

          <div style={modalActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={cancelMeasurement}
              style={{
                width: isMobile ? "100%" : "auto",
              }}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              style={{
                width: isMobile ? "100%" : "auto",
              }}
            >
              {onlineStatus ? "Enregistrer" : "Sauvegarder hors ligne"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// Styles
const container = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
  padding: "0 16px",
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

const measurementHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
  flexWrap: "wrap",
  gap: 16,
}

const errorBox = {
  padding: "12px 16px",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  color: "#dc2626",
  marginBottom: 16,
  fontSize: "14px",
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

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 24,
  paddingTop: 24,
  borderTop: "1px solid #e5e7eb",
  flexWrap: "wrap",
}

const fullScreenContainer = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 9999,
  background: "#f3f4f6",
  display: "flex",
  flexDirection: "column",
}

const measurementHeaderFloating = {
  position: "absolute",
  top: 16,
  left: 16,
  right: 16,
  zIndex: 10000,
  background: "white",
  borderRadius: "16px",
  padding: "16px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 16,
}

const statsContainer = {
  display: "flex",
  gap: 24,
  alignItems: "center",
  flexWrap: "wrap",
}

const statItem = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
}

const warningBoxFloating = {
  position: "absolute",
  top: 100,
  left: 16,
  right: 16,
  zIndex: 10000,
  padding: "12px 16px",
  background: "#fef3c7",
  border: "1px solid #fcd34d",
  borderRadius: "8px",
  color: "#92400e",
  fontSize: "14px",
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
}

const errorBoxFloating = {
  position: "absolute",
  top: 160, // Positionné sous l'avertissement si présent
  left: 16,
  right: 16,
  zIndex: 10000,
  padding: "12px 16px",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  color: "#dc2626",
  fontSize: "14px",
}

const floatingButton = {
  position: "fixed",
  bottom: 24,
  right: 24,
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  background: "linear-gradient(90deg, #7a1f1f, #b02a2a)",
  color: "white",
  border: "none",
  boxShadow: "0 4px 20px rgba(122, 31, 31, 0.4)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  transition: "transform 0.2s ease",
}

