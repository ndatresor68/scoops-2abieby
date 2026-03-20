import { useState } from "react"
import { FaArrowRight, FaCheckCircle, FaEnvelope, FaLock, FaPhoneAlt, FaShieldAlt, FaUser } from "react-icons/fa"
import { useAuth } from "./context/AuthContext"
import { useUserRegistration } from "./context/SettingsContext"
import { useMediaQuery } from "./hooks/useMediaQuery"
import { useTranslation } from "./utils/i18n"
import logoImage from "./assets/logo-scoops.png"

export default function Login() {
  const { signInWithPassword } = useAuth()
  const allowRegistration = useUserRegistration()
  const isMobile = useMediaQuery("(max-width: 900px)")
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
        setError(authError.message || "Email ou mot de passe incorrect")
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={backgroundStyle}>
      <style>{`
        @keyframes loginFadeIn {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-shell {
          animation: loginFadeIn 0.7s ease-out;
        }

        .marketing-glass-card {
          transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
        }

        .marketing-glass-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 28px 60px rgba(0, 0, 0, 0.24);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .login-glass-card {
          transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
        }

        .login-glass-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 28px 60px rgba(15, 23, 42, 0.18);
          border-color: rgba(255, 255, 255, 0.45);
        }

        .login-gradient-button {
          transition: transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease;
        }

        .login-gradient-button:hover {
          transform: translateY(-1px) scale(1.01);
          box-shadow: 0 18px 32px rgba(123, 30, 30, 0.32);
          filter: brightness(1.03);
        }

        .login-legal-link,
        .login-contact-link {
          transition: color 0.2s ease, opacity 0.2s ease, text-decoration-color 0.2s ease;
        }

        .login-legal-link:hover,
        .login-contact-link:hover {
          opacity: 1;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
      <div style={overlayStyle}>
        <div
          className="login-shell"
          style={{
            ...shellStyle,
            ...(isMobile ? shellStyleMobile : null),
          }}
        >
          <section
            className="marketing-glass-card"
            style={{
              ...marketingCard,
              ...(isMobile ? marketingCardMobile : null),
            }}
          >
            <div style={logoContainer}>
              <img
                src={logoImage}
                alt="SCOOP ASAB Logo"
                style={logoStyle}
              />
            </div>
            <span style={eyebrowStyle}>Plateforme professionnelle</span>
            <h1 style={heroTitleStyle}>Accédez aux meilleures opportunités cacao et café</h1>
            <p style={heroTextStyle}>
              Découvrez des appels d&apos;offres en temps réel, profitez d&apos;une analyse intelligente et prenez
              de meilleures décisions pour vos centres, agents et producteurs.
            </p>

            <div style={benefitsList}>
              {[
                "Découvrez des appels d’offres en temps réel",
                "Analyse intelligente pour maximiser vos profits",
                "Plateforme dédiée aux centres, agents et producteurs",
                "Gagnez du temps et prenez de meilleures décisions",
              ].map((item) => (
                <div key={item} style={benefitItem}>
                  <span style={benefitIcon}>
                    <FaCheckCircle size={12} />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div style={trustBox}>
              <div style={trustItem}>
                <FaShieldAlt size={14} />
                <span>Plateforme sécurisée</span>
              </div>
              <div style={trustItem}>
                <FaLock size={14} />
                <span>Données protégées</span>
              </div>
              <div style={trustItem}>
                <FaCheckCircle size={14} />
                <span>Utilisé par des professionnels du secteur agricole</span>
              </div>
            </div>

            <p style={adsenseNote}>
              Cette plateforme peut afficher des annonces publicitaires (Google AdSense).
            </p>
          </section>

          <section
            className="login-glass-card"
            style={{
              ...cardStyle,
              ...(isMobile ? cardStyleMobile : null),
            }}
          >
            <h2 style={titleStyle}>Connexion</h2>
            <p style={subtitleStyle}>
              Connectez-vous pour accéder à vos données, à vos messages et aux opportunités du marché.
            </p>

            <form onSubmit={handleLogin} style={{ width: "100%" }}>
              <div style={inputContainerStyle}>
                <span style={iconStyle}>
                  <FaUser size={14} />
                </span>
                <input
                  type="email"
                  placeholder="Entrez votre email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ ...inputContainerStyle, marginTop: 16 }}>
                <span style={iconStyle}>
                  <FaLock size={14} />
                </span>
                <input
                  type="password"
                  placeholder="Entrez votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <button type="submit" className="login-gradient-button" style={buttonStyle} disabled={loading}>
                <span style={buttonContentStyle}>
                  {loading ? "Connexion..." : "Se connecter"}
                  {!loading ? <FaArrowRight size={12} /> : null}
                </span>
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

            <div style={contactRow}>
              <a href="mailto:ndatresor68@gmail.com" className="login-contact-link" style={contactLink}>
                <FaEnvelope size={12} />
                ndatresor68@gmail.com
              </a>
              <a href="tel:0715887556" className="login-contact-link" style={contactLink}>
                <FaPhoneAlt size={12} />
                0715887556
              </a>
            </div>

            <div style={legalFooter}>
              <a href="/about" className="login-legal-link" style={legalLink}>
                À propos
              </a>
              <a href="/contact" className="login-legal-link" style={legalLink}>
                Contact
              </a>
              <a href="/privacy" className="login-legal-link" style={legalLink}>
                Confidentialité
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

const backgroundStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background:
    "radial-gradient(circle at top left, rgba(255,255,255,0.16), transparent 20%), radial-gradient(circle at 85% 20%, rgba(255,214,165,0.16), transparent 22%), radial-gradient(circle at bottom right, rgba(255,255,255,0.08), transparent 20%), linear-gradient(135deg, #1f2937 0%, #5b2c1f 42%, #7a1f1f 72%, #4b1d3f 100%)",
}

const overlayStyle = {
  width: "100%",
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "32px 16px",
  backdropFilter: "blur(10px)",
  background:
    "linear-gradient(180deg, rgba(8, 15, 26, 0.16) 0%, rgba(8, 15, 26, 0.1) 48%, rgba(8, 15, 26, 0.18) 100%)",
}

const shellStyle = {
  width: "min(1100px, 100%)",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.08fr) minmax(380px, 430px)",
  gap: 28,
  alignItems: "stretch",
}

const shellStyleMobile = {
  gridTemplateColumns: "1fr",
  gap: 18,
}

const marketingCard = {
  background: "rgba(255, 255, 255, 0.08)",
  color: "#ffffff",
  borderRadius: 24,
  padding: "36px 36px 38px",
  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  minHeight: 0,
  backdropFilter: "blur(15px)",
  border: "1px solid rgba(255,255,255,0.2)",
}

const marketingCardMobile = {
  padding: "28px 22px",
}

const cardStyle = {
  background: "rgba(255, 255, 255, 0.1)",
  padding: 30,
  borderRadius: 20,
  width: "100%",
  maxWidth: 430,
  justifySelf: "center",
  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  backdropFilter: "blur(15px)",
  border: "1px solid rgba(255,255,255,0.24)",
}

const cardStyleMobile = {
  padding: 24,
  maxWidth: "100%",
}

const logoContainer = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 18,
  width: "100%",
  maxWidth: "240px",
  height: "84px",
  overflow: "hidden",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.08)",
}

const logoStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
  border: "none",
}

const titleStyle = {
  margin: 0,
  textAlign: "center",
  fontSize: 30,
  fontWeight: 800,
  color: "#ffffff",
}

const subtitleStyle = {
  margin: "10px 0 22px",
  textAlign: "center",
  color: "rgba(255,255,255,0.78)",
  lineHeight: 1.6,
  fontSize: 14,
  maxWidth: 360,
}

const eyebrowStyle = {
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "center",
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.16)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
}

const heroTitleStyle = {
  margin: "18px 0 0",
  fontSize: "clamp(28px, 4vw, 42px)",
  lineHeight: 1.08,
  letterSpacing: "-0.03em",
}

const heroTextStyle = {
  margin: "14px 0 0",
  color: "rgba(255,255,255,0.82)",
  lineHeight: 1.75,
  fontSize: 15,
}

const benefitsList = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  marginTop: 24,
  width: "100%",
  maxWidth: 520,
}

const benefitItem = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: 10,
  color: "#ffffff",
  lineHeight: 1.6,
  textAlign: "left",
}

const benefitIcon = {
  width: 20,
  height: 20,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(34,197,94,0.18)",
  color: "#86efac",
  flexShrink: 0,
  marginTop: 1,
}

const trustBox = {
  marginTop: 28,
  display: "grid",
  gap: 10,
  padding: "16px 18px",
  borderRadius: 18,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.16)",
  width: "100%",
  maxWidth: 520,
}

const trustItem = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "rgba(255,255,255,0.92)",
  fontSize: 14,
}

const adsenseNote = {
  margin: "18px 0 0",
  color: "rgba(255,255,255,0.72)",
  fontSize: 12,
  lineHeight: 1.6,
}

const inputContainerStyle = {
  display: "flex",
  alignItems: "center",
  background: "rgba(255, 255, 255, 0.2)",
  borderRadius: 10,
  padding: "14px 16px",
  border: "1px solid rgba(255,255,255,0.24)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
}

const iconStyle = {
  marginRight: 10,
  fontSize: 16,
  color: "rgba(255,255,255,0.82)",
}

const inputStyle = {
  border: "none",
  background: "transparent",
  outline: "none",
  width: "100%",
  fontSize: 14,
  color: "#ffffff",
}

const buttonStyle = {
  marginTop: 22,
  width: "100%",
  padding: 14,
  background: "linear-gradient(135deg, #7b1e1e 0%, #c0392b 58%, #8e44ad 100%)",
  color: "white",
  border: "none",
  borderRadius: 14,
  cursor: "pointer",
  fontSize: 15,
  fontWeight: "bold",
  boxShadow: "0 16px 28px rgba(91,44,31,0.24)",
}

const buttonContentStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
}

const errorStyle = {
  marginTop: 15,
  color: "#fecaca",
  textAlign: "center",
  fontSize: 14,
}

const registrationDisabledBox = {
  marginTop: 20,
  padding: "12px 16px",
  background: "rgba(255, 251, 235, 0.16)",
  border: "1px solid rgba(253, 230, 138, 0.28)",
  borderRadius: "10px",
  textAlign: "center",
}

const registrationDisabledText = {
  margin: 0,
  fontSize: "13px",
  color: "#fef3c7",
}

const contactRow = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: 12,
  marginTop: 18,
}

const contactLink = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: "rgba(255,255,255,0.82)",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 600,
  opacity: 0.92,
}

const legalFooter = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: 14,
  marginTop: 22,
  paddingTop: 16,
  borderTop: "1px solid rgba(255,255,255,0.16)",
}

const legalLink = {
  color: "rgba(255,255,255,0.82)",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 600,
  opacity: 0.92,
}
