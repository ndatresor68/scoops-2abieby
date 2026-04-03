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
import { useMediaQuery } from "./hooks/useMediaQuery"
import { useTranslation } from "./utils/i18n"
import logoImage from "./assets/logo-scoops.png"

export default function Login() {
  const { signInWithPassword } = useAuth()
  const { settings } = useSettings()
  const allowRegistration = useUserRegistration()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { t } = useTranslation()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const contactEmail = settings?.contact_email || "ndatresor68@gmail.com"
  const contactPhone = settings?.contact_phone || "0715887556"
  const cooperativeName = settings?.cooperative_name || "SCOOPS"

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

  if (isMobile) {
    return (
      <div style={mobilePageStyle}>
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

          .login-mobile-screen {
            animation: fadeInUp 0.6s ease-out;
          }

          .login-input {
            transition: all 0.25s ease;
          }

          .login-input:focus {
            box-shadow: 0 0 0 4px rgba(122, 31, 31, 0.1);
          }
        `}</style>

        <div className="login-mobile-screen" style={mobileScreenStyle}>
          <section style={mobileTopCardStyle}>
            <div style={mobileTopRowStyle}>
              <div style={mobileTopLogoWrapStyle}>
                <img src={settings?.logo_url || logoImage} alt="Logo" style={mobileTopLogoStyle} />
              </div>
              <div style={mobileTopBadgeStyle}>Connexion</div>
            </div>

            <h1 style={mobileTopTitleStyle}>{cooperativeName}</h1>
            <p style={mobileTopTextStyle}>
              Accédez rapidement a votre espace de gestion, vos donnees terrain et vos operations.
            </p>

            <div style={mobileStatsStyle}>
              <div style={mobileStatCardStyle}>
                <strong style={mobileStatValueStyle}>Simple</strong>
                <span style={mobileStatLabelStyle}>Acces rapide</span>
              </div>
              <div style={mobileStatCardStyle}>
                <strong style={mobileStatValueStyle}>Mobile</strong>
                <span style={mobileStatLabelStyle}>Optimise terrain</span>
              </div>
            </div>
          </section>

          <section style={mobileFormCardStyle}>
            <div style={mobileFormHeaderStyle}>
              <h2 style={mobileFormTitleStyle}>Se connecter</h2>
              <p style={mobileFormTextStyle}>Entrez vos identifiants pour continuer.</p>
            </div>

            <form onSubmit={handleLogin} style={formStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Email</label>
                <div style={mobileInputGroupStyle}>
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

              <div style={fieldStyle}>
                <label style={labelStyle}>Mot de passe</label>
                <div style={mobileInputGroupStyle}>
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

              {error && (
                <div style={errorBoxStyle}>
                  <p style={errorTextStyle}>{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading} style={mobileSubmitButtonStyle} className="login-btn">
                {loading ? "Connexion en cours..." : "Se connecter"}
                {!loading && <FaArrowRight size={14} style={{ marginLeft: 8 }} />}
              </button>

              {!allowRegistration && (
                <div style={mobileInfoBoxStyle}>
                  <p style={infoTextStyle}>{t("registrationDisabled")}</p>
                </div>
              )}
            </form>

            <div style={mobileContactStackStyle}>
              <a href={`mailto:${contactEmail}`} className="login-link" style={mobileContactLinkStyle}>
                <FaEnvelope size={13} style={{ marginRight: 8 }} />
                {contactEmail}
              </a>
              <a href={`tel:${contactPhone}`} className="login-link" style={mobileContactLinkStyle}>
                <FaPhoneAlt size={13} style={{ marginRight: 8 }} />
                {contactPhone}
              </a>
            </div>

            <div style={mobileLegalLinksStyle}>
              <a href="/about" className="login-link" style={mobileLegalLinkStyle}>A propos</a>
              <a href="/privacy" className="login-link" style={mobileLegalLinkStyle}>Confidentialite</a>
              <a href="/contact" className="login-link" style={mobileLegalLinkStyle}>Support</a>
            </div>
          </section>
        </div>
      </div>
    )
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

        .login-shell {
          position: relative;
        }

        .login-mobile-hero {
          display: none;
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

        .login-meta-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .login-meta-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px rgba(122, 31, 31, 0.08);
        }

        @media (max-width: 768px) {
          .login-shell {
            max-width: 100%;
          }

          .login-mobile-hero {
            display: block;
            animation: fadeInUp 0.7s ease-out;
          }

          .login-decor {
            display: none;
          }

          .login-card {
            animation: fadeInUp 0.7s ease-out 0.05s both;
          }
        }
      `}</style>

      <div
        className="login-shell"
        style={{
          ...containerStyle,
          ...(isMobile ? containerMobileStyle : null),
        }}
      >
        <div className="login-mobile-hero" style={mobileHeroStyle}>
          <div style={mobileHeroTopStyle}>
            <div style={mobileHeroLogoStyle}>
              <img src={settings?.logo_url || logoImage} alt="Logo" style={mobileHeroLogoImgStyle} />
            </div>
            <div style={mobileHeroBadgeStyle}>Accès sécurisé</div>
          </div>
          <h1 style={mobileHeroTitleStyle}>{cooperativeName}</h1>
          <p style={mobileHeroTextStyle}>
            Connectez-vous rapidement pour retrouver vos opérations, vos producteurs et vos tableaux de bord.
          </p>
          <div style={mobileHighlightsStyle}>
            <div className="login-meta-card" style={mobileHighlightCardStyle}>
              <span style={mobileHighlightValueStyle}>Temps réel</span>
              <span style={mobileHighlightLabelStyle}>Suivi des données</span>
            </div>
            <div className="login-meta-card" style={mobileHighlightCardStyle}>
              <span style={mobileHighlightValueStyle}>Mobile</span>
              <span style={mobileHighlightLabelStyle}>Pensé pour terrain</span>
            </div>
          </div>
        </div>

        {/* Left Column - Login Form */}
        <div
          className="login-card"
          style={{
            ...formContainerStyle,
            ...(isMobile ? formContainerMobileStyle : null),
          }}
        >
          {/* Logo */}
          <div style={logoSectionStyle}>
            <div style={logoBgStyle}>
              <img src={settings?.logo_url || logoImage} alt="Logo" style={logoImgStyle} />
            </div>
          </div>

          {/* Header */}
          <h1 style={{ ...titleStyle, ...(isMobile ? titleMobileStyle : null) }}>Connexion</h1>
          <p style={{ ...descriptionStyle, ...(isMobile ? descriptionMobileStyle : null) }}>
            Accédez à votre espace SCOOPS en quelques secondes
          </p>

          {/* Form */}
          <form onSubmit={handleLogin} style={formStyle}>
            {/* Email */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Email</label>
              <div style={{ ...inputGroupStyle, ...(isMobile ? inputGroupMobileStyle : null) }}>
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
              <div style={{ ...inputGroupStyle, ...(isMobile ? inputGroupMobileStyle : null) }}>
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
              style={{ ...submitButtonStyle, ...(isMobile ? submitButtonMobileStyle : null) }}
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
          <div style={{ ...footerStyle, ...(isMobile ? footerMobileStyle : null) }}>
            <a href={`mailto:${contactEmail}`} className="login-link" style={contactLinkStyle}>
              <FaEnvelope size={13} style={{ marginRight: 6 }} />
              {contactEmail}
            </a>
            {!isMobile && <div style={{ color: "#e0e0e0" }}>•</div>}
            <a href={`tel:${contactPhone}`} className="login-link" style={contactLinkStyle}>
              <FaPhoneAlt size={13} style={{ marginRight: 6 }} />
              {contactPhone}
            </a>
          </div>

          {/* Legal Links */}
          <div style={{ ...legalLinksStyle, ...(isMobile ? legalLinksMobileStyle : null) }}>
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
  background:
    "radial-gradient(circle at top left, rgba(122, 31, 31, 0.12), transparent 28%), linear-gradient(135deg, #f8f7f6 0%, #f3eeeb 50%, #efe8e4 100%)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
  padding: "24px 16px",
}

const mobilePageStyle = {
  minHeight: "100vh",
  width: "100%",
  padding: "16px 14px 24px",
  background:
    "radial-gradient(circle at top, rgba(122, 31, 31, 0.14), transparent 34%), linear-gradient(180deg, #f7f1ec 0%, #f4efeb 100%)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
}

const mobileScreenStyle = {
  width: "100%",
  maxWidth: "480px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
}

const mobileTopCardStyle = {
  padding: "22px 18px 18px",
  borderRadius: "28px",
  background: "linear-gradient(155deg, #7a1f1f 0%, #531515 100%)",
  color: "#ffffff",
  boxShadow: "0 20px 40px rgba(90, 22, 22, 0.18)",
}

const mobileTopRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
}

const mobileTopLogoWrapStyle = {
  width: "58px",
  height: "58px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.14)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const mobileTopLogoStyle = {
  width: "78%",
  height: "78%",
  objectFit: "contain",
}

const mobileTopBadgeStyle = {
  padding: "8px 12px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.12)",
  fontSize: "11px",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
}

const mobileTopTitleStyle = {
  margin: "18px 0 10px",
  fontSize: "28px",
  lineHeight: "1.05",
  fontWeight: "800",
}

const mobileTopTextStyle = {
  margin: 0,
  fontSize: "14px",
  lineHeight: "1.65",
  color: "rgba(255,255,255,0.82)",
}

const mobileStatsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "18px",
}

const mobileStatCardStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "14px 12px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.1)",
}

const mobileStatValueStyle = {
  fontSize: "13px",
  fontWeight: "800",
}

const mobileStatLabelStyle = {
  fontSize: "12px",
  color: "rgba(255,255,255,0.72)",
}

const mobileFormCardStyle = {
  background: "#ffffff",
  borderRadius: "28px",
  padding: "24px 18px 22px",
  border: "1px solid rgba(122, 31, 31, 0.08)",
  boxShadow: "0 16px 40px rgba(53, 32, 23, 0.08)",
}

const mobileFormHeaderStyle = {
  marginBottom: "22px",
}

const mobileFormTitleStyle = {
  margin: 0,
  fontSize: "26px",
  fontWeight: "800",
  color: "#1a1a1a",
  letterSpacing: "-0.03em",
}

const mobileFormTextStyle = {
  margin: "8px 0 0",
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#666666",
}

const mobileInputGroupStyle = {
  display: "flex",
  alignItems: "center",
  background: "#ffffff",
  border: "1.5px solid #e5e0db",
  borderRadius: "16px",
  minHeight: "54px",
  padding: "12px 14px",
  transition: "all 0.2s ease",
}

const mobileSubmitButtonStyle = {
  background: "linear-gradient(135deg, #7a1f1f 0%, #a32d2d 100%)",
  color: "#ffffff",
  border: "none",
  borderRadius: "16px",
  width: "100%",
  minHeight: "54px",
  padding: "14px 18px",
  fontSize: "15px",
  fontWeight: "700",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 4px 12px rgba(122, 31, 31, 0.15)",
  marginTop: "4px",
}

