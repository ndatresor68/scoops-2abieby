import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"

export default function Centres() {

  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [generatedCode, setGeneratedCode] = useState("")

  const [formData, setFormData] = useState({
    nom: "",
    localite: "",
    type: "MAGASIN",
    telephone: ""
  })

  useEffect(() => {
    fetchCentres()
  }, [])

  async function fetchCentres() {
    setLoading(true)

    const { data: centresData, error } = await supabase
      .from("centres")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    const centresAvecNombre = await Promise.all(
      centresData.map(async (centre) => {

        const { count } = await supabase
          .from("producteurs")
          .select("*", { count: "exact", head: true })
          .eq("centre_id", centre.id)

        return {
          ...centre,
          totalProducteurs: count || 0
        }
      })
    )

    setCentres(centresAvecNombre)
    setLoading(false)
  }

  // 🔢 Générer le code quand on ouvre le formulaire
  async function generateCode() {
    const { count } = await supabase
      .from("centres")
      .select("*", { count: "exact", head: true })
      .eq("type", "MAGASIN")

    const numero = (count || 0) + 1
    `setGeneratedCode(ASAB-M${numero})`
  }

  function openForm() {
    setShowForm(true)
    generateCode()
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.nom.trim()) {
      alert("Nom obligatoire")
      return
    }

    if (!formData.telephone.trim()) {
      alert("Téléphone obligatoire")
      return
    }

    const { error } = await supabase
      .from("centres")
      .insert([{
        code: generatedCode,
        nom: formData.nom,
        localisation: formData.localite || null,
        type: "MAGASIN",
        telephone: "+225" + formData.telephone
      }])

    if (error) {
      console.error(error)
      alert("Erreur lors de l'ajout")
      return
    }

    setFormData({
      nom: "",
      localite: "",
      type: "MAGASIN",
      telephone: ""
    })

    setShowForm(false)
    fetchCentres()
  }

  return (
    <div style={{ padding: 30 }}>

      {loading ? (
        <p>Chargement...</p>
      ) : centres.length === 0 ? (
        <p>Aucun centre enregistré</p>
      ) : (
        <div style={{ display: "grid", gap: 15 }}>
          {centres.map((centre) => (
            <div
              key={centre.id}
              style={{
                background: "white",
                padding: 20,
                borderRadius: 12,
                boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>
                  {centre.nom} ({centre.code})
                </h3>
                <p style={{ margin: 0, color: "#777" }}>
                  {centre.localisation || "Non défini"}
                </p>
                <p style={{ margin: 0, color: "#555" }}>
                 {centre.telephone || "Non défini"}
                </p>
              </div>

              <div style={{
                background: "#7a1f1f",
                color: "white",
                padding: "8px 14px",
                borderRadius: 20,
                fontWeight: "bold"
              }}>
                {centre.totalProducteurs} Producteurs
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🔴 Bouton flottant */}
      <button
        onClick={openForm}
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

      {/* Overlay */}
      {showForm && (
        <div
          onClick={() => setShowForm(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.4)",
            zIndex: 999
          }}
        />
      )}

      {/* Slide Form */}
      <div style={{
        position: "fixed",
        top: 0,
        right: showForm ? 0 : "-400px",
        width: 380,
        height: "100vh",
        background: "white",
        boxShadow: "-5px 0 20px rgba(0,0,0,0.2)",
        padding: 30,
        transition: "0.4s ease",
        overflowY: "auto",
        zIndex: 1000
      }}>

        {/* ❌ Close */}
        <div
          onClick={() => setShowForm(false)}
          style={{
            position: "absolute",
            top: 15,
            right: 20,
            fontSize: 22,
            cursor: "pointer"
          }}
        >
          ✖
        </div>

        <h3 style={{ marginBottom: 20 }}>NOUVEAU CENTRE</h3>

        <form onSubmit={handleSubmit}>

          {/* Code affiché */}
          <input
            type="text"
            placeholder="Code du centre"
            value={generatedCode}
            readOnly
            style={{
              width: "100%",
              padding: 12,
              marginBottom: 15,
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#f5f5f5"
            }}
          />

          <input
            type="text"
            placeholder="Nom du centre"
            value={formData.nom}
            onChange={(e) =>
              setFormData({ ...formData, nom: e.target.value })
            }
            style={{
              width: "100%",
              padding: 12,
              marginBottom: 15,
              borderRadius: 8,
              border: "1px solid #ddd"
            }}
          />

          <input
            type="text"
            placeholder="Localité"
            value={formData.localite}
            onChange={(e) =>
              setFormData({ ...formData, localite: e.target.value })
            }
            style={{
              width: "100%",
              padding: 12,
              marginBottom: 15,
              borderRadius: 8,
              border: "1px solid #ddd"
            }}
          />

          {/* Téléphone avec +225 fixe */}
          <div style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 20,
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "10px 12px",
            background: "#f9f9f9"
          }}>
            +225
            <input
              type="text"
              placeholder="0700000000"
              value={formData.telephone}
              onChange={(e) =>
                setFormData({ ...formData, telephone: e.target.value })
              }
              style={{
                border: "none",
                outline: "none",
                marginLeft: 10,
                background: "transparent",
                width: "100%"
              }}
            />
          </div>

          <button
            type="submit"
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
            Enregistrer
          </button>

        </form>
      </div>

    </div>
  )
}