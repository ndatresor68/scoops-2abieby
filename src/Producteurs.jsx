import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

export default function Producteurs() {
  console.log("Producteur charge")

  const [producteurs, setProducteurs] = useState([])
  const [centres, setCentres] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [cniRectoFile, setCniRectoFile] = useState(null)
  const [cniRectoPreview, setCniRectoPreview] = useState(null)
  const [cniVersoFile, setCniVersoFile] = useState(null)
  const [cniVersoPreview, setCniVersoPreview] = useState(null)
  const [cartePlanteurFile, setCartePlanteurFile] = useState(null)
  const [centreSelectionne, setCentreSelectionne] = useState("")
  const [cartePlanteurPreview, setCartePlanteurPreview] = useState(null)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [selectedCentrePrint, setSelectedCentrePrint] = useState("")
  const [centresList, setCentresList] = useState([])
  const [formData, setFormData] = useState({
    nom: "",
    telephone: "",
    code: "",
    sexe: "",
    localite: "",
    statut: "",
    centre_id: ""
  })

  useEffect(() => {
    fetchProducteurs()
    fetchCentres()
  }, [])

  useEffect(() => {
  fetchCentresList()
}, [])

async function fetchCentresList() {
  const { data } = await supabase
    .from("centres")
    .select("id, nom")

  if (data) setCentresList(data)
}

  async function fetchProducteurs() {
    const { data } = await supabase
      .from("producteurs")
      .select("*")
      .order("id", { ascending: false })

    if (data) setProducteurs(data)
  }

  async function fetchCentres() {
  const { data, error } = await supabase
    .from("centres")
    .select("*")
    .order("id", { ascending: true })

  if (error) {
    console.error(error)
    return
  }

  if (data) setCentres(data)
}
  /* ================= CODE AUTO ================= */
async function generateCode() {

  const { data, error } = await supabase
    .from("producteurs")
    .select("code")
    .not("code", "is", null)

  if (error) {
    console.error(error)
    return "ASAB-001"
  }

  if (!data || data.length === 0) {
    return "ASAB-001"
  }

  // Extraire tous les numéros
  const numbers = data
    .map(item => {
      if (!item.code) return null
      const parts = item.code.split("-")
      return parseInt(parts[1])
    })
    .filter(n => !isNaN(n))

  if (numbers.length === 0) {
    return "ASAB-001"
  }

  const maxNumber = Math.max(...numbers)

  return `ASAB-${maxNumber + 1}`
}


/* ================= UPLOAD PHOTO ================= */
async function uploadPhoto(file) {
  const fileName = `${Date.now()}-${file.name}`

  const { error } = await supabase.storage
    .from("producteurs")
    .upload(fileName, file)

  if (error) {
    console.error("Erreur upload:", error)
    return null
  }

  const { data } = supabase.storage
    .from("producteurs")
    .getPublicUrl(fileName)

  return data.publicUrl
}
  /* ================= SUBMIT ================= */
  async function handleSubmit(e) {
  e.preventDefault()
  console.log("Submit ok")
  console.log(photoFile)

  if (!formData.nom.trim() || !formData.telephone.trim()) {
    alert("Nom et téléphone obligatoires")
    return
  }

  let photoUrl = null
  let cniRectoUrl = null
  let cniVersoUrl = null
  let cartePlanteurUrl = null

if (cniRectoFile) {
  cniRectoUrl = await uploadPhoto(cniRectoFile)
}

if (cniVersoFile) {
  cniVersoUrl = await uploadPhoto(cniVersoFile)
}

if (cartePlanteurFile) {
  cartePlanteurUrl = await uploadPhoto(cartePlanteurFile)
}

  if (photoFile) {
    photoUrl = await uploadPhoto(photoFile)
  }

  const newCode = await generateCode()
 
  const { error } = await supabase
    .from("producteurs")
    .insert([{
      nom: formData.nom,
      telephone: formData.telephone,
      code: newCode,
      sexe: formData.sexe || null,
      localite: formData.localite || null,
      statut: formData.statut || null,
      centre_id: formData.centre_id || null,
      photo_profil: photoUrl, 
      cni_recto: cniRectoUrl,
      cni_verso: cniVersoUrl,
      carte_planteur: cartePlanteurUrl,
    }])

  if (error) {
    console.error("Erreur Supabase:", error)
    alert(error.message)
    return
  }

  // Reset
  setFormData({
    nom: "",
    telephone: "",
    sexe: "",
    localite: "",
    statut: "",
    centre_id: ""
  })

  setPhotoFile(null)
  setPhotoPreview(null)
  setShowForm(false)
  fetchProducteurs()
}
  /* ================= STYLES ================= */

  const pageStyle = {
    padding: "40px",
    background: "#f4f6f9",
    minHeight: "100vh"
  }

  const container = {
    width: "95%",
    maxWidth: "1200px",
    background: "white",
    padding: "20px",
    borderRadius: "20px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
    height: "80vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column"
  }

  const tdStyle = {
    padding: "14px",
    borderBottom: "1px solid #e5e7eb",
    textAlign: "center",
    fontSize: "14px",
    color: "#374151"
  }

  const buttonStyle = {
    background: "linear-gradient(90deg,#7a1f1f,#b02a2a)",
    color: "white",
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "20px"
  }

  const formContainer = {
    position: "fixed",
    top: "0",
    right: showForm ? "0" : "-400px",
    width: "380px",
    height: "100vh",
    background: "white",
    boxShadow: "-5px 0 20px rgba(0,0,0,0.2)",
    padding: "30px",
    transition: "0.4s ease",
    overflowY: "auto",
    zIndex: 1000
  }

  const inputGroup = {
    position: "relative",
    marginBottom: "18px"
  }

  const iconStyle = {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)"
  }

  const modernInput = {
    width: "100%",
    padding: "12px 12px 12px 40px",
    borderRadius: "10px",
    border: "1px solid #ddd"
  }
  const producteursFiltres = centreSelectionne 
  ? producteurs.filter(p => p.centre_id === centreSelectionne)
  : producteurs

  async function getBase64FromUrl(url) {

  const response = await fetch(url)
  const blob = await response.blob()

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(blob)
    reader.onloadend = () => {
      resolve(reader.result)
    }
  })
}

 async function generatePDF(data, centreNom) {

  const doc = new jsPDF()

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const date = new Date().toLocaleDateString()

  /* ================= LOGO ================= */

  let logoBase64 = null

  try {
    logoBase64 = await getBase64FromUrl(
      "https://dbfcmlonhgpobmaeutdf.supabase.co/storage/v1/object/public/logos/logo.jpeg"
    )
  } catch (err) {
    console.log("Logo non chargé")
  }

  if (logoBase64) {
    doc.addImage(logoBase64, "JPEG", 15, 10, 30, 20)
  }

  /* ================= TITRE ================= */

  doc.setFontSize(18)
  doc.setTextColor(122, 31, 31)
  doc.text("SCOOP ASAB-COOP-CA", pageWidth / 2, 20, { align: "center" })

  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text("Union • Discipline • Travail", pageWidth / 2, 27, { align: "center" })

  doc.text(`Date : ${date}`, pageWidth - 50, 38)

  /* ================= INFOS ================= */

  doc.setFontSize(13)
  doc.text("Liste des producteurs", 15, 45)
  doc.text(`Centre : ${centreNom}`, 15, 52)

  /* ================= TABLE ================= */

  const tableData = []

  for (const p of data) {

    let photoBase64 = null

    if (p.photo_profil) {
      try {
        photoBase64 = await getBase64FromUrl(p.photo_profil)
      } catch (err) {
        console.error("Erreur image:", err)
      }
    }

    tableData.push({
      photo: photoBase64,
      code: p.code,
      nom: p.nom,
      telephone: p.telephone,
      sexe: p.sexe,
      localite: p.localite,
      statut: p.statut
    })
  }

 autoTable(doc, {
  startY: 60,

  head: [["Photo", "Code", "Nom", "Téléphone", "Sexe", "Localité", "Statut"]],

  body: tableData.map(row => [
    "",
    row.code || "",
    row.nom || "",
    row.telephone || "",
    row.sexe || "",
    row.localite || "",
    row.statut || ""
  ]),

  // ✅ LARGEURS DES COLONNES
  columnStyles: {
    0: { cellWidth: 25 }, // PHOTO (plus large)
    1: { cellWidth: 25 },
    2: { cellWidth: 40 },
    3: { cellWidth: 30 },
    4: { cellWidth: 20 },
    5: { cellWidth: 25 },
    6: { cellWidth: 25 }
  },

  styles: {
    fontSize: 9,
    cellPadding: 5,
    minCellHeight: 22, // ✅ HAUTEUR SUFFISANTE
    valign: "middle",
    halign: "center",
    lineColor: [0, 0, 0],
    lineWidth: 0.2
  },

  headStyles: {
    fillColor: [230, 230, 230],
    textColor: 0,
    fontStyle: "bold"
  },

  alternateRowStyles: {
    fillColor: [245, 245, 245]
  },

  theme: "grid",

  // ✅ DESSIN DE L'IMAGE
  didDrawCell: function (dataCell) {

    if (
      dataCell.column.index === 0 &&
      tableData[dataCell.row.index] &&
      tableData[dataCell.row.index].photo
    ) {

      const imgSize = 16 // 👈 taille adaptée

      const x =
        dataCell.cell.x +
        (dataCell.cell.width - imgSize) / 2

      const y =
        dataCell.cell.y +
        (dataCell.cell.height - imgSize) / 2

      doc.addImage(
        tableData[dataCell.row.index].photo,
        "JPEG",
        x,
        y,
        imgSize,
        imgSize
      )
    }
  }
})
  /* ================= PIED ================= */

  doc.setFontSize(9)
  doc.setTextColor(80)

  doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15)

  doc.text(
    "Document généré automatiquement - SCOOP ASAB-COOP-CA",
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  )

  doc.text(
    "Contacts : 0758005921 / 0506458555 / 0748009763",
    pageWidth / 2,
    pageHeight - 5,
    { align: "center" }
  )

  doc.save(`Producteurs_${centreNom}`.pdf)
}
  /* ================= RETURN ================= */

  return (
    <div style={pageStyle}>

      <div style={container}>

        <h2 style={{
          fontSize: "22px",
          fontWeight: "bold",
          marginBottom: "20px"
        }}>
        </h2>

       <div style={{ overflowX: "auto", width: "100%" }}>
  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
    <thead>
      <tr style={{ background: "#e9ecef" }}>
        <th style={tdStyle}>Photo</th>
        <th style={tdStyle}>Code</th>
        <th style={tdStyle}>Nom</th>
        <th style={tdStyle}>Téléphone</th>
        <th style={tdStyle}>Sexe</th>
        <th style={tdStyle}>Localité</th>
        <th style={tdStyle}>Statut</th>
      </tr>
    </thead>

    <tbody>
      {producteurs.map((p) => (
        <tr key={p.id}>
          
          {/* PHOTO EN PREMIER */}
          <td style={tdStyle}>
            {p.photo_profil ? (
              <img
                src={p.photo_profil}
                alt="profil"
                width="50"
                height="50"
                style={{
                  borderRadius: "50%",
                  objectFit: "cover"
                }}
              />
            ) : (
              "-"
            )}
          </td>

          {/* CODE */}
          <td style={tdStyle}>{p.code}</td>

          <td style={tdStyle}>{p.nom}</td>
          <td style={tdStyle}>{p.telephone}</td>
          <td style={tdStyle}>{p.sexe}</td>
          <td style={tdStyle}>{p.localite}</td>
          <td style={tdStyle}>{p.statut}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

        <button
          onClick={async () => {
  const newCode = await generateCode()
  setFormData(prev => ({ ...prev, code: newCode }))
  setShowForm(true)
}}
          style={{
            position: "fixed",
            bottom: "30px",
            right: "30px",
            background: "#7a1f1f",
            color: "white",
            border: "none",
            borderRadius: "50px",
            padding: "15px 25px",
            fontSize: "16px",
            boxShadow: "0 5px 20px rgba(0,0,0,0.3)",
            cursor: "pointer"
          }}
        >
          ➕ Ajouter
        </button>

      </div>

  
<button
  title="Télécharger la liste"
  onClick={() => setShowPrintModal(true)}
  style={{
    position: "fixed",
    top: "90px",          // 👈 descendu vers le centre
    right: "25px",
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    border: "none",
    background: "#2563eb",
    color: "white",
    fontSize: "28px",     // 👈 icône plus grande
    cursor: "pointer",
    boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3000
  }}
>
  ⬇️
</button>
      {/* FORMULAIRE */}
      <div style={formContainer}>
        <h3 style={{ textAlign: "center", marginBottom: 20 }}>
          👤 Nouveau Producteur
        </h3>

        <form onSubmit={handleSubmit}>
{/* Photo */}
<input
  type="file"
  accept="image/*"
  id="photoProfil"
  style={{ display: "none" }}
  onChange={(e) => {
    const file = e.target.files[0]
    setPhotoFile(file)
    if (file) {
      setPhotoPreview(URL.createObjectURL(file))
    }
  }}
/>

<label htmlFor="photoProfil" style={{ cursor: "pointer" }}>
  <div
    style={{
      width: 120,
      height: 120,
      borderRadius: "50%",
      background: "#eee",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      margin: "0 auto 15px auto"
    }}
  >
    {photoPreview ? (
      <img
        src={photoPreview}
        alt="profil"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover"
        }}
      />
    ) : (
      <span style={{ fontSize: 40 }}>👤</span>
    )}
  </div>
</label>

 <div  style={{ marginBottom: 20 }}></div>
        
            <div style={inputGroup}>
            <span style={iconStyle}>👤</span>
            <input
              type="text"
              placeholder="Nom complet"
              value={formData.nom}
              onChange={(e) =>
                setFormData({ ...formData, nom: e.target.value })
              }
              style={modernInput}
            />
          </div>

          <div style={inputGroup}>
            <span style={iconStyle}>📞</span>
            <input
              type="text"
              placeholder="Téléphone"
              value={formData.telephone}
              onChange={(e) =>
                setFormData({ ...formData, telephone: e.target.value })
              }
              style={modernInput}
            />
          </div>

          {/* Sexe */}
<div style={inputGroup}>
  <span style={iconStyle}>⚧</span>
  <select
    value={formData.sexe}
    onChange={(e) =>
      setFormData({ ...formData, sexe: e.target.value })
    }
    style={modernInput}
  >
    <option value="">Sexe</option>
    <option value="Homme">Homme</option>
    <option value="Femme">Femme</option>
  </select>
</div>

{/* Localité */}
<div style={inputGroup}>
  <span style={iconStyle}>📍</span>
  <input
    type="text"
    placeholder="Localité"
    value={formData.localite}
    onChange={(e) =>
      setFormData({ ...formData, localite: e.target.value })
    }
    style={modernInput}
  />
</div>

{/* Statut */}
<div style={inputGroup}>
  <span style={iconStyle}>🏷</span>
  <select
    value={formData.statut}
    onChange={(e) =>
      setFormData({ ...formData, statut: e.target.value })
    }
    style={modernInput}
  >
    <option value="">Statut</option>
    <option value="Membre">Membre</option>
    <option value="Nouveau membre">Nouveau membre</option>
  </select>
</div>

<div style={inputGroup}>
  <span style={iconStyle}>🏷</span>
  <input
    type="text"
    value={formData.code}
    readOnly
    style={{
      ...modernInput,
      background: "#f1f1f1",
      fontWeight: "bold"
    }}
  />
</div>

<div style={inputGroup}>
  <span style={iconStyle}>🏢</span>
  <select
    value={formData.centre_id}
    onChange={(e) =>
      setFormData({ ...formData, centre_id: e.target.value })
    }
    style={modernInput}
  >
    <option value="">Choisir un centre</option>
    {centres.map((centre) => (
      <option key={centre.id} value={centre.id}>
        {centre.nom}
      </option>
    ))}
  </select>
</div>


{/* ================= DOCUMENTS ================= */}

{/* CNI RECTO */}
<input
  type="file"
  accept="image/*"
  id="cniRecto"
  style={{ display: "none" }}
  onChange={(e) => {
  const file = e.target.files[0]
  setCniRectoFile(file)

  if (file) {
    setCniRectoPreview(URL.createObjectURL(file))
  }
}}
/>

<label
  htmlFor="cniRecto"
  style={{
    background: "#7a1f1f",
    color: "white",
    padding: "8px 15px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "inline-block",
    marginBottom: 10
  }}
>
  CNI Recto

  {cniRectoPreview && (
  <img
    src={cniRectoPreview}
    alt="CNI Recto"
    style={{
      width: 120,
      height: 80,
      objectFit: "cover",
      borderRadius: 8,
      marginBottom: 15,
      display: "block"
    }}
  />
)}
</label>

<br />

{/* CNI VERSO */}
<input
  type="file"
  accept="image/*"
  id="cniVerso"
  style={{ display: "none" }}
  onChange={(e) => {
  const file = e.target.files[0]
  setCniVersoFile(file)

  if (file) {
    setCniVersoPreview(URL.createObjectURL(file))
  }
}}
/>

<label
  htmlFor="cniVerso"
  style={{
    background: "#7a1f1f",
    color: "white",
    padding: "8px 15px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "inline-block",
    marginBottom: 10
  }}
>
  CNI Verso

  {cniVersoPreview && (
  <img
    src={cniVersoPreview}
    alt="CNI Verso"
    style={{
      width: 120,
      height: 80,
      objectFit: "cover",
      borderRadius: 8,
      marginBottom: 15,
      display: "block"
    }}
  />
)}
</label>

<br />

{/* CARTE PLANTEUR */}
<input
  type="file"
  accept="image/*"
  id="cartePlanteur"
  style={{ display: "none" }}
  onChange={(e) => {
  const file = e.target.files[0]
  setCartePlanteurFile(file)

  if (file) {
    setCartePlanteurPreview(URL.createObjectURL(file))
  }
}}
/>

<label
  htmlFor="cartePlanteur"
  style={{
    background: "#7a1f1f",
    color: "white",
    padding: "8px 15px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "inline-block",
    marginBottom: 20
  }}
>
  Carte Planteur

  {cartePlanteurPreview && (
  <img
    src={cartePlanteurPreview}
    alt="Carte Planteur"
    style={{
      width: 120,
      height: 80,
      objectFit: "cover",
      borderRadius: 8,
      marginBottom: 20,
      display: "block"
    }}
  />
)}
</label>

<br />

          <button type="submit" style={buttonStyle}>
          Enregistrer
          </button>

          <button
            type="button"
            onClick={() => setShowForm(false)}
            style={{ ...buttonStyle, background: "#999" }}
          >
            Annuler
          </button>
</form>
        </div>

        {/* MODAL IMPRESSION */}
        {showPrintModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000
          }}
          onClick={() => setShowPrintModal(false)}
          >

            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "white",
                padding: 30,
                borderRadius: 12,
                width: 400
              }}
            >
              <h3 style={{ marginBottom: 20 }}>
                Sélectionner un centre
              </h3>

              <select
                value={selectedCentrePrint}
                onChange={(e) => setSelectedCentrePrint(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  marginBottom: 20,
                  borderRadius: 6
                }}
              >
                <option value="">Choisir un centre</option>
                {centresList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>

              <button
                onClick={async () => {
                  console.log("Bouton clique")

                  if (!selectedCentrePrint) {
                    alert("Choisir un centre")
                    return
                  }

                  const centreChoisi = centresList.find(
                    c => c.id === selectedCentrePrint
                  )

                  const centreNom = centreChoisi?.nom || "Centre"

                  const producteursCentre = producteurs.filter(
                    p => p.centre_id === selectedCentrePrint
                  )

                  if (producteursCentre.length === 0) {
                    alert("Aucun producteur pour ce centre")
                    return
                  }

                  await generatePDF(producteursCentre, centreNom)

                  setShowPrintModal(false)
                }}
                style={{
                  width: "100%",
                  padding: 12,
                  background: "#7a1f1f",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer"
                }}
              >
                Imprimer maintenant
              </button>

            </div>
          </div>
        )}

    </div>
  )
}