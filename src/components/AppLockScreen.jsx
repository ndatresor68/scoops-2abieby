import { useEffect, useMemo, useState } from "react"
import { FaFingerprint, FaLock, FaShieldAlt } from "react-icons/fa"
import { useAuth } from "../context/AuthContext"
import { useAppLock } from "../context/AppLockContext"
import logoImage from "../assets/logo-scoops.png"

export default function AppLockScreen() {
  const { user } = useAuth()
  const {
    biometricAvailable,
    biometricEnabled,
    isLocked,
    isReady,
    lockError,
    lockedUntil,
    needsPinSetup,
    setupPin,
    unlockWithBiometric,
    unlockWithPin,
  } = useAppLock()

  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState("")
  const [remainingSeconds, setRemainingSeconds] = useState(null)

  const countdown = useMemo(() => remainingSeconds, [remainingSeconds])

  useEffect(() => {
    if (!isLocked) {
      setPin("")
      setConfirmPin("")
      setLocalError("")
    }
  }, [isLocked])

  useEffect(() => {
    if (!lockedUntil) {
      setRemainingSeconds(null)
      return undefined
    }

    const update = () => {
      const diff = new Date(lockedUntil).getTime() - Date.now()
      setRemainingSeconds(diff > 0 ? Math.ceil(diff / 1000) : null)
    }

    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [lockedUntil])

  useEffect(() => {
    if (!isLocked || needsPinSetup || !biometricAvailable || !biometricEnabled) return

    handleBiometric()
  }, [biometricAvailable, biometricEnabled, isLocked, needsPinSetup])

  if (!user || !isReady || !isLocked) return null

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setLocalError("")

    try {
      if (needsPinSetup) {
        if (!/^\d{4}$/.test(pin)) {
          throw new Error("Le PIN doit contenir exactement 4 chiffres")
        }
        if (pin !== confirmPin) {
          throw new Error("Les codes PIN ne correspondent pas")
        }
        await setupPin(pin)
      } else {
        await unlockWithPin(pin)
      }
      setPin("")
      setConfirmPin("")
    } catch (error) {
      setLocalError(error.message || "Impossible de déverrouiller l'application")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleBiometric() {
    setSubmitting(true)
    setLocalError("")
    try {
      await unlockWithBiometric()
    } catch (error) {
      setLocalError(error.message || "Échec de l'authentification biométrique")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={backdrop} />
      <div style={card}>
        <div style={logoWrap}>
          <img src={logoImage} alt="SCOOP ASAB" style={logo} />
        </div>
        <div style={badge}>
          <FaShieldAlt size={12} />
          <span>Sécurité locale</span>
        </div>
        <h2 style={title}>{needsPinSetup ? "Configurer votre PIN" : "Application verrouillée"}</h2>
        <p style={subtitle}>
          {needsPinSetup
            ? "Définissez un code PIN à 4 chiffres pour protéger l'application sur cet appareil."
            : "Entrez votre code PIN ou utilisez la biométrie pour reprendre la session."}
        </p>

        <form onSubmit={handleSubmit} style={form}>
          <label style={field}>
            <span style={label}>{needsPinSetup ? "Nouveau PIN" : "PIN"}</span>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              style={input}
              placeholder="0000"
              required
            />
          </label>

          {needsPinSetup && (
            <label style={field}>
              <span style={label}>Confirmer le PIN</span>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                style={input}
                placeholder="0000"
                required
              />
            </label>
          )}

          <button type="submit" style={primaryButton} disabled={submitting || !!countdown}>
            <FaLock size={12} />
            {needsPinSetup ? "Enregistrer le PIN" : "Déverrouiller"}
          </button>
        </form>

        {!needsPinSetup && biometricAvailable && biometricEnabled && (
          <button type="button" style={secondaryButton} onClick={handleBiometric} disabled={submitting || !!countdown}>
            <FaFingerprint size={14} />
            Utiliser la biométrie
          </button>
        )}

        {(localError || lockError || countdown) && (
          <div style={errorBox}>
            {countdown ? `Verrouillage temporaire: ${countdown}s restantes.` : localError || lockError}
          </div>
        )}
      </div>
    </div>
  )
}

const overlay = {
  position: "fixed",
  inset: 0,
  zIndex: 4000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
}

const backdrop = {
  position: "absolute",
  inset: 0,
  background: "rgba(15, 23, 42, 0.72)",
  backdropFilter: "blur(12px)",
}

const card = {
  position: "relative",
  zIndex: 1,
  width: "min(420px, 100%)",
  padding: "28px 24px",
  borderRadius: 24,
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.18)",
  boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
  color: "#fff",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  alignItems: "center",
  textAlign: "center",
}

const logoWrap = {
  width: 88,
  height: 88,
  borderRadius: 20,
  overflow: "hidden",
  background: "rgba(255,255,255,0.14)",
}

const logo = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
}

const badge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 999,
  padding: "6px 12px",
  background: "rgba(255,255,255,0.14)",
  fontSize: 12,
  fontWeight: 700,
}

const title = {
  margin: 0,
  fontSize: 28,
  fontWeight: 800,
}

const subtitle = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.6,
  color: "rgba(255,255,255,0.82)",
}

const form = {
  width: "100%",
  display: "grid",
  gap: 14,
}

const field = {
  display: "grid",
  gap: 8,
  textAlign: "left",
}

const label = {
  fontSize: 13,
  fontWeight: 700,
}

const input = {
  width: "100%",
  minHeight: 52,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.24)",
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  padding: "0 16px",
  fontSize: 24,
  letterSpacing: "0.45em",
  textAlign: "center",
}

const primaryButton = {
  width: "100%",
  minHeight: 50,
  border: "none",
  borderRadius: 14,
  background: "linear-gradient(135deg, #7a1f1f 0%, #b02a2a 100%)",
  color: "#fff",
  fontSize: 15,
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
}

const secondaryButton = {
  width: "100%",
  minHeight: 48,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.22)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
}

const errorBox = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(239,68,68,0.16)",
  color: "#fecaca",
  fontSize: 13,
}
