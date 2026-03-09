import { useEffect, useState, useRef } from "react"
import { supabase } from "./supabaseClient"
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaPhone,
  FaUser,
  FaFilePdf,
  FaTimes,
  FaFilter,
} from "react-icons/fa"
import Card from "./components/ui/Card"
import Button from "./components/ui/Button"
import Input from "./components/ui/Input"
import Modal from "./components/ui/Modal"
import ImageUpload from "./components/ImageUpload"
import ProducteurDetail from "./components/ProducteurDetail"
import { useToast } from "./components/ui/Toast"
import { useMediaQuery } from "./hooks/useMediaQuery"
import { jsPDF } from "jspdf"
import "jspdf-autotable"

export default function Producteurs() {
  const { showToast } = useToast()
  const [producteurs, setProducteurs] = useState([])
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProducteur, setEditingProducteur] = useState(null)
  const [selectedProducteur, setSelectedProducteur] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCentre, setSelectedCentre] = useState("")
  const [generatedCode, setGeneratedCode] = useState("")
  const [uploading, setUploading] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfCentreFilter, setPdfCentreFilter] = useState("")
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const isMobile = useMediaQuery("(max-width: 640px)")

  const [formData, setFormData] = useState({
    nom: "",
    telephone: "",
    sexe: "",
    localite: "",
    statut: "",
    centre_id: "",
  })

  const [files, setFiles] = useState({
    photo: null,
    photo_cni_recto: null,
    photo_cni_verso: null,
    carte_planteur: null,
  })

  const [existingUrls, setExistingUrls] = useState({
    photo: "",
    photo_cni_recto: "",
    photo_cni_verso: "",
    carte_planteur: "",
  })

  async function fetchProducteurs() {
    try {
      console.log("[Producteurs] Fetching producteurs...")
      
      // Timeout protection: max 15 seconds
      const queryPromise = supabase
        .from("producteurs")
        .select("*")
        .order("created_at", { ascending: false })
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Query timeout")), 15000)
      )
      
      const { data: producteursData, error } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]).catch((err) => {
        console.error("[Producteurs] Query timeout or error:", err)
        return { data: null, error: err }
      })

      if (error) {
        console.error("[Producteurs] Erreur fetch producteurs:", error)
        // Don't show toast on initial load to avoid spam
        setProducteurs([])
        return
      }

      if (!producteursData) {
        setProducteurs([])
        return
      }

      console.log(`[Producteurs] Loaded ${producteursData.length} producteurs`)
      setProducteurs(producteursData)
    } catch (error) {
      console.error("[Producteurs] Exception in fetchProducteurs:", error)
      setProducteurs([])
    }
  }

  async function fetchCentres() {
    try {
      console.log("[Producteurs] Fetching centres...")
      
      // Timeout protection: max 10 seconds
      const queryPromise = supabase.from("centres").select("id, nom").order("nom")
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Query timeout")), 10000)
      )
      
      const { data, error } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]).catch((err) => {
        console.error("[Producteurs] Centres query timeout or error:", err)
        return { data: null, error: err }
      })

      if (error) {
        console.error("[Producteurs] Error fetching centres:", error)
        setCentres([])
        return
      }

      console.log(`[Producteurs] Loaded ${data?.length || 0} centres`)
      setCentres(data || [])
    } catch (error) {
      console.error("[Producteurs] Exception in fetchCentres:", error)
      setCentres([])
    }
  }

  useEffect(() => {
    let mounted = true
    
    async function loadData() {
      setLoading(true)
      try {
        console.log("[Producteurs] Starting data load...")
        await Promise.all([
          fetchProducteurs(),
    fetchCentres()
        ])
        console.log("[Producteurs] Data load completed")
      } catch (error) {
        console.error("[Producteurs] Error loading initial data:", error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    loadData()
    
    return () => {
      mounted = false
    }
  }, [])

  async function generateCode() {
    const { data, error } = await supabase
      .from("producteurs")
      .select("code")
      .not("code", "is", null)

    if (error) {
      console.error(error)
      setGeneratedCode("ASAB-001")
      return
    }

    if (!data || data.length === 0) {
      setGeneratedCode("ASAB-001")
      return
    }

    const numbers = data
      .map((item) => {
        if (!item.code) return null
        const parts = item.code.split("-")
        return parseInt(parts[1])
      })
      .filter((n) => !isNaN(n))

    if (numbers.length === 0) {
      setGeneratedCode("ASAB-001")
      return
    }

    const maxNumber = Math.max(...numbers)
    setGeneratedCode(`ASAB-${String(maxNumber + 1).padStart(3, "0")}`)
  }

  async function uploadFile(file, folder, producteurId) {
    if (!file) return null

    try {
      // Valider le type de fichier
      if (!file.type.startsWith("image/")) {
        throw new Error("Le fichier doit être une image")
      }

      // Valider la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("L'image ne doit pas dépasser 5MB")
      }

      const extension = file.name.split(".").pop() || "jpg"
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 9)
      const fileName = `${producteurId || "temp"}-${timestamp}-${randomId}.${extension}`
      const path = `${folder}/${fileName}`

      showToast("Upload de l'image en cours...", "info")

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("producteurs")
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
        })

      if (uploadError) {
        console.error("Erreur upload:", uploadError)
        // Si le bucket n'existe pas, on informe l'utilisateur
        if (uploadError.message.includes("Bucket") || uploadError.message.includes("bucket")) {
          throw new Error(
            "Le bucket 'producteurs' n'existe pas dans Supabase Storage. Veuillez le créer dans votre dashboard Supabase.",
          )
        }
        if (uploadError.message.includes("duplicate")) {
          // Si le fichier existe déjà, on récupère l'URL existante
          const { data: publicUrlData } = supabase.storage.from("producteurs").getPublicUrl(path)
          return publicUrlData.publicUrl
        }
        throw new Error(uploadError.message)
      }

      const { data: publicUrlData } = supabase.storage.from("producteurs").getPublicUrl(path)
      if (!publicUrlData?.publicUrl) {
        throw new Error("Impossible de récupérer l'URL publique de l'image")
      }

      return publicUrlData.publicUrl
    } catch (error) {
      console.error("Erreur lors de l'upload:", error)
      throw error
    }
  }

  function openForm(producteur = null) {
    if (producteur) {
      setEditingProducteur(producteur)
      setFormData({
        nom: producteur.nom || "",
        telephone: producteur.telephone || "",
        sexe: producteur.sexe || "",
        localite: producteur.localite || "",
        statut: producteur.statut || "",
        centre_id: producteur.centre_id ? String(producteur.centre_id) : "",
      })
      setGeneratedCode(producteur.code || "")
      setExistingUrls({
        photo: producteur.photo || "",
        photo_cni_recto: producteur.photo_cni_recto || "",
        photo_cni_verso: producteur.photo_cni_verso || "",
        carte_planteur: producteur.carte_planteur || "",
      })
      setFiles({
        photo: null,
        photo_cni_recto: null,
        photo_cni_verso: null,
        carte_planteur: null,
      })
    } else {
      setEditingProducteur(null)
      setFormData({
        nom: "",
        telephone: "",
        sexe: "",
        localite: "",
        statut: "",
        centre_id: "",
      })
      setGeneratedCode("")
      setExistingUrls({
        photo: "",
        photo_cni_recto: "",
        photo_cni_verso: "",
        carte_planteur: "",
      })
      setFiles({
        photo: null,
        photo_cni_recto: null,
        photo_cni_verso: null,
        carte_planteur: null,
      })
      generateCode()
    }
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingProducteur(null)
    setFormData({
      nom: "",
      telephone: "",
      sexe: "",
      localite: "",
      statut: "",
      centre_id: "",
    })
    setGeneratedCode("")
    setExistingUrls({
      photo: "",
      photo_cni_recto: "",
      photo_cni_verso: "",
      carte_planteur: "",
    })
    setFiles({
      photo: null,
      photo_cni_recto: null,
      photo_cni_verso: null,
      carte_planteur: null,
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.nom.trim()) {
      showToast("Le nom est obligatoire", "error")
      return
    }

    if (!formData.telephone.trim()) {
      showToast("Le téléphone est obligatoire", "error")
      return
    }

    setUploading(true)

    try {
      const producteurId = editingProducteur?.id || `temp-${Date.now()}`
      const uploadPromises = []

      // Upload des fichiers
      if (files.photo) {
        uploadPromises.push(
          uploadFile(files.photo, "photos", producteurId).then((url) => ({
            key: "photo",
            url,
          })),
        )
      }
      if (files.photo_cni_recto) {
        uploadPromises.push(
          uploadFile(files.photo_cni_recto, "documents", producteurId).then((url) => ({
            key: "photo_cni_recto",
            url,
          })),
        )
      }
      if (files.photo_cni_verso) {
        uploadPromises.push(
          uploadFile(files.photo_cni_verso, "documents", producteurId).then((url) => ({
            key: "photo_cni_verso",
            url,
          })),
        )
      }
      if (files.carte_planteur) {
        uploadPromises.push(
          uploadFile(files.carte_planteur, "documents", producteurId).then((url) => ({
            key: "carte_planteur",
            url,
          })),
        )
      }

      // Upload des fichiers avec gestion d'erreurs individuelle
      const uploadResults = await Promise.allSettled(uploadPromises)
      const urlMap = {}
      uploadResults.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          const { key, url } = result.value
          urlMap[key] = url
        } else if (result.status === "rejected") {
          console.error(`Erreur upload fichier ${index}:`, result.reason)
          // On continue même si un upload échoue
        }
      })

      // Convertir centre_id en UUID si nécessaire
      let centreIdValue = null
      if (formData.centre_id && formData.centre_id.trim() !== "") {
        centreIdValue = formData.centre_id
      }

      const payload = {
        code: editingProducteur ? editingProducteur.code : generatedCode,
        nom: formData.nom.trim(),
        telephone: formData.telephone.trim(),
        sexe: formData.sexe || null,
        localite: formData.localite?.trim() || null,
        statut: formData.statut || null,
        centre_id: centreIdValue,
        photo: urlMap.photo || existingUrls.photo || null,
        photo_cni_recto: urlMap.photo_cni_recto || existingUrls.photo_cni_recto || null,
        photo_cni_verso: urlMap.photo_cni_verso || existingUrls.photo_cni_verso || null,
        carte_planteur: urlMap.carte_planteur || existingUrls.carte_planteur || null,
      }

      if (editingProducteur) {
        const { data, error } = await supabase
          .from("producteurs")
          .update(payload)
          .eq("id", editingProducteur.id)
          .select()

        if (error) {
          console.error("Erreur mise à jour:", error)
          throw new Error(error.message || "Erreur lors de la mise à jour du producteur")
        }

        if (!data || data.length === 0) {
          throw new Error("Aucun producteur mis à jour")
        }

        showToast("Producteur modifié avec succès", "success")
      } else {
        const { data, error } = await supabase.from("producteurs").insert([payload]).select()

        if (error) {
          console.error("Erreur insertion:", error)
          throw new Error(error.message || "Erreur lors de l'ajout du producteur")
        }

        if (!data || data.length === 0) {
          throw new Error("Impossible de créer le producteur")
        }

        showToast("Producteur ajouté avec succès", "success")
      }

      closeForm()
      // Rafraîchir la liste après un court délai pour laisser le temps à la DB
      setTimeout(() => {
      fetchProducteurs()
      }, 500)
    } catch (error) {
      console.error("Erreur handleSubmit:", error)
      const errorMessage =
        error.message || "Erreur lors de l'enregistrement. Vérifiez votre connexion et réessayez."
      showToast(errorMessage, "error")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(producteur) {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le producteur "${producteur.nom}" ?`)) {
      return
    }

    try {
      const { error } = await supabase.from("producteurs").delete().eq("id", producteur.id)
      if (error) throw error
      showToast("Producteur supprimé avec succès", "success")
      fetchProducteurs()
    } catch (error) {
      console.error(error)
      showToast("Erreur lors de la suppression", "error")
    }
  }

  function handleViewDetail(producteur) {
    setSelectedProducteur(producteur)
    setShowDetail(true)
  }

  function getCentreNom(centreId) {
    if (!centreId) return "-"
    const centre = centres.find((c) => String(c.id) === String(centreId))
    return centre?.nom || "-"
  }

  const filteredProducteurs = producteurs.filter((producteur) => {
    const matchesSearch =
      producteur.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producteur.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producteur.telephone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCentreNom(producteur.centre_id)?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCentre = !selectedCentre || String(producteur.centre_id) === String(selectedCentre)

    return matchesSearch && matchesCentre
  })

  function resetFilters() {
    setSearchTerm("")
    setSelectedCentre("")
  }

  function openPdfModal() {
    setPdfCentreFilter("")
    setShowPdfModal(true)
  }

  async function generatePDF() {
    setGeneratingPdf(true)
    try {
      // Filtrer les producteurs selon le centre sélectionné
      let producteursToExport = producteurs
      if (pdfCentreFilter && pdfCentreFilter !== "") {
        producteursToExport = producteurs.filter(
          (p) => String(p.centre_id) === String(pdfCentreFilter),
        )
      }

      if (producteursToExport.length === 0) {
        showToast("Aucun producteur à exporter", "warning")
        setShowPdfModal(false)
        setGeneratingPdf(false)
        return
      }

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // En-tête avec logo et nom
      doc.setFillColor(122, 31, 31)
      doc.rect(0, 0, pageWidth, 40, "F")

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont("helvetica", "bold")
      doc.text("SCOOP ASAB-COOP-CA", pageWidth / 2, 18, { align: "center" })

      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")
      doc.text("Union • Discipline • Travail", pageWidth / 2, 28, { align: "center" })

      // Titre
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("LISTE DES PRODUCTEURS", pageWidth / 2, 55, { align: "center" })

      // Informations d'export
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      const exportDate = new Date().toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      doc.text(`Date d'export : ${exportDate}`, pageWidth / 2, 65, { align: "center" })

      const centreNom = pdfCentreFilter
        ? getCentreNom(pdfCentreFilter)
        : "Tous les centres"
      doc.text(`Centre : ${centreNom}`, pageWidth / 2, 72, { align: "center" })

      // Tableau
      const tableData = producteursToExport.map((p) => [
        p.code || "-",
        p.nom || "-",
        p.telephone || "-",
        getCentreNom(p.centre_id),
      ])

      doc.autoTable({
        startY: 80,
        head: [["Code", "Nom", "Téléphone", "Centre"]],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [122, 31, 31],
          textColor: 255,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 60 },
          2: { cellWidth: 40 },
          3: { cellWidth: 50 },
        },
        didDrawPage: (data) => {
          // Pied de page sur chaque page
          doc.setFontSize(8)
          doc.setTextColor(128, 128, 128)
          const pageNum = doc.internal.getNumberOfPages()
          doc.text(
            `Page ${data.pageNumber} sur ${pageNum}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: "center" },
          )
        },
      })

      // Pied de page final
      const finalY = doc.lastAutoTable.finalY + 10
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text("Logiciel SCOOPS - Gestion Coopérative", pageWidth / 2, pageHeight - 20, {
        align: "center",
      })
      doc.text(`Généré le ${exportDate}`, pageWidth / 2, pageHeight - 15, { align: "center" })

      const fileName = `liste-producteurs-${pdfCentreFilter ? getCentreNom(pdfCentreFilter).replace(/\s+/g, "-") : "tous"}-${new Date().toISOString().split("T")[0]}.pdf`
      doc.save(fileName)

      setShowPdfModal(false)
      showToast(`PDF exporté avec succès (${producteursToExport.length} producteur${producteursToExport.length > 1 ? "s" : ""})`, "success")
    } catch (error) {
      console.error("Erreur export PDF:", error)
      showToast("Erreur lors de l'export PDF: " + (error.message || "Erreur inconnue"), "error")
    } finally {
      setGeneratingPdf(false)
    }
  }

  return (
    <div style={container}>
      <div
        style={{
        ...header,
        flexDirection: isMobile ? "column" : "row",
        }}
      >
        <div>
          <h1
            style={{
            ...title,
            fontSize: isMobile ? "24px" : "32px",
            }}
          >
            Gestion des Producteurs
          </h1>
          <p style={subtitle}>Gérez les producteurs de la coopérative</p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button
            onClick={openPdfModal}
            icon={<FaFilePdf />}
            variant="secondary"
            style={{
          width: isMobile ? "100%" : "auto",
            }}
          >
            {isMobile ? "PDF" : "Exporter PDF"}
        </Button>
        </div>
      </div>

      <Card>
        {/* Barre de filtres */}
        <div style={filtersBar}>
          <div style={filtersRow}>
            <div style={filterGroup}>
              <FaFilter style={{ color: "#6b7280", fontSize: 16 }} />
              <select
                value={selectedCentre}
                onChange={(e) => setSelectedCentre(e.target.value)}
                style={filterSelect}
              >
                <option value="">Tous les centres</option>
                {centres.map((centre) => (
                  <option key={centre.id} value={centre.id}>
                    {centre.nom}
                  </option>
                ))}
              </select>
            </div>

          <Input
            icon={<FaSearch />}
              placeholder="Rechercher par nom..."
            value={searchTerm}
            onChange={setSearchTerm}
            style={{ flex: 1, maxWidth: "400px" }}
          />

            {(selectedCentre || searchTerm) && (
              <Button onClick={resetFilters} variant="ghost" icon={<FaTimes />}>
                Réinitialiser
              </Button>
            )}
          </div>

          <div style={statsBadge}>
            {filteredProducteurs.length} producteur{filteredProducteurs.length > 1 ? "s" : ""}
          </div>
        </div>

        {loading ? (
          <div style={loadingState}>
            <div style={spinner}></div>
            <p>Chargement...</p>
          </div>
        ) : filteredProducteurs.length === 0 ? (
          <div style={emptyState}>
            <p style={emptyText}>
              {searchTerm || selectedCentre ? "Aucun producteur trouvé" : "Aucun producteur enregistré"}
            </p>
          </div>
        ) : isMobile ? (
          // Vue mobile en cartes
          <div style={cardsContainer}>
            {filteredProducteurs.map((producteur) => (
              <div
                key={producteur.id}
                style={producteurCard}
                onClick={() => handleViewDetail(producteur)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f9fafb"
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white"
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)"
                }}
              >
                <div style={cardHeader}>
                  {producteur.photo ? (
                    <img src={producteur.photo} alt={producteur.nom} style={cardPhoto} />
                  ) : (
                    <div style={cardPhotoPlaceholder}>
                      <FaUser style={{ fontSize: 24, color: "#9ca3af" }} />
                    </div>
                  )}
                  <div style={cardInfo}>
                    <strong style={cardName}>{producteur.nom || "-"}</strong>
                    <span style={codeBadge}>{producteur.code || "-"}</span>
                  </div>
                </div>
                <div style={cardDetails}>
                  <div style={cardDetailItem}>
                    <FaPhone style={{ color: "#6b7280", fontSize: 14 }} />
                    <span>{producteur.telephone || "-"}</span>
                  </div>
                  <div style={cardDetailItem}>
                    <span style={centreBadge}>{getCentreNom(producteur.centre_id)}</span>
                  </div>
                </div>
                <div style={cardActions} onClick={(e) => e.stopPropagation()}>
                  <button
                    style={{
                      ...actionBtn,
                      width: 44,
                      height: 44,
                      minWidth: 44,
                    }}
                    onClick={() => openForm(producteur)}
                    title="Modifier"
                  >
                    <FaEdit />
                  </button>
                  <button
                    style={{
                      ...actionBtn,
                      ...deleteBtn,
                      width: 44,
                      height: 44,
                      minWidth: 44,
                    }}
                    onClick={() => handleDelete(producteur)}
                    title="Supprimer"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Vue desktop en tableau
          <div style={tableContainer}>
            <table style={{ ...table, minWidth: isMobile ? "600px" : "800px" }}>
              <thead>
                <tr>
                  <th style={th}>Photo</th>
                  <th style={th}>Code</th>
                  <th style={th}>Nom</th>
                  <th style={th}>Téléphone</th>
                  <th style={th}>Centre</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducteurs.map((producteur) => (
                  <tr
                    key={producteur.id}
                    style={tableRow}
                    onClick={() => handleViewDetail(producteur)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f9fafb"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "white"
                    }}
                  >
                    <td style={td}>
                      {producteur.photo ? (
                        <img src={producteur.photo} alt={producteur.nom} style={photoCell} />
                      ) : (
                        <div style={photoPlaceholder}>
                          <FaUser style={{ fontSize: 20, color: "#9ca3af" }} />
                        </div>
                      )}
                    </td>
                    <td style={td}>
                      <span style={codeBadge}>{producteur.code || "-"}</span>
                    </td>
                    <td style={td}>
                      <strong style={nameText}>{producteur.nom || "-"}</strong>
                    </td>
                    <td style={td}>
                      <div style={phoneCell}>
                        <FaPhone style={{ color: "#6b7280", fontSize: 14 }} />
                        <span>{producteur.telephone || "-"}</span>
                      </div>
                    </td>
                    <td style={td}>
                      <span style={centreBadge}>{getCentreNom(producteur.centre_id)}</span>
                    </td>
                    <td style={td} onClick={(e) => e.stopPropagation()}>
                      <div
                        style={{
                        ...actionsCell,
                        gap: isMobile ? 12 : 8,
                        }}
                      >
                        <button
                          style={{
                            ...actionBtn,
                            width: isMobile ? 44 : 38,
                            height: isMobile ? 44 : 38,
                            minWidth: isMobile ? 44 : 38,
                          }}
                          onClick={() => openForm(producteur)}
                          title="Modifier"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#e5e7eb"
                            e.currentTarget.style.transform = "translateY(-1px)"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#f3f4f6"
                            e.currentTarget.style.transform = "translateY(0)"
                          }}
                        >
                          <FaEdit />
                        </button>
                        <button
                          style={{
                            ...actionBtn,
                            ...deleteBtn,
                            width: isMobile ? 44 : 38,
                            height: isMobile ? 44 : 38,
                            minWidth: isMobile ? 44 : 38,
                          }}
                          onClick={() => handleDelete(producteur)}
                          title="Supprimer"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)"
                            e.currentTarget.style.transform = "translateY(-1px)"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)"
                            e.currentTarget.style.transform = "translateY(0)"
                          }}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal formulaire */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editingProducteur ? "Modifier le producteur" : "Nouveau producteur"}
        size="lg"
      >
        <form onSubmit={handleSubmit} style={formContainer}>
          {/* Section Informations principales */}
          <div style={formSection}>
            <h3 style={formSectionTitle}>Informations principales</h3>
            <div style={formGrid}>
          <Input
            label="Code"
            value={generatedCode}
            readOnly
            disabled
                style={formField}
          />

          <Input
            label="Nom du producteur"
            value={formData.nom}
            onChange={(v) => setFormData({ ...formData, nom: v })}
            required
            placeholder="Ex: Kouassi Jean"
                style={formField}
          />

          <Input
            label="Téléphone"
            value={formData.telephone}
            onChange={(v) => setFormData({ ...formData, telephone: v })}
            required
            placeholder="Ex: 0700000000"
            icon={<FaPhone />}
                style={formField}
          />

              <div style={formField}>
                <label style={formLabel}>Centre associé</label>
            <select
              value={formData.centre_id}
              onChange={(e) => setFormData({ ...formData, centre_id: e.target.value })}
                  style={formSelect}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#7a1f1f"
                    e.target.style.boxShadow = "0 0 0 3px rgba(122, 31, 31, 0.1)"
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db"
                    e.target.style.boxShadow = "none"
                  }}
            >
              <option value="">Aucun centre</option>
              {centres.map((centre) => (
                <option key={centre.id} value={centre.id}>
                  {centre.nom}
                </option>
              ))}
            </select>
          </div>

              <div style={formField}>
                <label style={formLabel}>Sexe</label>
            <select
              value={formData.sexe}
              onChange={(e) => setFormData({ ...formData, sexe: e.target.value })}
                  style={formSelect}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#7a1f1f"
                    e.target.style.boxShadow = "0 0 0 3px rgba(122, 31, 31, 0.1)"
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db"
                    e.target.style.boxShadow = "none"
                  }}
            >
              <option value="">Non spécifié</option>
              <option value="Homme">Homme</option>
              <option value="Femme">Femme</option>
            </select>
          </div>

          <Input
            label="Localité"
            value={formData.localite}
            onChange={(v) => setFormData({ ...formData, localite: v })}
            placeholder="Ex: Divo, Côte d'Ivoire"
                style={formField}
          />

              <div style={formField}>
                <label style={formLabel}>Statut</label>
            <select
              value={formData.statut}
              onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                  style={formSelect}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#7a1f1f"
                    e.target.style.boxShadow = "0 0 0 3px rgba(122, 31, 31, 0.1)"
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db"
                    e.target.style.boxShadow = "none"
                  }}
            >
              <option value="">Non spécifié</option>
              <option value="Membre">Membre</option>
              <option value="Nouveau membre">Nouveau membre</option>
            </select>
              </div>
            </div>
          </div>

          {/* Section Photo */}
          <div style={formSection}>
            <h3 style={formSectionTitle}>Photo du producteur</h3>
            <ImageUpload
              label=""
              value={existingUrls.photo}
              onChange={(file) => setFiles({ ...files, photo: file })}
            />
          </div>

          {/* Section Documents */}
          <div style={{ ...formSection, marginBottom: 0, paddingBottom: 0, borderBottom: "none" }}>
            <h3 style={formSectionTitle}>Documents d'identité</h3>
            <div style={documentsGrid}>
              <div style={documentField}>
                <ImageUpload
                  label="Photo CNI Recto"
                  value={existingUrls.photo_cni_recto}
                  onChange={(file) => setFiles({ ...files, photo_cni_recto: file })}
                />
              </div>
              <div style={documentField}>
                <ImageUpload
                  label="Photo CNI Verso"
                  value={existingUrls.photo_cni_verso}
                  onChange={(file) => setFiles({ ...files, photo_cni_verso: file })}
                />
              </div>
              <div style={documentField}>
                <ImageUpload
                  label="Carte Planteur"
                  value={existingUrls.carte_planteur}
                  onChange={(file) => setFiles({ ...files, carte_planteur: file })}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={formActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={closeForm}
              disabled={uploading}
              style={formActionButton}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={uploading}
              style={formActionButton}
            >
              {uploading ? "Enregistrement..." : editingProducteur ? "Enregistrer les modifications" : "Créer le producteur"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal détail */}
      <ProducteurDetail
        producteur={selectedProducteur}
        centres={centres}
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false)
          setSelectedProducteur(null)
        }}
      />

      {/* Modal Export PDF */}
      <Modal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        title="Exporter la liste des producteurs"
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={formGroup}>
            <label style={label}>Sélectionner un centre</label>
            <select
              value={pdfCentreFilter}
              onChange={(e) => setPdfCentreFilter(e.target.value)}
              style={selectInput}
            >
              <option value="">Tous les centres</option>
              {centres.map((centre) => (
                <option key={centre.id} value={centre.id}>
                  {centre.nom}
                </option>
              ))}
            </select>
          </div>

          <div style={{ padding: "12px", background: "#f3f4f6", borderRadius: "8px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
              {pdfCentreFilter
                ? `${producteurs.filter((p) => String(p.centre_id) === String(pdfCentreFilter)).length} producteur(s) seront exportés`
                : `${producteurs.length} producteur(s) seront exportés`}
            </p>
          </div>

          <div
            style={{
            ...modalActions,
            flexDirection: isMobile ? "column" : "row",
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPdfModal(false)}
              disabled={generatingPdf}
              style={{
              width: isMobile ? "100%" : "auto",
              }}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={generatePDF}
              disabled={generatingPdf}
              icon={generatingPdf ? null : <FaFilePdf />}
              style={{
              width: isMobile ? "100%" : "auto",
              }}
            >
              {generatingPdf ? "Génération..." : "Générer le PDF"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Add Button */}
      <button
        onClick={() => openForm()}
        style={{
          ...floatingButton,
          bottom: isMobile ? 20 : 32,
          right: isMobile ? 20 : 32,
          width: isMobile ? 56 : 64,
          height: isMobile ? 56 : 64,
        }}
        title="Ajouter un producteur"
        onMouseEnter={(e) => {
          if (!isMobile) {
            e.currentTarget.style.transform = "scale(1.1)"
            e.currentTarget.style.boxShadow = "0 12px 32px rgba(122, 31, 31, 0.5)"
          }
        }}
        onMouseLeave={(e) => {
          if (!isMobile) {
            e.currentTarget.style.transform = "scale(1)"
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(122, 31, 31, 0.4)"
          }
        }}
      >
        <FaPlus style={{ fontSize: isMobile ? 20 : 24 }} />
      </button>
    </div>
  )
}

const container = {
  display: "flex",
  flexDirection: "column",
  gap: 32,
  paddingBottom: 120, // Espace pour le bouton flottant
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
  color: "#111827",
  letterSpacing: "-0.025em",
  lineHeight: 1.2,
}

const subtitle = {
  margin: "6px 0 0 0",
  fontSize: "14px",
  color: "#6b7280",
  fontWeight: 400,
}

const filtersBar = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  marginBottom: 28,
}

const filtersRow = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
}

const filterGroup = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "0 16px",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  background: "white",
  minHeight: "48px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  transition: "all 0.2s ease",
}

const filterSelect = {
  border: "none",
  outline: "none",
  fontSize: "14px",
  color: "#111827",
  background: "transparent",
  cursor: "pointer",
  padding: "10px 0",
  minWidth: "160px",
  fontWeight: 500,
  fontFamily: "inherit",
}

const statsBadge = {
  padding: "10px 18px",
  background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
  borderRadius: "10px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#374151",
  alignSelf: "flex-start",
  border: "1px solid #e5e7eb",
  letterSpacing: "0.01em",
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
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  background: "white",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
}

const table = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  minWidth: "900px",
}

const tableRow = {
  cursor: "pointer",
  transition: "all 0.15s ease",
  background: "white",
}

const th = {
  padding: "18px 20px",
  textAlign: "left",
  fontSize: "12px",
  fontWeight: 600,
  color: "#374151",
  background: "#f9fafb",
  borderBottom: "1px solid #e5e7eb",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
  zIndex: 10,
}

const td = {
  padding: "18px 20px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: "14px",
  color: "#111827",
  verticalAlign: "middle",
}

const photoCell = {
  width: "52px",
  height: "52px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "2px solid #e5e7eb",
  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
}

const photoPlaceholder = {
  width: "52px",
  height: "52px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "2px solid #e5e7eb",
}

const codeBadge = {
  padding: "6px 14px",
  background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
  color: "#991b1b",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.025em",
  display: "inline-block",
  border: "1px solid #fecaca",
}

const nameText = {
  color: "#111827",
  fontSize: "15px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
}

const phoneCell = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#4b5563",
  fontSize: "14px",
}

const centreBadge = {
  padding: "6px 14px",
  background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
  color: "#1e40af",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: 600,
  display: "inline-block",
  border: "1px solid #bfdbfe",
  letterSpacing: "0.025em",
}

const actionsCell = {
  display: "flex",
  gap: 8,
}

const actionBtn = {
  border: "none",
  background: "#f3f4f6",
  color: "#6b7280",
  width: 38,
  height: 38,
  borderRadius: "10px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
  fontSize: "14px",
}

const deleteBtn = {
  background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
  color: "#dc2626",
  border: "1px solid #fecaca",
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

// Styles pour le formulaire amélioré
const formContainer = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
}

const formSection = {
  marginBottom: 36,
  paddingBottom: 36,
  borderBottom: "1px solid #f3f4f6",
}

const formSectionTitle = {
  margin: "0 0 20px 0",
  fontSize: "16px",
  fontWeight: 700,
  color: "#111827",
  letterSpacing: "-0.01em",
}

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 24,
}

const formField = {
  marginBottom: 0,
}

const formLabel = {
  fontSize: "13px",
  color: "#374151",
  fontWeight: 600,
  marginBottom: "8px",
  display: "block",
  letterSpacing: "0.01em",
}

const formSelect = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  outline: "none",
  background: "white",
  color: "#111827",
  transition: "all 0.2s ease",
  cursor: "pointer",
  fontFamily: "inherit",
}

const documentsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 20,
}

const documentField = {
  width: "100%",
}

const formActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 32,
  paddingTop: 24,
  borderTop: "1px solid #e5e7eb",
}

const formActionButton = {
  minWidth: "140px",
}

const floatingButton = {
  position: "fixed",
  bottom: 24,
  right: 24,
  width: 64,
  height: 64,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #7a1f1f 0%, #b02a2a 100%)",
  color: "white",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 8px 24px rgba(122, 31, 31, 0.4)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  zIndex: 1000,
}

const formGroup = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginBottom: 20,
}

const label = {
  fontSize: "13px",
  color: "#374151",
  fontWeight: 600,
  marginBottom: "8px",
  display: "block",
  letterSpacing: "0.01em",
}

const selectInput = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  outline: "none",
  background: "white",
  color: "#111827",
  transition: "all 0.2s ease",
  cursor: "pointer",
  fontFamily: "inherit",
}

const documentsSection = {
  marginTop: 24,
  paddingTop: 24,
  borderTop: "1px solid #e5e7eb",
}

const sectionTitle = {
  margin: "0 0 16px 0",
  fontSize: "16px",
  fontWeight: 700,
  color: "#1f2937",
}

const cardsContainer = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
}

const producteurCard = {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: 16,
  background: "white",
  cursor: "pointer",
  transition: "all 0.2s ease",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
}

const cardHeader = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
}

const cardPhoto = {
  width: "60px",
  height: "60px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "2px solid #e5e7eb",
  flexShrink: 0,
}

const cardPhotoPlaceholder = {
  width: "60px",
  height: "60px",
  borderRadius: "50%",
  background: "#f3f4f6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "2px solid #e5e7eb",
  flexShrink: 0,
}

const cardInfo = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  flex: 1,
}

const cardName = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#1f2937",
}

const cardDetails = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginBottom: 12,
}

const cardDetailItem = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: "14px",
  color: "#6b7280",
}

const cardActions = {
  display: "flex",
  gap: 8,
  justifyContent: "flex-end",
  paddingTop: 12,
  borderTop: "1px solid #f3f4f6",
}