const mobileInfoBoxStyle = {
  background: "#fef3c7",
  border: "1px solid #fcd34d",
  borderRadius: "8px",
  padding: "12px 14px",
  textAlign: "center",
  marginTop: "4px",
}

const mobileContactStackStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  marginTop: "22px",
  paddingTop: "18px",
  borderTop: "1px solid #f0ebe5",
}

const mobileContactLinkStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "46px",
  borderRadius: "14px",
  background: "#faf6f2",
  color: "#7a1f1f",
  textDecoration: "none",
  fontSize: "13px",
  fontWeight: "600",
}

const mobileLegalLinksStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "14px",
  flexWrap: "wrap",
  marginTop: "16px",
}

const mobileLegalLinkStyle = {
  fontSize: "12px",
  color: "#8a8179",
  textDecoration: "none",
}

const containerStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "48px",
  maxWidth: "1200px",
  width: "100%",
  alignItems: "center",
}

const containerMobileStyle = {
  gridTemplateColumns: "1fr",
  gap: "18px",
  maxWidth: "560px",
}

const mobileHeroStyle = {
  width: "100%",
  padding: "20px 18px 8px",
  borderRadius: "28px",
  background: "linear-gradient(160deg, rgba(122, 31, 31, 0.96) 0%, rgba(87, 20, 20, 0.92) 100%)",
  color: "#ffffff",
  boxShadow: "0 22px 44px rgba(87, 20, 20, 0.18)",
}

const mobileHeroTopStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
}

const mobileHeroLogoStyle = {
  width: "56px",
  height: "56px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.14)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(10px)",
}

const mobileHeroLogoImgStyle = {
  width: "78%",
  height: "78%",
  objectFit: "contain",
}

const mobileHeroBadgeStyle = {
  padding: "9px 12px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.14)",
  border: "1px solid rgba(255,255,255,0.16)",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
}

const mobileHeroTitleStyle = {
  margin: "18px 0 10px",
  fontSize: "26px",
  lineHeight: "1.1",
  fontWeight: "800",
  letterSpacing: "-0.03em",
}

const mobileHeroTextStyle = {
  margin: 0,
  fontSize: "14px",
  lineHeight: "1.65",
  color: "rgba(255,255,255,0.82)",
}

const mobileHighlightsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
  marginTop: "18px",
}

const mobileHighlightCardStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  minWidth: 0,
  padding: "14px 12px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(8px)",
}

const mobileHighlightValueStyle = {
  fontSize: "13px",
  fontWeight: "800",
  color: "#ffffff",
}

const mobileHighlightLabelStyle = {
  fontSize: "12px",
  lineHeight: "1.45",
  color: "rgba(255,255,255,0.72)",
}

const formContainerStyle = {
  background: "#ffffff",
  padding: "48px 40px",
  borderRadius: "28px",
  border: "1px solid rgba(122, 31, 31, 0.08)",
  boxShadow: "0 18px 48px rgba(53, 32, 23, 0.08)",
  maxWidth: "440px",
  width: "100%",
}

const formContainerMobileStyle = {
  maxWidth: "100%",
  padding: "28px 20px 24px",
  borderRadius: "24px",
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

const titleMobileStyle = {
  fontSize: "28px",
}

const descriptionStyle = {
  fontSize: "15px",
  color: "#666666",
  margin: "0 0 32px 0",
  lineHeight: "1.6",
}

const descriptionMobileStyle = {
  fontSize: "14px",
  margin: "0 0 24px 0",
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
  fontSize: "12px",
  fontWeight: "600",
  color: "#333333",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
}

const inputGroupStyle = {
  display: "flex",
  alignItems: "center",
  background: "#ffffff",
  border: "1.5px solid #e5e0db",
  borderRadius: "16px",
  minHeight: "56px",
  padding: "14px 16px",
  transition: "all 0.2s ease",
}

const inputGroupMobileStyle = {
  minHeight: "54px",
  padding: "12px 14px",
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
  fontSize: "16px",
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
  borderRadius: "16px",
  minHeight: "56px",
  padding: "14px 18px",
  fontSize: "15px",
  fontWeight: "700",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 4px 12px rgba(122, 31, 31, 0.15)",
  marginTop: "8px",
}

const submitButtonMobileStyle = {
  minHeight: "54px",
  marginTop: "4px",
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
  marginTop: "28px",
  paddingTop: "22px",
  borderTop: "1px solid #f0ebe5",
  flexWrap: "wrap",
}

const footerMobileStyle = {
  flexDirection: "column",
  alignItems: "stretch",
  gap: "12px",
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

const legalLinksMobileStyle = {
  gap: "14px",
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
