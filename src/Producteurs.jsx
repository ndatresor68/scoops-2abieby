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
import { exportProducteursPDF } from "./utils/exportToPDF"
import { useAuth } from "./context/AuthContext"
import {
  logProducerCreated,
  logProducerUpdated,
  logProducerDeleted,
  logPDFExported,
} from "./utils/activityLogger"

export default function Producteurs() {
  const { showToast } = useToast()
  const { user } = useAuth()
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
        .order("nom", { ascending: true })
        .order("code", { ascending: true })
      
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

  /**
   * Upload a file to Supabase Storage
   * @param {File} file - The file to upload
   * @param {string} folder - Folder name (photos or documents)
   * @param {string} producteurId - The producteur UUID
   * @returns {Promise<string>} Public URL of the uploaded file
   */
  /**
   * STEP 1 & 2: Upload file to Supabase Storage and get public URL
   * @param {File} file - The file to upload
   * @param {string} folder - Folder name (photos or documents)
   * @param {string} producteurId - The producteur UUID
   * @returns {Promise<string>} Public URL of the uploaded file
   */
  async function uploadFile(file, folder, producteurId) {
    if (!file) {
      console.warn("[uploadFile] No file provided")
      return null
    }

    try {
      console.log("[uploadFile] ===== STEP 1: VERIFY FILE UPLOAD =====")
      console.log("[uploadFile] File:", {
        name: file.name,
        type: file.type,
        size: file.size,
      })

      // Validate file type
      if (!file.type.startsWith("image/")) {
        throw new Error("Le fichier doit être une image")
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("L'image ne doit pas dépasser 5MB")
      }

      // Generate unique filename
      const extension = file.name.split(".").pop() || "jpg"
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 9)
      const fileName = `${timestamp}-${randomId}.${extension}`
      
      // STEP 2: Construct path - Use proper structure: photos/${producteurId}/${fileName}
      const path = `${folder}/${producteurId}/${fileName}`
      console.log("[uploadFile] ===== STEP 2: VERIFY GENERATED PATH =====")
      console.log("[uploadFile] Upload path:", path)
      console.log("[uploadFile] Folder:", folder)
      console.log("[uploadFile] Producteur ID:", producteurId)
      console.log("[uploadFile] File name:", fileName)

      // Upload file to Supabase Storage
      console.log("[uploadFile] Uploading file to Supabase Storage...")
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("producteurs")
        .upload(path, file, {
          upsert: false, // Don't overwrite existing files
          contentType: file.type,
        })

      console.log("[uploadFile] Upload result:", {
        data: uploadData,
        error: uploadError,
      })

      if (uploadError) {
        console.error("[uploadFile] Upload error:", uploadError)
        
        // Check for bucket errors
        if (uploadError.message.includes("Bucket") || uploadError.message.includes("bucket") || uploadError.message.includes("not found")) {
          throw new Error(
            "Le bucket 'producteurs' n'existe pas dans Supabase Storage. Veuillez le créer dans votre dashboard Supabase et configurer les politiques RLS.",
          )
        }
        
        // Check for permission errors
        if (uploadError.message.includes("permission") || uploadError.message.includes("policy")) {
          throw new Error(
            "Vous n'avez pas la permission d'uploader des fichiers. Vérifiez les politiques RLS du bucket 'producteurs'.",
          )
        }
        
        throw new Error(`Erreur lors de l'upload: ${uploadError.message}`)
      }

      if (!uploadData) {
        throw new Error("Aucune donnée retournée après l'upload")
      }

      console.log("[uploadFile] File uploaded successfully to Storage")
      console.log("[uploadFile] Upload data:", uploadData)

      // STEP 3: Generate public URL using the SAME path
      console.log("[uploadFile] ===== STEP 3: GENERATE PUBLIC URL =====")
      
      // Use the path from uploadData if available, otherwise use the constructed path
      const urlPath = uploadData?.path || path
      console.log("[uploadFile] Original path:", path)
      console.log("[uploadFile] Upload data path:", uploadData?.path)
      console.log("[uploadFile] Using path for public URL:", urlPath)
      
      const { data: publicUrlData } = supabase.storage
        .from("producteurs")
        .getPublicUrl(urlPath)

      console.log("[uploadFile] Public URL data:", publicUrlData)
      console.log("[uploadFile] Public URL response:", JSON.stringify(publicUrlData, null, 2))

      if (!publicUrlData?.publicUrl) {
        console.error("[uploadFile] Failed to get public URL!")
        console.error("[uploadFile] Public URL data:", publicUrlData)
        throw new Error("Impossible de récupérer l'URL publique de l'image")
      }

      console.log("[uploadFile] ===== STEP 3 COMPLETE =====")
      console.log("[uploadFile] Generated public URL:", publicUrlData.publicUrl)
      console.log("[uploadFile] Upload success - file uploaded and URL generated")
      
      // Return the public URL to be saved in the database column "photo" (or "photo_cni_recto", etc.)
      return publicUrlData.publicUrl
    } catch (error) {
      console.error("[uploadFile] Error:", error)
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

    // Validation
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
      // Convert centre_id to UUID if needed
      let centreIdValue = null
      if (formData.centre_id && formData.centre_id.trim() !== "") {
        centreIdValue = formData.centre_id
      }

      if (editingProducteur) {
        // ===== UPDATE EXISTING PRODUCTEUR =====
        console.log("[handleSubmit] Updating producteur:", editingProducteur.id)

        const producteurId = editingProducteur.id
        const uploadPromises = []
        const urlMap = {}

        // Upload only new files (if any)
        if (files.photo) {
          console.log("[handleSubmit] Uploading new photo")
          uploadPromises.push(
            uploadFile(files.photo, "photos", producteurId)
              .then((url) => {
                urlMap.photo = url
              })
              .catch((error) => {
                console.error("[handleSubmit] Photo upload failed:", error)
                throw new Error(`Erreur upload photo: ${error.message}`)
              }),
          )
        }
        if (files.photo_cni_recto) {
          uploadPromises.push(
            uploadFile(files.photo_cni_recto, "documents", producteurId)
              .then((url) => {
                urlMap.photo_cni_recto = url
              })
              .catch((error) => {
                console.error("[handleSubmit] CNI recto upload failed:", error)
                throw new Error(`Erreur upload CNI recto: ${error.message}`)
              }),
          )
        }
        if (files.photo_cni_verso) {
          uploadPromises.push(
            uploadFile(files.photo_cni_verso, "documents", producteurId)
              .then((url) => {
                urlMap.photo_cni_verso = url
              })
              .catch((error) => {
                console.error("[handleSubmit] CNI verso upload failed:", error)
                throw new Error(`Erreur upload CNI verso: ${error.message}`)
              }),
          )
        }
        if (files.carte_planteur) {
          uploadPromises.push(
            uploadFile(files.carte_planteur, "documents", producteurId)
              .then((url) => {
                urlMap.carte_planteur = url
              })
              .catch((error) => {
                console.error("[handleSubmit] Carte planteur upload failed:", error)
                throw new Error(`Erreur upload carte planteur: ${error.message}`)
              }),
          )
        }

        // Wait for all uploads to complete
        if (uploadPromises.length > 0) {
          await Promise.all(uploadPromises)
        }

        // STEP 4: STORE URL IN DATABASE
        // Prepare payload: use new URLs if uploaded, otherwise keep existing
        // IMPORTANT: Database columns are "photo", "photo_cni_recto", "photo_cni_verso" (NOT "photo_url")
        console.log("[handleSubmit] ===== STEP 4: STORE URL IN DATABASE (UPDATE) =====")
        console.log("[handleSubmit] URL map from uploads:", urlMap)
        console.log("[handleSubmit] Existing URLs:", existingUrls)
        
      const payload = {
          code: editingProducteur.code, // Code should not change
          nom: formData.nom.trim(),
          telephone: formData.telephone.trim(),
        sexe: formData.sexe || null,
          localite: formData.localite?.trim() || null,
        statut: formData.statut || null,
          centre_id: centreIdValue,
          // Save photo URL in "photo" column (NOT "photo_url")
          photo: urlMap.photo || existingUrls.photo || null,
          // Save ID card images in their respective columns
          photo_cni_recto: urlMap.photo_cni_recto || existingUrls.photo_cni_recto || null,
          photo_cni_verso: urlMap.photo_cni_verso || existingUrls.photo_cni_verso || null,
          carte_planteur: urlMap.carte_planteur || existingUrls.carte_planteur || null,
        }

        console.log("[handleSubmit] Update payload:", payload)
        console.log("[handleSubmit] Photo URL to save:", payload.photo)
        console.log("[handleSubmit] Updating producteur ID:", producteurId)

        // Update producteur in database
        const { data, error } = await supabase
          .from("producteurs")
          .update(payload)
          .eq("id", producteurId)
          .select()

        console.log("[handleSubmit] Update result:", {
          data: data,
          error: error,
        })

        if (error) {
          console.error("[handleSubmit] Update error:", error)
          console.error("[handleSubmit] Error details:", JSON.stringify(error, null, 2))
          throw new Error(`Erreur lors de la mise à jour: ${error.message}`)
        }

        if (!data || data.length === 0) {
          throw new Error("Aucun producteur mis à jour. Vérifiez que l'ID existe.")
        }

        console.log("[handleSubmit] Producteur updated successfully:", data[0])
        console.log("[handleSubmit] Verified photo in database:", data[0].photo)
        console.log("[handleSubmit] Verified photo_cni_recto:", data[0].photo_cni_recto)
        console.log("[handleSubmit] Verified photo_cni_verso:", data[0].photo_cni_verso)
        
        // Log activity
        await logProducerUpdated(
          producteurId,
          formData.nom.trim(),
          `Updated: nom, telephone, centre_id, statut`,
          user?.id || null,
          user?.email || null,
        )
        
        showToast("Producteur modifié avec succès", "success")
      } else {
        // ===== CREATE NEW PRODUCTEUR =====
        console.log("[handleSubmit] Creating new producteur")

        // Step 1: Insert producteur first to get the real UUID
        const initialPayload = {
          code: generatedCode,
          nom: formData.nom.trim(),
          telephone: formData.telephone.trim(),
          sexe: formData.sexe || null,
          localite: formData.localite?.trim() || null,
          statut: formData.statut || null,
          centre_id: centreIdValue,
          // Don't include photo URLs yet - will update after upload
        }

        console.log("[handleSubmit] Inserting producteur:", initialPayload)

        const { data: insertedData, error: insertError } = await supabase
          .from("producteurs")
          .insert([initialPayload])
          .select()

        if (insertError) {
          console.error("[handleSubmit] Insert error:", insertError)
          throw new Error(`Erreur lors de la création: ${insertError.message}`)
        }

        if (!insertedData || insertedData.length === 0) {
          throw new Error("Impossible de créer le producteur. Aucune donnée retournée.")
        }

        const newProducteurId = insertedData[0].id
        console.log("[handleSubmit] Producteur created with ID:", newProducteurId)

        // Step 2: Upload files using the real producteur ID
        const uploadPromises = []
        const urlMap = {}

        if (files.photo) {
          console.log("[handleSubmit] Uploading photo for new producteur")
          uploadPromises.push(
            uploadFile(files.photo, "photos", newProducteurId)
              .then((url) => {
                urlMap.photo = url
              })
              .catch((error) => {
                console.error("[handleSubmit] Photo upload failed:", error)
                throw new Error(`Erreur upload photo: ${error.message}`)
              }),
          )
        }
        if (files.photo_cni_recto) {
          uploadPromises.push(
            uploadFile(files.photo_cni_recto, "documents", newProducteurId)
              .then((url) => {
                urlMap.photo_cni_recto = url
              })
              .catch((error) => {
                console.error("[handleSubmit] CNI recto upload failed:", error)
                throw new Error(`Erreur upload CNI recto: ${error.message}`)
              }),
          )
        }
        if (files.photo_cni_verso) {
          uploadPromises.push(
            uploadFile(files.photo_cni_verso, "documents", newProducteurId)
              .then((url) => {
                urlMap.photo_cni_verso = url
              })
              .catch((error) => {
                console.error("[handleSubmit] CNI verso upload failed:", error)
                throw new Error(`Erreur upload CNI verso: ${error.message}`)
              }),
          )
        }
        if (files.carte_planteur) {
          uploadPromises.push(
            uploadFile(files.carte_planteur, "documents", newProducteurId)
              .then((url) => {
                urlMap.carte_planteur = url
              })
              .catch((error) => {
                console.error("[handleSubmit] Carte planteur upload failed:", error)
                throw new Error(`Erreur upload carte planteur: ${error.message}`)
              }),
          )
        }

        // Wait for all uploads to complete
        if (uploadPromises.length > 0) {
          await Promise.all(uploadPromises)
        }

        // Step 3: Update producteur with photo URLs
        // STEP 4: STORE URL IN DATABASE
        // IMPORTANT: Save URLs in correct database columns: "photo", "photo_cni_recto", "photo_cni_verso"
        console.log("[handleSubmit] ===== STEP 4: STORE URL IN DATABASE =====")
        console.log("[handleSubmit] URL map:", urlMap)
        console.log("[handleSubmit] Number of URLs to save:", Object.keys(urlMap).length)
        console.log("[handleSubmit] Producer ID to update:", newProducteurId)
        console.log("[handleSubmit] Producer ID type:", typeof newProducteurId)
        
        // Verify producer ID is valid
        if (!newProducteurId) {
          throw new Error("ID du producteur invalide. Impossible de sauvegarder les URLs d'images.")
        }

        if (Object.keys(urlMap).length > 0) {
          const updatePayload = {
            // Save producer photo URL in "photo" column (NOT "photo_url")
            photo: urlMap.photo || null,
            // Save ID card images in their respective columns
            photo_cni_recto: urlMap.photo_cni_recto || null,
            photo_cni_verso: urlMap.photo_cni_verso || null,
            carte_planteur: urlMap.carte_planteur || null,
          }

          console.log("[handleSubmit] Update payload:", updatePayload)
          console.log("[handleSubmit] Updating producteur with ID:", newProducteurId)
          console.log("[handleSubmit] Photo URL to save:", updatePayload.photo)
          console.log("[handleSubmit] CNI recto URL:", updatePayload.photo_cni_recto)
          console.log("[handleSubmit] CNI verso URL:", updatePayload.photo_cni_verso)

          // First, verify the producer exists
          const { data: verifyData, error: verifyError } = await supabase
            .from("producteurs")
            .select("id, nom")
            .eq("id", newProducteurId)
            .single()

          console.log("[handleSubmit] Verification query result:", {
            data: verifyData,
            error: verifyError,
          })

          if (verifyError || !verifyData) {
            console.error("[handleSubmit] Producer not found after creation!")
            console.error("[handleSubmit] Verify error:", verifyError)
            throw new Error(`Le producteur avec l'ID ${newProducteurId} n'a pas été trouvé. Impossible de sauvegarder les URLs.`)
          }

          console.log("[handleSubmit] Producer verified, proceeding with update...")

          // Now update with photo URLs
          const { data: updateData, error: updateError } = await supabase
            .from("producteurs")
            .update(updatePayload)
            .eq("id", newProducteurId)
            .select() // Add select to verify the update worked

          console.log("[handleSubmit] Update result:", {
            data: updateData,
            error: updateError,
            dataLength: updateData?.length,
          })

          if (updateError) {
            console.error("[handleSubmit] Update photo URLs error:", updateError)
            console.error("[handleSubmit] Error code:", updateError.code)
            console.error("[handleSubmit] Error message:", updateError.message)
            console.error("[handleSubmit] Error details:", JSON.stringify(updateError, null, 2))
            // Throw error to prevent silent failure
            throw new Error(`Erreur lors de la sauvegarde des URLs d'images: ${updateError.message || updateError.code || "Erreur inconnue"}`)
          }

          if (!updateData || updateData.length === 0) {
            console.error("[handleSubmit] Update returned no data!")
            console.error("[handleSubmit] This might indicate:")
            console.error("  1. RLS policy blocking the update")
            console.error("  2. Producer ID mismatch")
            console.error("  3. Database connection issue")
            
            // Try to fetch the producer again to see if it exists
            const { data: checkData } = await supabase
              .from("producteurs")
              .select("id, nom, photo")
              .eq("id", newProducteurId)
              .single()
            
            console.error("[handleSubmit] Re-check producer:", checkData)
            
            throw new Error(`La mise à jour des URLs d'images a échoué. Aucune donnée retournée. Producteur ID: ${newProducteurId}`)
          }

          console.log("[handleSubmit] Photo URLs saved successfully!")
          console.log("[handleSubmit] Updated producer data:", updateData[0])
          console.log("[handleSubmit] Saved photo:", updateData[0].photo)
          console.log("[handleSubmit] Saved photo_cni_recto:", updateData[0].photo_cni_recto)
          console.log("[handleSubmit] Saved photo_cni_verso:", updateData[0].photo_cni_verso)
        } else {
          console.log("[handleSubmit] No files to upload, skipping URL update")
        }

        console.log("[handleSubmit] Producteur created successfully")
        
        // Log activity
        await logProducerCreated(
          newProducteurId,
          formData.nom.trim(),
          generatedCode,
          user?.id || null,
          user?.email || null,
        )
        
        showToast("Producteur ajouté avec succès", "success")
      }

      // Close form and refresh list
      closeForm()
      setTimeout(() => {
      fetchProducteurs()
      }, 500)
    } catch (error) {
      console.error("[handleSubmit] Error:", error)
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
      
      // Log activity
      await logProducerDeleted(
        producteur.id,
        producteur.nom || "Unknown",
        user?.id || null,
        user?.email || null,
      )
      
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

  const filteredProducteurs = producteurs
    .filter((producteur) => {
      const matchesSearch =
      producteur.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producteur.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producteur.telephone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCentreNom(producteur.centre_id)?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCentre = !selectedCentre || String(producteur.centre_id) === String(selectedCentre)

      return matchesSearch && matchesCentre
    })
    .sort((a, b) => {
      // Primary sort: by name (alphabetical)
      const nameA = (a.nom || "").toLowerCase()
      const nameB = (b.nom || "").toLowerCase()
      if (nameA !== nameB) {
        return nameA.localeCompare(nameB, "fr", { sensitivity: "base" })
      }
      // Secondary sort: by code (alphabetical/numerical)
      const codeA = (a.code || "").toLowerCase()
      const codeB = (b.code || "").toLowerCase()
      return codeA.localeCompare(codeB, "fr", { numeric: true, sensitivity: "base" })
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
      const result = await exportProducteursPDF(
        producteurs,
        centres,
        pdfCentreFilter || null
      )

      // Log activity
      await logPDFExported(
        "Producteurs",
        `${result.count} producteur${result.count > 1 ? "s" : ""} exported${pdfCentreFilter ? ` (filtered by centre)` : ""}`,
        user?.id || null,
        user?.email || null,
      )

      setShowPdfModal(false)
      showToast(
        `PDF exporté avec succès (${result.count} producteur${result.count > 1 ? "s" : ""})`,
        "success"
      )
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
