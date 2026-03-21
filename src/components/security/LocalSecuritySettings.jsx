import { useState } from "react"
import { FaFingerprint, FaKey, FaLock } from "react-icons/fa"
import Card from "../ui/Card"
import Button from "../ui/Button"
import Input from "../ui/Input"
import { useToast } from "../ui/Toast"
import { useAppLock } from "../../context/AppLockContext"

export default function LocalSecuritySettings() {
  const { showToast } = useToast()
  const {
    biometricAvailable,
    biometricEnabled,
    changePin,
    disableBiometric,
    enableBiometric,
  } = useAppLock()

  const [currentPin, setCurrentPin] = useState("")
  const [nextPin, setNextPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleChangePin(event) {
    event.preventDefault()

    if (!/^\d{4}$/.test(nextPin)) {
      showToast("Le nouveau PIN doit contenir 4 chiffres", "error")
      return
    }

    if (nextPin !== confirmPin) {
      showToast("Les PIN ne correspondent pas", "error")
      return
    }

    setSaving(true)
    try {
      await changePin({ currentPin, nextPin })
      setCurrentPin("")
      setNextPin("")
      setConfirmPin("")
      showToast("PIN mis à jour avec succès", "success")
    } catch (error) {
      showToast(error.message || "Impossible de mettre à jour le PIN", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleEnableBiometric() {
    setSaving(true)
    try {
      await enableBiometric()
      showToast("Biométrie activée", "success")
    } catch (error) {
      showToast(error.message || "Impossible d'activer la biométrie", "error")
    } finally {
      setSaving(false)
    }
  }

  function handleDisableBiometric() {
    disableBiometric()
    showToast("Biométrie désactivée", "success")
  }

  return (
    <Card title="Sécurité locale">
      <form onSubmit={handleChangePin} style={form}>
        <div style={grid}>
          <Input
            label="PIN actuel"
            value={currentPin}
            onChange={setCurrentPin}
            type="password"
            icon={<FaLock />}
            placeholder="0000"
          />
          <Input
            label="Nouveau PIN"
            value={nextPin}
            onChange={setNextPin}
            type="password"
            icon={<FaKey />}
            placeholder="0000"
          />
          <Input
            label="Confirmer le nouveau PIN"
            value={confirmPin}
            onChange={setConfirmPin}
            type="password"
            icon={<FaKey />}
            placeholder="0000"
          />
        </div>

        <div style={actions}>
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : "Changer le PIN"}
          </Button>
          {biometricAvailable && !biometricEnabled && (
            <Button type="button" variant="secondary" onClick={handleEnableBiometric} disabled={saving}>
              <FaFingerprint size={12} /> Activer la biométrie
            </Button>
          )}
          {biometricEnabled && (
            <Button type="button" variant="secondary" onClick={handleDisableBiometric} disabled={saving}>
              <FaFingerprint size={12} /> Désactiver la biométrie
            </Button>
          )}
        </div>

        <p style={hint}>
          L'application se verrouille au lancement et après 2 minutes d'inactivité. Après 5 erreurs, un blocage
          temporaire de 30 secondes est appliqué.
        </p>
      </form>
    </Card>
  )
}

const form = {
  display: "grid",
  gap: 16,
}

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
}

const actions = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
}

const hint = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.6,
  color: "#64748b",
}
