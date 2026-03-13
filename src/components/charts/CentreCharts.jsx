import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const COLORS = ["#16a34a", "#f59e0b", "#2563eb", "#8b5cf6", "#dc2626", "#06b6d4"]

/**
 * Monthly Purchases Chart
 * Shows cocoa purchases over time
 */
export function MonthlyPurchasesChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={emptyState}>
        <p>Aucune donnée disponible</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickFormatter={(value) => {
            const [year, month] = value.split("-")
            return `${month}/${year.slice(2)}`
          }}
        />
        <YAxis />
        <Tooltip
          formatter={(value) => [`${Number(value).toLocaleString()} kg`, "Poids"]}
          labelFormatter={(label) => `Mois: ${label}`}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="poids"
          stroke="#16a34a"
          strokeWidth={2}
          name="Poids (kg)"
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/**
 * Top Producteurs Chart
 * Shows top producers by weight
 */
export function TopProducteursChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={emptyState}>
        <p>Aucune donnée disponible</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis
          dataKey="nom"
          type="category"
          width={120}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value) => [`${Number(value).toLocaleString()} kg`, "Poids"]}
        />
        <Legend />
        <Bar dataKey="poids" fill="#7a1f1f" name="Poids (kg)" />
      </BarChart>
    </ResponsiveContainer>
  )
}

/**
 * Livraisons Status Chart
 * Shows delivery status distribution
 */
export function LivraisonsStatusChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={emptyState}>
        <p>Aucune donnée disponible</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

/**
 * Stock by Centre Chart
 * Shows stock levels by centre
 */
export function StockByCentreChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={emptyState}>
        <p>Aucune donnée disponible</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip
          formatter={(value) => [`${Number(value).toLocaleString()} kg`, "Stock"]}
        />
        <Legend />
        <Bar dataKey="stock" fill="#2563eb" name="Stock (kg)" />
      </BarChart>
    </ResponsiveContainer>
  )
}

const emptyState = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: 300,
  color: "#6b7280",
  fontSize: "14px",
}
