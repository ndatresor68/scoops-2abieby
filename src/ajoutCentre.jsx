import { useState } from "react"
import { supabase } from "./supabaseClient"

export default function AjoutCentre() {

  const [nom, setNom] = useState("")
  const [localisation, setLocalisation] = useState("")
  const [type, setType] = useState("")
  const [message, setMessage] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()

    if (!nom || !type || !localisation) {
      setMessage("Tous les champs sont obligatoires")
      return
    }

    const { error } = await supabase
      .from("centres")
      .insert([
        {
          nom,
          localisation,
          type
        }
      ])

    if (error) {
      console.log(error)
      setMessage("Erreur lors de l'ajout")
    } else {
      setMessage("Centre ajouté avec succès")
      setNom("")
      setLocalisation("")
      setType("")
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Ajouter un Centre</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            placeholder="Nom du centre"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder="Localisation"
            value={localisation}
            onChange={(e) => setLocalisation(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder="Type (MAGASIN, ENTREPOT...)"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 15 }}>
          <button type="submit">Enregistrer</button>
        </div>
      </form>

      {message && (
        <p style={{ marginTop: 15 }}>{message}</p>
      )}
    </div>
  )
}
