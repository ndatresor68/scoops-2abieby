import { useEffect, useState } from "react"
import { supabase } from "../../supabaseClient"
import { FaHistory, FaUser, FaBuilding, FaBox, FaEdit, FaTrash, FaPlus } from "react-icons/fa"
import Card from "../../components/ui/Card"
import Table from "../../components/ui/Table"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"

export default function AdminActivites() {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all") // all, users, centres, producteurs, achats

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }
    fetchActivities()
  }, [isAdmin, filter])

  async function fetchActivities() {
    try {
      setLoading(true)
      const activitiesList = []

      // Fetch recent users
      if (filter === "all" || filter === "users") {
        const { data: users } = await supabase
          .from("utilisateurs")
          .select("id,nom,email,role,created_at")
          .order("created_at", { ascending: false })
          .limit(20)

        if (users) {
          users.forEach((user) => {
            activitiesList.push({
              id: `user-${user.id}`,
              type: "user",
              action: "created",
              entity: user.nom || user.email,
              details: `Utilisateur ${user.role}`,
              timestamp: user.created_at,
              icon: FaUser,
            })
          })
        }
      }

      // Fetch recent centres
      if (filter === "all" || filter === "centres") {
        const { data: centres } = await supabase
          .from("centres")
          .select("id,nom,created_at,updated_at")
          .order("updated_at", { ascending: false })
          .limit(20)

        if (centres) {
          centres.forEach((centre) => {
            activitiesList.push({
              id: `centre-${centre.id}`,
              type: "centre",
              action: centre.updated_at !== centre.created_at ? "updated" : "created",
              entity: centre.nom,
              details: "Centre de collecte",
              timestamp: centre.updated_at || centre.created_at,
              icon: FaBuilding,
            })
          })
        }
      }

      // Fetch recent producteurs
      if (filter === "all" || filter === "producteurs") {
        const { data: producteurs } = await supabase
          .from("producteurs")
          .select("id,nom,code,created_at,updated_at")
          .order("updated_at", { ascending: false })
          .limit(20)

        if (producteurs) {
          producteurs.forEach((producteur) => {
            activitiesList.push({
              id: `producteur-${producteur.id}`,
              type: "producteur",
              action: producteur.updated_at !== producteur.created_at ? "updated" : "created",
              entity: `${producteur.nom}${producteur.code ? ` (${producteur.code})` : ""}`,
              details: "Producteur",
              timestamp: producteur.updated_at || producteur.created_at,
              icon: FaUser,
            })
          })
        }
      }

      // Fetch recent achats
      if (filter === "all" || filter === "achats") {
        const { data: achats } = await supabase
          .from("achats")
          .select("id,nom_producteur,poids,montant,created_at")
          .order("created_at", { ascending: false })
          .limit(20)

        if (achats) {
          achats.forEach((achat) => {
            activitiesList.push({
              id: `achat-${achat.id}`,
              type: "achat",
              action: "created",
              entity: achat.nom_producteur || "Inconnu",
              details: `${achat.poids || 0} kg de cacao${achat.montant ? ` - ${Number(achat.montant).toLocaleString()} FCFA` : ""}`,
              timestamp: achat.created_at,
              icon: FaBox,
            })
          })
        }
      }

      // Sort by timestamp (most recent first)
      activitiesList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

      setActivities(activitiesList.slice(0, 50)) // Limit to 50 most recent
    } catch (error) {
      console.error("[AdminActivites] Error:", error)
      showToast("Erreur lors du chargement des activités", "error")
    } finally {
      setLoading(false)
    }
  }

  function getActionLabel(action) {
    const labels = {
      created: "Créé",
      updated: "Modifié",
      deleted: "Supprimé",
    }
    return labels[action] || action
  }

  function getTypeLabel(type) {
    const labels = {
      user: "Utilisateur",
      centre: "Centre",
      producteur: "Producteur",
      achat: "Achat",
    }
    return labels[type] || type
  }

  const columns = [
    {
      key: "icon",
      label: "",
      width: "50px",
      render: (_, row) => {
        const Icon = row.icon || FaHistory
        return (
          <div style={iconContainer}>
            <Icon size={18} style={{ color: "#7a1f1f" }} />
          </div>
        )
      },
      sortable: false,
    },
    {
      key: "type",
      label: "Type",
      render: (value) => (
        <span style={typeBadge}>{getTypeLabel(value)}</span>
      ),
      sortable: true,
    },
    {
      key: "action",
      label: "Action",
      render: (value) => (
        <span style={actionBadge}>{getActionLabel(value)}</span>
      ),
      sortable: true,
    },
    {
      key: "entity",
      label: "Entité",
      sortable: true,
    },
    {
      key: "details",
      label: "Détails",
      sortable: false,
    },
    {
      key: "timestamp",
      label: "Date",
      render: (value) => {
        if (!value) return "-"
        const date = new Date(value)
        return (
          <div>
            <div style={dateText}>{date.toLocaleDateString("fr-FR")}</div>
            <div style={timeText}>{date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        )
      },
      sortable: true,
    },
  ]

  if (!isAdmin) {
    return (
      <Card>
        <div style={restrictedContainer}>
          <FaHistory size={48} style={{ color: "#dc2626" }} />
          <h3>Accès réservé aux administrateurs</h3>
          <p>Votre rôle ne permet pas l'accès à l'historique des activités.</p>
        </div>
      </Card>
    )
  }

  return (
    <div style={container}>
      <div style={header}>
        <div>
          <h2 style={title}>Historique des Activités</h2>
          <p style={subtitle}>Suivi des actions et modifications dans le système</p>
        </div>
        <div style={filters}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={filterSelect}
          >
            <option value="all">Toutes les activités</option>
            <option value="users">Utilisateurs</option>
            <option value="centres">Centres</option>
            <option value="producteurs">Producteurs</option>
            <option value="achats">Achats</option>
          </select>
        </div>
      </div>

      <Card>
        <Table
          data={activities}
          columns={columns}
          searchable
          searchPlaceholder="Rechercher dans les activités..."
          searchFields={["entity", "details"]}
          sortable
          pagination
          pageSize={15}
          loading={loading}
          emptyMessage="Aucune activité enregistrée"
        />
      </Card>
    </div>
  )
}

const container = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
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
  fontSize: "24px",
  fontWeight: 700,
  color: "#111827",
}

const subtitle = {
  margin: "4px 0 0 0",
  fontSize: "14px",
  color: "#6b7280",
}

const filters = {
  display: "flex",
  gap: 12,
}

const filterSelect = {
  padding: "10px 16px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  background: "white",
  color: "#111827",
  outline: "none",
  cursor: "pointer",
  minWidth: "200px",
}

const iconContainer = {
  width: "36px",
  height: "36px",
  borderRadius: "8px",
  background: "#fef2f2",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const typeBadge = {
  display: "inline-block",
  padding: "4px 12px",
  borderRadius: "6px",
  background: "#eff6ff",
  color: "#1e40af",
  fontSize: "12px",
  fontWeight: 600,
}

const actionBadge = {
  display: "inline-block",
  padding: "4px 12px",
  borderRadius: "6px",
  background: "#f0fdf4",
  color: "#166534",
  fontSize: "12px",
  fontWeight: 600,
}

const dateText = {
  fontSize: "14px",
  color: "#111827",
  fontWeight: 500,
}

const timeText = {
  fontSize: "12px",
  color: "#6b7280",
  marginTop: "2px",
}

const restrictedContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "60px 20px",
  textAlign: "center",
  gap: 16,
}
