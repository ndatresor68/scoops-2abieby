import { useEffect, useMemo, useRef, useState } from "react"
import { FaEdit, FaPlus, FaTrash, FaUserShield, FaTimes } from "react-icons/fa"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../supabaseClient"

const INITIAL_FORM = {
  nom: "",
  email: "",
  password: "",
  role: "AGENT",
  centre_id: "",
}

export default function AdminUsers() {
  const { isAdmin } = useAuth()

  const [users, setUsers] = useState([])
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(true)

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)

  const [photoFile, setPhotoFile] = useState(null)
  const [preview, setPreview] = useState("")
  const fileRef = useRef(null)

  function normalizeRole(value) {
    const nextRole = String(value || "AGENT").trim().toUpperCase()
    return ["ADMIN", "AGENT", "CENTRE"].includes(nextRole) ? nextRole : "AGENT"
  }

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }
    fetchData()
  }, [isAdmin])

  const centresMap = useMemo(
    () => Object.fromEntries(centres.map((c) => [String(c.id), c.nom])),
    [centres],
  )

  async function fetchData() {
    setLoading(true)
    setError("")

    const [{ data: usersData, error: usersError }, { data: centresData }] = await Promise.all([
      supabase
        .from("utilisateurs")
        .select("id,user_id,nom,email,role,centre_id,avatar_url,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("centres").select("id,nom").order("nom"),
    ])

    if (usersError) {
      setError(usersError.message)
    }

    setUsers(usersData || [])
    setCentres(centresData || [])
    setLoading(false)
  }

  function resetModalState() {
    if (preview) URL.revokeObjectURL(preview)
    setPhotoFile(null)
    setPreview("")
    setForm(INITIAL_FORM)
    setEditingUser(null)
    setShowModal(false)
  }

  async function uploadAvatar(file, identity) {
    const extension = file.name.split(".").pop() || "jpg"
    const path = `users/${identity}/avatar-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSaveUser() {
    setSaving(true)
    setMessage("")
    setError("")

    try {
      let avatarUrl = editingUser?.avatar_url || ""
      const role = normalizeRole(form.role)

      if (editingUser) {
        if (photoFile) {
          avatarUrl = await uploadAvatar(photoFile, editingUser.user_id || editingUser.id)
        }

        const { error: updateError } = await supabase
          .from("utilisateurs")
          .update({
            nom: form.nom,
            email: form.email,
            role,
            centre_id: form.centre_id || null,
            avatar_url: avatarUrl || null,
          })
          .eq("id", editingUser.id)

        if (updateError) throw new Error(updateError.message)

        setMessage("Utilisateur modifie")
      } else {
        if (!form.password) {
          throw new Error("Mot de passe requis pour creer un utilisateur")
        }

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: form.email,
          password: form.password,
          email_confirm: true,
          user_metadata: {
            full_name: form.nom,
            role,
          },
        })

        if (authError) {
          throw new Error(
            authError.message ||
              "Creation Auth refusee. Utiliser une cle service role cote serveur pour admin.createUser.",
          )
        }

        const newAuthUser = authData?.user
        if (!newAuthUser?.id) {
          throw new Error("Creation du compte impossible")
        }

        if (photoFile) {
          avatarUrl = await uploadAvatar(photoFile, newAuthUser.id)
        }

        const { error: insertError } = await supabase.from("utilisateurs").insert([
          {
            user_id: newAuthUser.id,
            nom: form.nom,
            email: form.email,
            role,
            centre_id: form.centre_id || null,
            avatar_url: avatarUrl || null,
          },
        ])

        if (insertError) throw new Error(insertError.message)

        setMessage("Utilisateur cree")
      }

      resetModalState()
      await fetchData()
    } catch (err) {
      setError(err.message || "Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteUser(target) {
    const confirmed = window.confirm(`Supprimer ${target.nom || target.email} ?`)
    if (!confirmed) return

    setError("")
    setMessage("")

    try {
      const { error: deleteTableError } = await supabase.from("utilisateurs").delete().eq("id", target.id)
      if (deleteTableError) throw new Error(deleteTableError.message)

      if (target.user_id) {
        await supabase.auth.admin.deleteUser(target.user_id)
      }

      setMessage("Utilisateur supprime")
      await fetchData()
    } catch (err) {
      setError(err.message || "Erreur lors de la suppression")
    }
  }

  function openCreateModal() {
    setEditingUser(null)
    setForm(INITIAL_FORM)
    setShowModal(true)
  }

  function openEditModal(target) {
    setEditingUser(target)
    setForm({
      nom: target.nom || "",
      email: target.email || "",
      password: "",
      role: normalizeRole(target.role),
      centre_id: target.centre_id ? String(target.centre_id) : "",
    })
    setPreview(target.avatar_url || "")
    setShowModal(true)
  }

  if (!isAdmin) {
    return (
      <div style={restrictedCard}>
        <FaUserShield size={28} />
        <h3>Acces reserve aux administrateurs</h3>
        <p>Votre role ne permet pas la gestion des utilisateurs.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={topBar}>
        <h2 style={{ margin: 0 }}>Gestion des utilisateurs</h2>
        <button style={primaryBtn} onClick={openCreateModal}>
          <FaPlus /> Ajouter utilisateur
        </button>
      </div>

      {message && <div style={successBox}>{message}</div>}
      {error && <div style={errorBox}>{error}</div>}

      <div style={tableCard}>
        <table style={table}>
          <thead>
            <tr style={theadRow}>
              <th style={th}>Photo</th>
              <th style={th}>Nom</th>
              <th style={th}>Email</th>
              <th style={th}>Role</th>
              <th style={th}>Centre</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan="6" style={emptyRow}>
                  Aucun utilisateur enregistre
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id}>
                <td style={td}>
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.nom} style={avatarMini} />
                  ) : (
                    <div style={avatarFallback}>{(u.nom || "U").slice(0, 1).toUpperCase()}</div>
                  )}
                </td>
                <td style={td}>{u.nom}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>{u.role}</td>
                <td style={td}>{centresMap[String(u.centre_id)] || "-"}</td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={editBtn} onClick={() => openEditModal(u)}>
                      <FaEdit />
                    </button>
                    <button style={deleteBtn} onClick={() => handleDeleteUser(u)}>
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={modalOverlay} onClick={resetModalState}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <h3 style={{ margin: 0 }}>{editingUser ? "Modifier utilisateur" : "Nouvel utilisateur"}</h3>
              <button style={iconBtn} onClick={resetModalState}>
                <FaTimes />
              </button>
            </div>

            <div style={modalBody}>
              <Field label="Nom" value={form.nom} onChange={(v) => setForm((p) => ({ ...p, nom: v }))} />
              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={(v) => setForm((p) => ({ ...p, email: v }))}
              />

              {!editingUser && (
                <Field
                  label="Mot de passe"
                  type="password"
                  value={form.password}
                  onChange={(v) => setForm((p) => ({ ...p, password: v }))}
                />
              )}

              <div style={field}>
                <span style={label}>Role</span>
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: normalizeRole(e.target.value) }))}
                  style={input}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="AGENT">AGENT</option>
                  <option value="CENTRE">CENTRE</option>
                </select>
              </div>

              <div style={field}>
                <span style={label}>Centre associe</span>
                <select
                  value={form.centre_id}
                  onChange={(e) => setForm((p) => ({ ...p, centre_id: e.target.value }))}
                  style={input}
                >
                  <option value="">Aucun</option>
                  {centres.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div style={field}>
                <span style={label}>Photo de profil</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button type="button" style={secondaryBtn} onClick={() => fileRef.current?.click()}>
                    Choisir une photo
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const selected = e.target.files?.[0]
                      if (!selected) return
                      setPhotoFile(selected)
                      if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview)
                      setPreview(URL.createObjectURL(selected))
                    }}
                  />
                  {preview && <img src={preview} alt="preview" style={avatarPreview} />}
                </div>
              </div>
            </div>

            <div style={modalFooter}>
              <button style={secondaryBtn} onClick={resetModalState}>
                Annuler
              </button>
              <button style={primaryBtn} onClick={handleSaveUser} disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label: text, value, onChange, type = "text" }) {
  return (
    <div style={field}>
      <span style={label}>{text}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={input} />
    </div>
  )
}

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
  gap: 10,
  flexWrap: "wrap",
}

const tableCard = {
  background: "white",
  borderRadius: 14,
  boxShadow: "0 12px 28px rgba(0,0,0,0.08)",
  overflowX: "auto",
}

const table = { width: "100%", borderCollapse: "collapse", minWidth: 720 }
const th = { textAlign: "left", padding: 12, fontSize: 13 }
const td = { padding: 12, borderTop: "1px solid #f0f0f0" }
const theadRow = { background: "#f8fafc" }
const emptyRow = { padding: 20, textAlign: "center", color: "#6b7280" }

const avatarMini = { width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }
const avatarFallback = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  background: "#f5d6d6",
  color: "#7a1f1f",
  fontWeight: 700,
}

const avatarPreview = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  objectFit: "cover",
  border: "2px solid #eee",
}

const primaryBtn = {
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  background: "linear-gradient(90deg, #7a1f1f, #b02a2a)",
  color: "white",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 700,
}

const secondaryBtn = {
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "10px 12px",
  background: "white",
  cursor: "pointer",
}

const editBtn = {
  border: "1px solid #dbeafe",
  background: "#eff6ff",
  color: "#1d4ed8",
  borderRadius: 8,
  padding: "7px 8px",
  cursor: "pointer",
}

const deleteBtn = {
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#b91c1c",
  borderRadius: 8,
  padding: "7px 8px",
  cursor: "pointer",
}

const successBox = {
  marginBottom: 10,
  padding: "10px 12px",
  borderRadius: 10,
  background: "#ecfdf3",
  color: "#166534",
}

const errorBox = {
  marginBottom: 10,
  padding: "10px 12px",
  borderRadius: 10,
  background: "#fef2f2",
  color: "#b91c1c",
}

const restrictedCard = {
  background: "white",
  borderRadius: 14,
  boxShadow: "0 12px 24px rgba(0,0,0,0.08)",
  padding: 22,
  maxWidth: 520,
  display: "grid",
  gap: 6,
}

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "grid",
  placeItems: "center",
  zIndex: 3000,
  padding: 16,
}

const modal = {
  width: "100%",
  maxWidth: 560,
  background: "white",
  borderRadius: 14,
  boxShadow: "0 20px 42px rgba(0,0,0,0.2)",
}

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 16,
  borderBottom: "1px solid #f1f1f1",
}

const modalBody = {
  padding: 16,
  display: "grid",
  gap: 12,
}

const modalFooter = {
  padding: 16,
  borderTop: "1px solid #f1f1f1",
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
}

const iconBtn = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 18,
}

const field = { display: "grid", gap: 6 }
const label = { fontSize: 13, color: "#6b7280", fontWeight: 600 }
const input = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
}
