import { useState } from "react"
import { useAuth } from "./context/AuthContext"
import { useUserRegistration } from "./context/SettingsContext"
import { useTranslation } from "./utils/i18n"
import logoImage from "./assets/logo-scoops.png"

export default function Login() {
  const { signInWithPassword } = useAuth()
  const allowRegistration = useUserRegistration()
  const { t } = useTranslation()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { error: authError } = await signInWithPassword(email, password)

      if (authError) {
        console.error("Erreur de connexion:", authError)
        setError(authError.message || "Email ou mot de passe incorrect")
      }
    } catch (error) {
      console.error("Erreur lors de la connexion:", error)
      setError("Une erreur est survenue. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={backgroundStyle}>
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={logoContainer}>
            <img 
              src={logoImage} 
              alt="SCOOP ASAB Logo" 
              style={logoStyle}
            />
          </div>
          <h2 style={titleStyle}>Connexion</h2>

          <form onSubmit={handleLogin} style={{ width: "100%" }}>
            <div style={inputContainerStyle}>
              <span style={iconStyle}>👤</span>
              <input
                type="email"
                placeholder="Entrez votre email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div style={{ ...inputContainerStyle, marginTop: 20 }}>
              <span style={iconStyle}>🔒</span>
              <input
                type="password"
                placeholder="Entrez votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <button type="submit" style={buttonStyle} disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </button>

            {error && <p style={errorStyle}>{error}</p>}
          </form>
          
          {!allowRegistration && (
            <div style={registrationDisabledBox}>
              <p style={registrationDisabledText}>
                {t("registrationDisabled")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const backgroundStyle = {
  backgroundImage: "url('/cacao.jpg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  height: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
}

const overlayStyle = {
  backdropFilter: "blur(5px)",
  width: "100%",
  height: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
}

const cardStyle = {
  backgroundColor: "rgba(255,255,255,0.95)",
  padding: 45,
  borderRadius: 18,
  width: 420,
  maxWidth: "90vw",
  boxShadow: "0 15px 35px rgba(0,0,0,0.25)",
}

const logoContainer = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 24,
}

const logoStyle = {
  maxWidth: "260px",
  width: "100%",
  height: "auto",
  objectFit: "contain",
  display: "block",
}

const titleStyle = {
  marginBottom: 25,
  textAlign: "center",
  fontSize: 22,
}

const inputContainerStyle = {
  display: "flex",
  alignItems: "center",
  backgroundColor: "#f5f5f5",
  borderRadius: 10,
  padding: "12px 15px",
}

const iconStyle = {
  marginRight: 10,
  fontSize: 18,
}

const inputStyle = {
  border: "none",
  background: "transparent",
  outline: "none",
  width: "100%",
  fontSize: 14,
}

const buttonStyle = {
  marginTop: 30,
  width: "100%",
  padding: 14,
  backgroundColor: "#5b2c1f",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 15,
  fontWeight: "bold",
}

const errorStyle = {
  marginTop: 15,
  color: "red",
  textAlign: "center",
}

const registrationDisabledBox = {
  marginTop: 20,
  padding: "12px 16px",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "10px",
  textAlign: "center",
}

const registrationDisabledText = {
  margin: 0,
  fontSize: "13px",
  color: "#92400e",
}
