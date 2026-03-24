import { useEffect, useMemo, useState } from "react"
import Input from "../../components/ui/Input"
import Button from "../../components/ui/Button"
import {
  EMPLOYE_FORM_STATUS_OPTIONS,
  PAYMENT_FORM_STATUS_OPTIONS,
} from "./employes.utils"

const INITIAL_FORM = {
  nom_prenom: "",
  telephone: "",
  poste: "",
  centre_id: "",
  salaire: "0",
  statut: "ACTIF",
  statut_paiement: "NON_PAYE",
}

function normalizeFormValues(values) {
  return {
    ...INITIAL_FORM,
    ...values,
    centre_id: values?.centre_id ? String(values.centre_id) : "",
    salaire:
      values?.salaire === undefined || values?.salaire === null || values?.salaire === ""
        ? "0"
        : String(values.salaire),
    statut: String(values?.statut || "ACTIF").trim().toUpperCase(),
    statut_paiement: String(values?.statut_paiement || "NON_PAYE").trim().toUpperCase(),
  }
}

function toPayload(form) {
  return {
    nom_prenom: form.nom_prenom.trim(),
    telephone: form.telephone.trim(),
    poste: form.poste.trim(),
    centre_id: form.centre_id || null,
    salaire: Number(String(form.salaire).replace(",", ".")),
    statut: form.statut,
    statut_paiement: form.statut_paiement,
  }
}

export default function EmployeForm({
  initialValues,
  centres = [],
  onSubmit,
  onCancel,
  submitting = false,
}) {
  const [form, setForm] = useState(() => normalizeFormValues(initialValues))
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setForm(normalizeFormValues(initialValues))
    setErrors({})
  }, [initialValues])

  const isEditing = useMemo(() => !!initialValues?.id, [initialValues?.id])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => (current[field] ? { ...current, [field]: "" } : current))
  }

  function validateForm() {
    const nextErrors = {}

    if (!form.nom_prenom.trim()) {
      nextErrors.nom_prenom = "Le nom et prénom sont requis."
    }

    const salaryValue = Number(String(form.salaire).replace(",", "."))
    if (!Number.isFinite(salaryValue) || salaryValue < 0) {
      nextErrors.salaire = "Le salaire doit être un nombre valide."
    }

    if (!form.statut) {
      nextErrors.statut = "Le statut est requis."
    }

    if (!form.statut_paiement) {
      nextErrors.statut_paiement = "Le statut de paiement est requis."
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    await onSubmit?.(toPayload(form))
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.grid}>
        <Input
          label="Nom et prénom"
          value={form.nom_prenom}
          onChange={(value) => updateField("nom_prenom", value)}
          error={errors.nom_prenom}
          placeholder="Ex: Koffi Aya Mariam"
          required
        />

        <Input
          label="Téléphone"
          value={form.telephone}
          onChange={(value) => updateField("telephone", value)}
          placeholder="Ex: 0700000000"
        />

        <Input
          label="Poste"
          value={form.poste}
          onChange={(value) => updateField("poste", value)}
          placeholder="Ex: Comptable"
        />

        <Input
          label="Salaire"
          type="number"
          min="0"
          step="0.01"
          value={form.salaire}
          onChange={(value) => updateField("salaire", value)}
          error={errors.salaire}
          placeholder="Ex: 150000"
          required
        />

        <div style={styles.field}>
          <label style={styles.label}>Centre</label>
          <select
            value={form.centre_id}
            onChange={(event) => updateField("centre_id", event.target.value)}
            style={styles.select}
          >
            <option value="">Aucun centre</option>
            {centres.map((centre) => (
              <option key={centre.id} value={centre.id}>
                {centre.nom}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            Statut <span style={styles.required}>*</span>
          </label>
          <select
            value={form.statut}
            onChange={(event) => updateField("statut", event.target.value)}
            style={{
              ...styles.select,
              ...(errors.statut ? styles.selectError : null),
            }}
          >
            {EMPLOYE_FORM_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.statut ? <span style={styles.error}>{errors.statut}</span> : null}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            Statut paiement <span style={styles.required}>*</span>
          </label>
          <select
            value={form.statut_paiement}
            onChange={(event) => updateField("statut_paiement", event.target.value)}
            style={{
              ...styles.select,
              ...(errors.statut_paiement ? styles.selectError : null),
            }}
          >
            {PAYMENT_FORM_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.statut_paiement ? <span style={styles.error}>{errors.statut_paiement}</span> : null}
        </div>
      </div>

      <div style={styles.helper}>
        {isEditing
          ? "Les modifications seront enregistrées immédiatement dans le référentiel du personnel."
          : "La date d'embauche sera définie automatiquement à la création."}
      </div>

      <div style={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Créer l'employé"}
        </Button>
      </div>
    </form>
  )
}

const styles = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
  },
  label: {
    fontSize: 13,
    color: "#334155",
    fontWeight: 700,
    display: "block",
    letterSpacing: "0.01em",
  },
  required: {
    color: "#dc2626",
    marginLeft: 4,
  },
  select: {
    width: "100%",
    minHeight: 48,
    borderRadius: 16,
    border: "1px solid rgba(203, 213, 225, 0.95)",
    padding: "0 16px",
    background: "rgba(255,255,255,0.96)",
    color: "#0f172a",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  },
  selectError: {
    border: "1px solid rgba(220, 38, 38, 0.55)",
    boxShadow: "0 0 0 4px rgba(220, 38, 38, 0.08)",
  },
  error: {
    fontSize: 12,
    color: "#dc2626",
    marginTop: -2,
  },
  helper: {
    padding: "12px 14px",
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    flexWrap: "wrap",
  },
}
