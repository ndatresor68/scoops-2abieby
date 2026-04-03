import { useState, useEffect } from 'react'
import { FaPlay, FaTimes, FaCheckCircle, FaLock, FaWifi, FaMobile } from 'react-icons/fa'

/**
 * PWA Welcome Screen - Affiche au premier lancement
 * Présente les fonctionnalités principales et l'app installée
 */
export default function PWAWelcomeScreen() {
  const [showWelcome, setShowWelcome] = useState(false)
  const [animationStep, setAnimationStep] = useState(0)
  const [isStandalone, setIsStandalone] = useState(false)

  // Vérifier si c'est un lancement PWA et première visite
  useEffect(() => {
    // Vérifier si l'app est en mode standalone
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
      || document.referrer.includes('android-app://')

    setIsStandalone(isStandaloneMode)

    // Afficher le welcome screen au premier lancement
    const hasSeenWelcome = localStorage.getItem('pwa_welcome_shown')
    if (!hasSeenWelcome && isStandaloneMode) {
      setShowWelcome(true)
      localStorage.setItem('pwa_welcome_shown', 'true')
      
      // Animation progressive
      const timer1 = setTimeout(() => setAnimationStep(1), 300)
      const timer2 = setTimeout(() => setAnimationStep(2), 800)
      const timer3 = setTimeout(() => setAnimationStep(3), 1300)
      
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
      }
    }
  }, [])

  const handleClose = () => {
    setShowWelcome(false)
  }

  if (!showWelcome) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} />

      {/* Welcome Modal */}
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button
            onClick={handleClose}
            style={styles.closeBtn}
            title="Fermer"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Logo animé */}
          <div 
            style={{
              ...styles.logoSection,
              opacity: animationStep >= 1 ? 1 : 0,
              transform: animationStep >= 1 ? 'scale(1)' : 'scale(0.8)',
              transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div style={styles.logoWrapper}>
              <img
                src="/cacao.png"
                alt="SCOOP ASAB"
                style={styles.logo}
              />
              <div style={styles.badge}>
                <FaMobile size={16} style={{ color: '#7a1f1f' }} />
              </div>
            </div>
            <h1 style={styles.welcomeTitle}>Bienvenue dans SCOOPS!</h1>
            <p style={styles.welcomeSubtitle}>
              Votre plateforme de gestion agricole installée
            </p>
          </div>

          {/* Features */}
          <div 
            style={{
              ...styles.featuresSection,
              opacity: animationStep >= 2 ? 1 : 0,
              transform: animationStep >= 2 ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s ease-out 0.3s'
            }}
          >
            <h2 style={styles.featuresTitle}>Ce que vous pouvez faire:</h2>
            
            <div style={styles.featuresList}>
              <FeatureItem
                icon={<FaWifi size={20} />}
                title="Accès rapide"
                description="Lancez l'app en 1 tap depuis votre écran d'accueil"
                color="#2563eb"
              />

              <FeatureItem
                icon={<FaMobile size={20} />}
                title="Fonctionnement offline"
                description="Utilisez l'app sans connexion Internet"
                color="#16a34a"
              />

              <FeatureItem
                icon={<FaLock size={20} />}
                title="Sécurisé"
                description="Vos données sont protégées et à jour"
                color="#f59e0b"
              />

              <FeatureItem
                icon={<FaCheckCircle size={20} />}
                title="Mise à jour auto"
                description="Toujours à jour, sans interaction"
                color="#8b5cf6"
              />
            </div>
          </div>

          {/* Action Button */}
          <div 
            style={{
              ...styles.actionSection,
              opacity: animationStep >= 3 ? 1 : 0,
              transform: animationStep >= 3 ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s ease-out 0.6s'
            }}
          >
            <button
              onClick={handleClose}
              style={styles.startBtn}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)'
                e.target.style.boxShadow = '0 20px 40px rgba(122, 31, 31, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 10px 20px rgba(122, 31, 31, 0.2)'
              }}
            >
              <FaPlay size={16} style={{ marginRight: 8 }} />
              Commencer
            </button>

            <p style={styles.hint}>
              Vous pouvez ajouter SCOOPS à votre écran d'accueil à tout moment
            </p>
          </div>
        </div>

        {/* Decoration */}
        <div style={styles.decoration} />
      </div>

      {/* Styles CSS pour animations */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-15px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(122, 31, 31, 0.4);
          }
          50% {
            box-shadow: 0 0 0 15px rgba(122, 31, 31, 0);
          }
        }

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .feature-item {
          animation: slideInDown 0.6s ease-out forwards;
        }

        .feature-item:nth-child(1) {
          animation-delay: 0.8s;
        }

        .feature-item:nth-child(2) {
          animation-delay: 1s;
        }

        .feature-item:nth-child(3) {
          animation-delay: 1.2s;
        }

        .feature-item:nth-child(4) {
          animation-delay: 1.4s;
        }
      `}</style>
    </>
  )
}

function FeatureItem({ icon, title, description, color }) {
  return (
    <div className="feature-item" style={styles.featureItem}>
      <div style={{ ...styles.featureIcon, color }}>
        {icon}
      </div>
      <div style={styles.featureContent}>
        <h3 style={styles.featureTitle}>{title}</h3>
        <p style={styles.featureDescription}>{description}</p>
      </div>
    </div>
  )
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(5px)',
    zIndex: 10000,
    animation: 'fadeIn 0.4s ease-out',
  },

  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10001,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    overflowY: 'auto',
  },

  header: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },

  closeBtn: {
    background: 'rgba(255, 255, 255, 0.9)',
    border: 'none',
    borderRadius: '50%',
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#6b7280',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },

  content: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    borderRadius: 32,
    padding: '40px 32px',
    maxWidth: 500,
    width: '100%',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
    position: 'relative',
    overflow: 'hidden',
  },

  logoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },

  logoWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
    objectFit: 'cover',
    boxShadow: '0 15px 35px rgba(122, 31, 31, 0.25)',
    border: '3px solid white',
    animation: 'float 3s ease-in-out infinite',
  },

  badge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },

  welcomeTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: '-0.02em',
  },

  welcomeSubtitle: {
    margin: 0,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: 500,
  },

  featuresSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    marginBottom: 28,
  },

  featuresTitle: {
    margin: '0 0 12px 0',
    fontSize: 16,
    fontWeight: 700,
    color: '#1f2937',
  },

  featuresList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },

  featureItem: {
    display: 'flex',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.5)',
    border: '1px solid rgba(226, 232, 240, 0.8)',
  },

  featureIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'rgba(122, 31, 31, 0.08)',
  },

  featureContent: {
    flex: 1,
  },

  featureTitle: {
    margin: '0 0 4px 0',
    fontSize: 13,
    fontWeight: 700,
    color: '#1f2937',
  },

  featureDescription: {
    margin: 0,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 1.4,
  },

  actionSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
  },

  startBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '14px 24px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #7a1f1f 0%, #6a1717 100%)',
    color: 'white',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 20px rgba(122, 31, 31, 0.2)',
  },

  hint: {
    margin: 0,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    fontWeight: 500,
  },

  decoration: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(122, 31, 31, 0.1) 0%, rgba(122, 31, 31, 0) 70%)',
    pointerEvents: 'none',
  },
}
