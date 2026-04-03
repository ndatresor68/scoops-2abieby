import { useEffect, useState } from 'react'
import { FaDownload, FaShareAlt, FaTimes, FaCheckCircle, FaApple, FaChrome } from 'react-icons/fa'

/**
 * PWA Installation Prompt Component
 * Affiche une belle interface d'installation PWA avec le logo animé
 */
export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [userOS, setUserOS] = useState('unknown')
  const [animatingLogo, setAnimatingLogo] = useState(true)

  // Détecter l'OS
  useEffect(() => {
    const detectOS = () => {
      const ua = navigator.userAgent
      if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('Mac')) {
        return 'iOS'
      } else if (ua.includes('Android')) {
        return 'Android'
      } else if (ua.includes('Windows')) {
        return 'Windows'
      }
      return 'unknown'
    }
    setUserOS(detectOS())
  }, [])

  // Vérifier si déjà installé
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      // Empêcher l'affichage automatique du prompt
      e.preventDefault()
      // Stocker l'événement
      setDeferredPrompt(e)
      // Afficher notre prompt personnalisé
      setTimeout(() => {
        setShowPrompt(true)
      }, 2000) // Afficher après 2 secondes
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Vérifier app installed
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully')
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      // Afficher le prompt du navigateur
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('[PWA] Installation accepted')
        setIsInstalled(true)
        setShowPrompt(false)
      } else {
        console.log('[PWA] Installation declined')
      }

      setDeferredPrompt(null)
    } catch (error) {
      console.error('[PWA] Installation error:', error)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
  }

  // Ne pas afficher si pas de prompt ou déjà installé
  if (!showPrompt || isInstalled || !deferredPrompt) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={handleDismiss} />

      {/* Modal d'installation */}
      <div style={styles.modal}>
        {/* Header avec fermeture */}
        <div style={styles.header}>
          <h2 style={styles.title}>Installer SCOOPS</h2>
          <button
            onClick={handleDismiss}
            style={styles.closeBtn}
            title="Fermer"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Contenu */}
        <div style={styles.content}>
          {/* Logo animé */}
          <div style={styles.logoContainer}>
            <div 
              style={{
                ...styles.logoWrapper,
                animation: animatingLogo ? 'float 3s ease-in-out infinite' : 'none'
              }}
            >
              <img
                src="/cacao.png"
                alt="SCOOP ASAB"
                style={styles.logo}
                onLoad={() => setAnimatingLogo(true)}
              />
            </div>
            <div style={styles.glow} />
          </div>

          {/* Description */}
          <div style={styles.description}>
            <h3 style={styles.subtitle}>
              Gardez SCOOPS toujours à portée de main
            </h3>
            <p style={styles.text}>
              Installez l'application pour accéder plus rapidement et utiliser les fonctionnalités hors ligne.
            </p>

            {/* Instructions par OS */}
            <div style={styles.osInfo}>
              {userOS === 'iOS' && (
                <div style={styles.osGuide}>
                  <FaApple size={20} style={{ marginRight: 12, color: '#7a1f1f' }} />
                  <div>
                    <p style={styles.osTitle}>Sur iPhone/iPad:</p>
                    <ol style={styles.osList}>
                      <li>Appuyez sur <strong>Partager</strong> <FaShareAlt size={14} style={{ display: 'inline', marginLeft: 4 }} /></li>
                      <li>Sélectionnez <strong>"Sur l'écran d'accueil"</strong></li>
                      <li>Appuyez sur <strong>Ajouter</strong></li>
                    </ol>
                  </div>
                </div>
              )}

              {userOS === 'Android' && (
                <div style={styles.osGuide}>
                  <FaChrome size={20} style={{ marginRight: 12, color: '#7a1f1f' }} />
                  <div>
                    <p style={styles.osTitle}>Sur Android:</p>
                    <ol style={styles.osList}>
                      <li>Appuyez sur le menu (⋮)</li>
                      <li>Sélectionnez <strong>"Installer l'application"</strong></li>
                      <li>Confirmez l'installation</li>
                    </ol>
                  </div>
                </div>
              )}

              {userOS === 'Windows' && (
                <div style={styles.osGuide}>
                  <FaChrome size={20} style={{ marginRight: 12, color: '#7a1f1f' }} />
                  <div>
                    <p style={styles.osTitle}>Sur Windows:</p>
                    <ol style={styles.osList}>
                      <li>Cliquez sur l'icône d'installation dans la barre d'adresse</li>
                      <li>Sélectionnez <strong>"Installer"</strong></li>
                      <li>L'app sera lancée automatiquement</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Avantages */}
            <div style={styles.benefits}>
              <div style={styles.benefit}>
                <FaCheckCircle size={18} style={{ color: '#16a34a', marginRight: 8 }} />
                <span>Accès rapide depuis l'écran d'accueil</span>
              </div>
              <div style={styles.benefit}>
                <FaCheckCircle size={18} style={{ color: '#16a34a', marginRight: 8 }} />
                <span>Fonctionne sans connexion Internet</span>
              </div>
              <div style={styles.benefit}>
                <FaCheckCircle size={18} style={{ color: '#16a34a', marginRight: 8 }} />
                <span>Mise à jour automatique</span>
              </div>
              <div style={styles.benefit}>
                <FaCheckCircle size={18} style={{ color: '#16a34a', marginRight: 8 }} />
                <span>Pas besoin de l'App Store</span>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div style={styles.actions}>
            <button
              onClick={handleInstallClick}
              style={styles.installBtn}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #a71f1f 0%, #8b1a1a 100%)'
                e.target.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #7a1f1f 0%, #6a1717 100%)'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              <FaDownload size={18} style={{ marginRight: 8 }} />
              Installer maintenant
            </button>

            <button
              onClick={handleDismiss}
              style={styles.dismissBtn}
              onMouseEnter={(e) => {
                e.target.style.background = '#f3f4f6'
                e.target.style.borderColor = '#7a1f1f'
                e.target.style.color = '#7a1f1f'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white'
                e.target.style.borderColor = '#d1d5db'
                e.target.style.color = '#6b7280'
              }}
            >
              Plus tard
            </button>
          </div>
        </div>

        {/* Style global pour animations */}
        <style>{`
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-20px);
            }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.6;
            }
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: scale(0.9);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </>
  )
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    zIndex: 9998,
    animation: 'fadeIn 0.3s ease-in-out',
  },

  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 9999,
    background: 'white',
    borderRadius: 24,
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    maxWidth: 480,
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    animation: 'slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottom: '1px solid #e5e7eb',
  },

  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },

  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 8,
    color: '#6b7280',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },

  content: {
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },

  logoContainer: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 160,
    marginBottom: 16,
  },

  logoWrapper: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: 140,
    height: 140,
    borderRadius: 28,
    objectFit: 'cover',
    boxShadow: '0 20px 40px rgba(122, 31, 31, 0.3)',
    border: '4px solid #ffffff',
  },

  glow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(122, 31, 31, 0.2) 0%, rgba(122, 31, 31, 0) 70%)',
    animation: 'pulse 3s ease-in-out infinite',
    zIndex: 1,
  },

  description: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },

  subtitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: '#1f2937',
    textAlign: 'center',
    letterSpacing: '-0.01em',
  },

  text: {
    margin: 0,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 1.6,
  },

  osInfo: {
    padding: 16,
    borderRadius: 16,
    background: 'linear-gradient(135deg, rgba(122, 31, 31, 0.05) 0%, rgba(122, 31, 31, 0.02) 100%)',
    border: '1px solid rgba(122, 31, 31, 0.1)',
  },

  osGuide: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
  },

  osTitle: {
    margin: '0 0 8px 0',
    fontSize: 13,
    fontWeight: 700,
    color: '#1f2937',
  },

  osList: {
    margin: '0',
    paddingLeft: 20,
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 1.8,
  },

  benefits: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 10,
    paddingTop: 12,
    borderTop: '1px solid #e5e7eb',
  },

  benefit: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 13,
    color: '#374151',
    fontWeight: 500,
  },

  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 8,
  },

  installBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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

  dismissBtn: {
    padding: '12px 24px',
    borderRadius: 12,
    border: '2px solid #d1d5db',
    background: 'white',
    color: '#6b7280',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
}
