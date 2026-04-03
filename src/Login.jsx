import { useState } from "react"
import {
  FaArrowRight,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaPhoneAlt,
  FaUser,
} from "react-icons/fa"
import { useAuth } from "./context/AuthContext"
import { useSettings, useUserRegistration } from "./context/SettingsContext"
import { useTranslation } from "./utils/i18n"
import logoImage from "./assets/logo-scoops.png"

export default function Login() {
  const { signInWithPassword } = useAuth()
  const { settings } = useSettings()
  const allowRegistration = useUserRegistration()
  const { t } = useTranslation()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const contactEmail = settings?.contact_email || "ndatresor68@gmail.com"
  const contactPhone = settings?.contact_phone || "0715887556"

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { error: authError } = await signInWithPassword(email, password)
      if (authError) {
        setError(authError.message || "Email ou mot de passe incorrect")
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        .login-card {
          animation: slideInLeft 0.8s ease-out;
        }

        .login-decor {
          animation: fadeInRight 1s ease-out 0.2s both;
        }

        .login-input {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .login-input:focus {
          box-shadow: 0 0 0 4px rgba(122, 31, 31, 0.1), 
                      inset 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .login-input::placeholder {
          color: rgba(0, 0, 0, 0.35);
        }

        .login-btn {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 16px 32px rgba(122, 31, 31, 0.2);
        }

        .login-btn:active:not(:disabled) {
          transform: translateY(-1px);
        }

        .login-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .login-link {
          transition: all 0.25s ease;
          position: relative;
          text-decoration: none;
          color: #7a1f1f;
          font-weight: 500;
        }

        .login-link:hover {
          color: #5a1515;
          transform: translateX(2px);
        }

        @media (max-width: 768px) {
          .login-decor {
            display: none;
          }
        }
      `}</style>

      <div style={containerStyle}>
        {/* Left Column - Login Form */}
        <div className="login-card" style={formContainerStyle}>
          {/* Logo */}
          <div style={logoSectionStyle}>
            <div style={logoBgStyle}>
              <img src={settings?.logo_url || logoImage} alt="Logo" style={logoImgStyle} />
            </div>
          </div>

          {/* Header */}
          <h1 style={titleStyle}>Connexion</h1>
          <p style={descriptionStyle}>
            Accédez à votre espace SCOOPS en quelques secondes
          </p>

          {/* Form */}
          <form onSubmit={handleLogin} style={formStyle}>
            {/* Email */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Email</label>
              <div style={inputGroupStyle}>
                <FaUser style={iconStyle} />
                <input
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  className="login-input"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Mot de passe</label>
              <div style={inputGroupStyle}>
                <FaLock style={iconStyle} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  className="login-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={eyeButtonStyle}
                  aria-label="Afficher/Masquer le mot de passe"
                >
                  {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={errorBoxStyle}>
                <p style={errorTextStyle}>{error}</p>
              </div>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              style={submitButtonStyle}
              className="login-btn"
            >
              {loading ? "Connexion en cours..." : "Se connecter"}
              {!loading && <FaArrowRight size={14} style={{ marginLeft: 8 }} />}
            </button>

            {/* Divider */}
            <div style={dividerStyle}>
              <span style={dividerTextStyle}>OU</span>
            </div>

            {/* Info Box */}
            {!allowRegistration && (
              <div style={infoBoxStyle}>
                <p style={infoTextStyle}>{t("registrationDisabled")}</p>
              </div>
            )}
          </form>

          {/* Footer */}
          <div style={footerStyle}>
            <a href={`mailto:${contactEmail}`} className="login-link" style={contactLinkStyle}>
              <FaEnvelope size={13} style={{ marginRight: 6 }} />
              {contactEmail}
            </a>
            <div style={{ color: "#e0e0e0" }}>•</div>
            <a href={`tel:${contactPhone}`} className="login-link" style={contactLinkStyle}>
              <FaPhoneAlt size={13} style={{ marginRight: 6 }} />
              {contactPhone}
            </a>
          </div>

          {/* Legal Links */}
          <div style={legalLinksStyle}>
            <a href="/about" className="login-link" style={legalLinkStyle}>
              À propos
            </a>
            <a href="/privacy" className="login-link" style={legalLinkStyle}>
              Confidentialité
            </a>
            <a href="/contact" className="login-link" style={legalLinkStyle}>
              Support
            </a>
          </div>
        </div>

        {/* Right Column - Branding */}
        <div className="login-decor" style={decorationContainerStyle}>
          <div style={brandingStyle}>
            <h2 style={brandTitleStyle}>Bienvenue sur SCOOPS</h2>
            <p style={brandSubtitleStyle}>
              La plateforme de gestion coopérative nouvelle génération
            </p>

            <ul style={featureListStyle}>
              <li style={featureItemStyle}>
                <span style={featureDotStyle}>✓</span>
                <span>Gestion centralisée de vos opérations</span>
              </li>
              <li style={featureItemStyle}>
                <span style={featureDotStyle}>✓</span>
                <span>Suivi en temps réel des données</span>
              </li>
              <li style={featureItemStyle}>
                <span style={featureDotStyle}>✓</span>
                <span>Interface sécurisée et intuitive</span>
              </li>
              <li style={featureItemStyle}>
                <span style={featureDotStyle}>✓</span>
                <span>Support technique disponible</span>
              </li>
            </ul>

            {/* Decorative Elements */}
            <div style={decorElementsStyle}>
              <div style={decorShapeStyle} />
              <div style={{ ...decorShapeStyle, ...decorShape2Style }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============= STYLES =============

const pageStyle = {
  minHeight: "100vh",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #f8f7f6 0%, #f3eeeb 50%, #efe8e4 100%)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
  padding: "16px",
}

const containerStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "48px",
  maxWidth: "1200px",
  width: "100%",
  alignItems: "center",
}

const formContainerStyle = {
  background: "#ffffff",
  padding: "48px 40px",
  borderRadius: "16px",
  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
  maxWidth: "440px",
  width: "100%",
}

const logoSectionStyle = {
  marginBottom: "32px",
  textAlign: "center",
}

const logoBgStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "80px",
  height: "80px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #f5f1ed 0%, #ede7e1 100%)",
  boxShadow: "0 4px 16px rgba(122, 31, 31, 0.08)",
}

const logoImgStyle = {
  width: "90%",
  height: "90%",
  objectFit: "contain",
}

const titleStyle = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#1a1a1a",
  margin: "0 0 8px 0",
  letterSpacing: "-0.5px",
}

const descriptionStyle = {
  fontSize: "14px",
  color: "#666666",
  margin: "0 0 32px 0",
  lineHeight: "1.6",
}

const formStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
}

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
}

const labelStyle = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#333333",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
}

const inputGroupStyle = {
  display: "flex",
  alignItems: "center",
  background: "#ffffff",
  border: "1.5px solid #e5e0db",
  borderRadius: "10px",
  padding: "12px 14px",
  transition: "all 0.2s ease",
}

const iconStyle = {
  color: "#7a1f1f",
  marginRight: "10px",
  fontSize: "15px",
  opacity: 0.7,
}

const inputStyle = {
  border: "none",
  background: "transparent",
  outline: "none",
  width: "100%",
  fontSize: "14px",
  color: "#1a1a1a",
  fontFamily: "inherit",
}

const eyeButtonStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#7a1f1f",
  marginLeft: "8px",
  padding: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  opacity: 0.7,
  transition: "all 0.2s ease",
}

const errorBoxStyle = {
  background: "#fee2e2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "12px 14px",
  marginTop: "8px",
}

const errorTextStyle = {
  color: "#991b1b",
  fontSize: "13px",
  margin: "0",
  lineHeight: "1.5",
}

const submitButtonStyle = {
  background: "linear-gradient(135deg, #7a1f1f 0%, #a32d2d 100%)",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 4px 12px rgba(122, 31, 31, 0.15)",
  marginTop: "8px",
}

const dividerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  margin: "12px 0",
  opacity: 0.5,
}

const dividerTextStyle = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#999999",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
}

const infoBoxStyle = {
  background: "#fef3c7",
  border: "1px solid #fcd34d",
  borderRadius: "8px",
  padding: "12px 14px",
  textAlign: "center",
}

const infoTextStyle = {
  color: "#78350f",
  fontSize: "12px",
  margin: "0",
  lineHeight: "1.5",
}

const footerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "16px",
  marginTop: "24px",
  paddingTop: "20px",
  borderTop: "1px solid #f0ebe5",
  flexWrap: "wrap",
}

const contactLinkStyle = {
  display: "flex",
  alignItems: "center",
  fontSize: "12px",
  color: "#7a1f1f",
  textDecoration: "none",
}

const legalLinksStyle = {
  display: "flex",
  gap: "20px",
  justifyContent: "center",
  marginTop: "16px",
  flexWrap: "wrap",
}

const legalLinkStyle = {
  fontSize: "11px",
  color: "#999999",
  textDecoration: "none",
}

const decorationContainerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const brandingStyle = {
  maxWidth: "380px",
}

const brandTitleStyle = {
  fontSize: "42px",
  fontWeight: "700",
  color: "#1a1a1a",
  margin: "0 0 16px 0",
  lineHeight: "1.2",
  letterSpacing: "-1px",
}

const brandSubtitleStyle = {
  fontSize: "16px",
  color: "#666666",
  margin: "0 0 32px 0",
  lineHeight: "1.6",
}

const featureListStyle = {
  listStyle: "none",
  margin: "0",
  padding: "0",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
}

const featureItemStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  fontSize: "14px",
  color: "#333333",
  lineHeight: "1.6",
}

const featureDotStyle = {
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #7a1f1f 0%, #a32d2d 100%)",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "700",
  flexShrink: 0,
}

const decorElementsStyle = {
  position: "relative",
  marginTop: "48px",
  height: "240px",
}

const decorShapeStyle = {
  position: "absolute",
  width: "160px",
  height: "160px",
  borderRadius: "40% 60% 70% 30% / 40% 50% 60% 50%",
  background: "linear-gradient(135deg, rgba(122, 31, 31, 0.1) 0%, rgba(163, 45, 45, 0.05) 100%)",
  top: "0",
  left: "0",
}

const decorShape2Style = {
  top: "80px",
  left: "100px",
  width: "140px",
  height: "140px",
  background: "linear-gradient(135deg, rgba(122, 31, 31, 0.08) 0%, rgba(163, 45, 45, 0.03) 100%)",
}
