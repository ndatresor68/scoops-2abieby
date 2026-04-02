import { useMemo, useState } from "react"
import {
  FaArrowRight,
  FaChartLine,
  FaCheckCircle,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaPhoneAlt,
  FaShieldAlt,
  FaUser,
  FaUserFriends,
  FaWeightHanging,
} from "react-icons/fa"
import { useAuth } from "./context/AuthContext"
import { useSettings, useUserRegistration } from "./context/SettingsContext"
import { useMediaQuery } from "./hooks/useMediaQuery"
import { useTranslation } from "./utils/i18n"
import logoImage from "./assets/logo-scoops.png"

export default function Login() {
  const { signInWithPassword } = useAuth()
  const { settings } = useSettings()
  const allowRegistration = useUserRegistration()
  const isMobile = useMediaQuery("(max-width: 900px)")
  const { t } = useTranslation()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const marqueeText = settings?.homepage_banner_text?.trim()
  const marqueeEnabled = !!settings?.homepage_banner_enabled && !!marqueeText
  const marqueeDuration = Math.max(8, Number(settings?.homepage_banner_speed_seconds) || 22)
  const contactEmail = settings?.contact_email || "ndatresor68@gmail.com"
  const contactPhone = settings?.contact_phone || "0715887556"
  const cooperativeName = settings?.cooperative_name || "SCOOP ASAB-COOP-CA"
  const cooperativeMotto = settings?.cooperative_motto || "Union • Discipline • Travail"
  const heroStats = useMemo(
    () => [
      { label: "Campagnes", value: "Pilotage", icon: <FaChartLine size={14} /> },
      { label: "Centres", value: "Connectés", icon: <FaUserFriends size={14} /> },
      { label: "Pesées", value: "Sécurisées", icon: <FaWeightHanging size={14} /> },
    ],
    []
  )

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

        @keyframes loginMarquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }

        @keyframes loginFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
      `}</style>
      <div style={overlayStyle}>
        <div style={frameStyle}>
          {marqueeEnabled ? (
            <div style={loginMarqueeShell}>
              <div
                style={{
                  ...loginMarqueeTrack,
                  animationDuration: `${marqueeDuration}s`,
                }}
              >
                <span style={loginMarqueeText}>{marqueeText}</span>
                <span style={loginMarqueeSeparator}>•</span>
                <span style={loginMarqueeText}>{marqueeText}</span>
              </div>
            </div>
          ) : null}
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
              <div style={heroTopRow}>
                <div style={logoContainer}>
                  <img src={settings?.logo_url || logoImage} alt="SCOOP ASAB Logo" style={logoStyle} />
                </div>
                <div style={heroBadge}>Plateforme premium</div>
              </div>

              <span style={eyebrowStyle}>{cooperativeName}</span>
              <h1 style={heroTitleStyle}>La gestion coopérative nouvelle génération</h1>
              <p style={heroTextStyle}>
                {cooperativeMotto}. Centralisez vos opérations, vos pesées, vos centres et vos
                campagnes dans une expérience claire, rapide et professionnelle.
              </p>

              <div style={heroStatsGrid}>
                {heroStats.map((item) => (
                  <div key={item.label} style={heroStatCard}>
                    <span style={heroStatIcon}>{item.icon}</span>
                    <div>
                      <div style={heroStatValue}>{item.value}</div>
                      <div style={heroStatLabel}>{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={benefitsList}>
                {[
                  "Campagnes, quotas et budgets centralisés",
                  "Suivi en temps réel des centres, producteurs et pesées",
                  "Expérience pensée pour l'administration, les agents et les centres",
                  "Accès rapide, interface élégante et données mieux organisées",
                ].map((item) => (
                  <div key={item} style={benefitItem}>
                    <span style={benefitIcon}>
                      <FaCheckCircle size={12} />
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div style={heroHighlightCard}>
                <div style={heroHighlightVisual}>
                  <div style={heroHighlightCirclePrimary} />
                  <div style={heroHighlightCircleSecondary} />
                </div>
                <div style={heroHighlightContent}>
                  <div style={heroHighlightTitle}>Espace sécurisé et intelligent</div>
                  <div style={heroHighlightText}>
                    Connectez-vous pour suivre vos données stratégiques, vos indicateurs terrain et
                    vos opportunités de marché depuis un seul espace.
                  </div>
                </div>
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
            </section>

            <section
              className="login-glass-card"
              style={{
                ...cardStyle,
                ...(isMobile ? cardStyleMobile : null),
              }}
            >
              <div style={formHeader}>
                <div style={formEyebrow}>Connexion sécurisée</div>
                <h2 style={titleStyle}>Bienvenue</h2>
              </div>
              <p style={subtitleStyle}>
                Connectez-vous pour accéder à vos tableaux de bord, vos messages et vos opérations.
              </p>

              <form onSubmit={handleLogin} style={{ width: "100%" }}>
                <label style={fieldBlock}>
                  <span style={fieldLabel}>Adresse email</span>
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
                </label>

                <label style={{ ...fieldBlock, marginTop: 16 }}>
                  <span style={fieldLabel}>Mot de passe</span>
                  <span style={iconStyle}>
                    <FaLock size={14} />
                  </span>
                  <div style={inputContainerStyle}>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Entrez votre mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={inputStyle}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      style={passwordToggleButton}
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                    </button>
                  </div>
                </label>

                <div style={formMetaRow}>
                  <div style={statusChip}>
                    <FaShieldAlt size={12} />
                    Authentification protégée
                  </div>
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
                <a href={`mailto:${contactEmail}`} className="login-contact-link" style={contactLink}>
                  <FaEnvelope size={12} />
                  {contactEmail}
                </a>
                <a href={`tel:${contactPhone}`} className="login-contact-link" style={contactLink}>
                  <FaPhoneAlt size={12} />
                  {contactPhone}
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

const frameStyle = {
  width: "min(1160px, 100%)",
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 20,
  borderRadius: 34,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.16)",
  boxShadow: "0 34px 84px rgba(0,0,0,0.24)",
  backdropFilter: "blur(10px)",
}

const loginMarqueeShell = {
  overflow: "hidden",
  borderRadius: 20,
  border: "1px solid rgba(255, 214, 165, 0.38)",
  background: "linear-gradient(90deg, rgba(255,247,237,0.96) 0%, rgba(255,251,235,0.96) 100%)",
  boxShadow: "0 14px 28px rgba(15, 23, 42, 0.12)",
}

const loginMarqueeTrack = {
  display: "inline-flex",
  minWidth: "200%",
  alignItems: "center",
  whiteSpace: "nowrap",
  padding: "12px 0",
  animationName: "loginMarquee",
  animationTimingFunction: "linear",
  animationIterationCount: "infinite",
}

const loginMarqueeText = {
  fontSize: 14,
  fontWeight: 800,
  color: "#9a3412",
  letterSpacing: "0.01em",
  paddingLeft: 24,
}

const loginMarqueeSeparator = {
  padding: "0 18px",
  color: "#f59e0b",
  fontWeight: 900,
}

const shellStyle = {
  width: "min(1100px, 100%)",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.15fr) minmax(390px, 450px)",
  gap: 24,
  alignItems: "stretch",
}

const shellStyleMobile = {
  gridTemplateColumns: "1fr",
  gap: 18,
}

const marketingCard = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))",
  color: "#ffffff",
  borderRadius: 28,
  padding: "38px 38px 40px",
  boxShadow: "0 22px 46px rgba(0,0,0,0.2)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "flex-start",
  textAlign: "left",
  minHeight: 0,
  backdropFilter: "blur(15px)",
  border: "1px solid rgba(255,255,255,0.18)",
}

const marketingCardMobile = {
  padding: "28px 22px",
}

const cardStyle = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.1))",
  padding: 32,
  borderRadius: 28,
  width: "100%",
  maxWidth: 430,
  justifySelf: "center",
  boxShadow: "0 20px 44px rgba(0,0,0,0.22)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "stretch",
  backdropFilter: "blur(15px)",
  border: "1px solid rgba(255,255,255,0.26)",
}

const cardStyleMobile = {
  padding: 24,
  maxWidth: "100%",
}

const logoContainer = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  width: 180,
  height: 72,
  overflow: "hidden",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.16)",
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
  textAlign: "left",
  fontSize: 34,
  fontWeight: 900,
  color: "#ffffff",
  letterSpacing: "-0.04em",
}

const subtitleStyle = {
  margin: "10px 0 24px",
  textAlign: "left",
  color: "rgba(255,255,255,0.78)",
  lineHeight: 1.6,
  fontSize: 14,
  maxWidth: 340,
}

const eyebrowStyle = {
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-start",
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
  maxWidth: 560,
}

const heroTextStyle = {
  margin: "14px 0 0",
  color: "rgba(255,255,255,0.82)",
  lineHeight: 1.75,
  fontSize: 15,
  maxWidth: 560,
}

const benefitsList = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  marginTop: 24,
  width: "100%",
  maxWidth: 560,
}

const benefitItem = {
  display: "flex",
  alignItems: "flex-start",
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
  maxWidth: 560,
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

const heroTopRow = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 10,
}

const heroBadge = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "#fff7ed",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
}

const heroStatsGrid = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
  marginTop: 24,
}

const heroStatCard = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 16px",
  borderRadius: 18,
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.14)",
}

const heroStatIcon = {
  width: 34,
  height: 34,
  borderRadius: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255,255,255,0.16)",
  color: "#fff",
  flexShrink: 0,
}

const heroStatValue = {
  fontSize: 14,
  fontWeight: 800,
  color: "#ffffff",
}

const heroStatLabel = {
  marginTop: 4,
  fontSize: 12,
  color: "rgba(255,255,255,0.72)",
}

const heroHighlightCard = {
  marginTop: 24,
  width: "100%",
  maxWidth: 560,
  borderRadius: 22,
  padding: "20px 20px 18px",
  background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))",
  border: "1px solid rgba(255,255,255,0.16)",
  display: "flex",
  alignItems: "center",
  gap: 18,
}

const heroHighlightVisual = {
  position: "relative",
  width: 74,
  height: 74,
  minWidth: 74,
  animation: "loginFloat 4.8s ease-in-out infinite",
}

const heroHighlightCirclePrimary = {
  position: "absolute",
  inset: 0,
  borderRadius: "50%",
  background: "radial-gradient(circle at 30% 30%, #fef3c7 0%, #f59e0b 72%, #c2410c 100%)",
  opacity: 0.95,
}

const heroHighlightCircleSecondary = {
  position: "absolute",
  right: -8,
  bottom: -6,
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: "radial-gradient(circle, #ffffff 0%, rgba(255,255,255,0.38) 100%)",
}

const heroHighlightContent = {
  minWidth: 0,
}

const heroHighlightTitle = {
  fontSize: 16,
  fontWeight: 800,
  color: "#ffffff",
}

const heroHighlightText = {
  marginTop: 8,
  fontSize: 13,
  lineHeight: 1.7,
  color: "rgba(255,255,255,0.8)",
}

const formHeader = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
}

const formEyebrow = {
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#fde68a",
}

const fieldBlock = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
}

const fieldLabel = {
  fontSize: 13,
  fontWeight: 700,
  color: "#ffffff",
}

const inputContainerStyle = {
  display: "flex",
  alignItems: "center",
  background: "rgba(255, 255, 255, 0.16)",
  borderRadius: 14,
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

const passwordToggleButton = {
  appearance: "none",
  border: "none",
  background: "transparent",
  color: "rgba(255,255,255,0.8)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  marginLeft: 10,
}

const formMetaRow = {
  marginTop: 14,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
}

const statusChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(16,185,129,0.14)",
  border: "1px solid rgba(110,231,183,0.24)",
  color: "#d1fae5",
  fontSize: 12,
  fontWeight: 700,
}

const buttonStyle = {
  marginTop: 22,
  width: "100%",
  padding: 16,
  background: "linear-gradient(135deg, #7b1e1e 0%, #c0392b 58%, #8e44ad 100%)",
  color: "white",
  border: "none",
  borderRadius: 16,
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
  textAlign: "left",
  fontSize: 14,
  lineHeight: 1.6,
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
  justifyContent: "flex-start",
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
  justifyContent: "flex-start",
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
