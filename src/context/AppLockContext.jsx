import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "./AuthContext"
import { authenticateWithBiometric, isBiometricSupported, registerBiometricCredential } from "../services/biometricService"
import {
  getSecureSettings,
  storePinSettings,
  updateSecureSettings,
  verifyPin,
} from "../services/secureStorageService"

const AppLockContext = createContext(null)
const LOCK_TIMEOUT_MS = 2 * 60 * 1000
const MAX_ATTEMPTS = 5
const TEMP_LOCK_MS = 30 * 1000

function getScope(userId) {
  return `app_lock:${userId || "anonymous"}`
}

export function AppLockProvider({ children }) {
  const { user } = useAuth()
  const [isLocked, setIsLocked] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [needsPinSetup, setNeedsPinSetup] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(isBiometricSupported())
  const [lockError, setLockError] = useState("")
  const [lockedUntil, setLockedUntil] = useState(null)
  const inactivityTimerRef = useRef(null)

  const scope = getScope(user?.id)

  const refreshSecurityState = useCallback(() => {
    if (!user?.id) {
      setIsLocked(false)
      setNeedsPinSetup(false)
      setBiometricEnabled(false)
      setLockedUntil(null)
      setIsReady(true)
      return
    }

    const settings = getSecureSettings(scope) || {}
    setBiometricEnabled(!!settings.biometricEnabled)
    setNeedsPinSetup(!settings.pinHash)
    setLockedUntil(settings.lockedUntil || null)
    setIsLocked(true)
    setIsReady(true)
  }, [scope, user?.id])

  const resetInactivityTimer = useCallback(() => {
    if (!user?.id || isLocked) return

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }

    inactivityTimerRef.current = setTimeout(() => {
      setIsLocked(true)
      setLockError("")
    }, LOCK_TIMEOUT_MS)
  }, [isLocked, user?.id])

  useEffect(() => {
    refreshSecurityState()
  }, [refreshSecurityState])

  useEffect(() => {
    if (!user?.id || isLocked) return undefined

    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click"]
    const handler = () => resetInactivityTimer()
    events.forEach((event) => window.addEventListener(event, handler, true))
    resetInactivityTimer()

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
      events.forEach((event) => window.removeEventListener(event, handler, true))
    }
  }, [isLocked, resetInactivityTimer, user?.id])

  useEffect(() => {
    if (!user?.id) return undefined

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsLocked(true)
        setLockError("")
      } else if (!needsPinSetup) {
        setIsLocked(true)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [needsPinSetup, user?.id])

  useEffect(() => {
    setBiometricAvailable(isBiometricSupported())
  }, [])

  const lockApp = useCallback(() => {
    if (!user?.id) return
    setIsLocked(true)
    setLockError("")
  }, [user?.id])

  const unlockWithPin = useCallback(
    async (pin) => {
      const settings = getSecureSettings(scope) || {}

      if (settings.lockedUntil && new Date(settings.lockedUntil).getTime() > Date.now()) {
        const seconds = Math.ceil((new Date(settings.lockedUntil).getTime() - Date.now()) / 1000)
        setLockError(`Trop de tentatives. Réessayez dans ${seconds}s.`)
        setLockedUntil(settings.lockedUntil)
        return { success: false }
      }

      const valid = await verifyPin(scope, pin)

      if (!valid) {
        const attempts = (settings.failedAttempts || 0) + 1
        const patch = { failedAttempts: attempts }

        if (attempts >= MAX_ATTEMPTS) {
          patch.lockedUntil = new Date(Date.now() + TEMP_LOCK_MS).toISOString()
          patch.failedAttempts = 0
        }

        updateSecureSettings(scope, patch)
        setLockedUntil(patch.lockedUntil || null)
        setLockError(
          patch.lockedUntil
            ? "5 tentatives échouées. Verrouillage temporaire activé."
            : `Code PIN incorrect. Tentative ${attempts}/${MAX_ATTEMPTS}.`,
        )
        return { success: false }
      }

      updateSecureSettings(scope, { failedAttempts: 0, lockedUntil: null })
      setLockedUntil(null)
      setLockError("")
      setNeedsPinSetup(false)
      setIsLocked(false)
      resetInactivityTimer()
      return { success: true }
    },
    [resetInactivityTimer, scope],
  )

  const setupPin = useCallback(
    async (pin) => {
      await storePinSettings(scope, pin, {
        failedAttempts: 0,
        lockedUntil: null,
        biometricEnabled: false,
        biometricCredentialId: null,
      })
      setNeedsPinSetup(false)
      setLockError("")
      setIsLocked(false)
      resetInactivityTimer()
      return { success: true }
    },
    [resetInactivityTimer, scope],
  )

  const changePin = useCallback(
    async ({ currentPin, nextPin }) => {
      const settings = getSecureSettings(scope) || {}
      if (settings.pinHash) {
        const valid = await verifyPin(scope, currentPin)
        if (!valid) {
          throw new Error("PIN actuel incorrect")
        }
      }

      await storePinSettings(scope, nextPin, {
        biometricEnabled: settings.biometricEnabled || false,
        biometricCredentialId: settings.biometricCredentialId || null,
        failedAttempts: 0,
        lockedUntil: null,
      })
      refreshSecurityState()
      return { success: true }
    },
    [refreshSecurityState, scope],
  )

  const enableBiometric = useCallback(async () => {
    if (!user?.id) throw new Error("Utilisateur non connecté")
    const result = await registerBiometricCredential(user)
    updateSecureSettings(scope, {
      biometricEnabled: true,
      biometricCredentialId: result.credentialId,
    })
    setBiometricEnabled(true)
    return { success: true }
  }, [scope, user])

  const disableBiometric = useCallback(() => {
    updateSecureSettings(scope, {
      biometricEnabled: false,
      biometricCredentialId: null,
    })
    setBiometricEnabled(false)
  }, [scope])

  const unlockWithBiometric = useCallback(async () => {
    const settings = getSecureSettings(scope) || {}

    if (!settings.biometricEnabled || !settings.biometricCredentialId) {
      throw new Error("Biométrie non configurée")
    }

    const success = await authenticateWithBiometric(settings.biometricCredentialId)
    if (!success) {
      throw new Error("Authentification biométrique refusée")
    }

    updateSecureSettings(scope, { failedAttempts: 0, lockedUntil: null })
    setLockError("")
    setLockedUntil(null)
    setIsLocked(false)
    resetInactivityTimer()
    return { success: true }
  }, [resetInactivityTimer, scope])

  const value = useMemo(
    () => ({
      isLocked,
      isReady,
      needsPinSetup,
      biometricEnabled,
      biometricAvailable,
      lockError,
      lockedUntil,
      lockApp,
      unlockWithPin,
      unlockWithBiometric,
      setupPin,
      changePin,
      enableBiometric,
      disableBiometric,
      refreshSecurityState,
    }),
    [
      biometricAvailable,
      biometricEnabled,
      changePin,
      disableBiometric,
      enableBiometric,
      isLocked,
      isReady,
      lockApp,
      lockError,
      lockedUntil,
      needsPinSetup,
      refreshSecurityState,
      setupPin,
      unlockWithBiometric,
      unlockWithPin,
    ],
  )

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>
}

export function useAppLock() {
  const context = useContext(AppLockContext)
  if (!context) {
    throw new Error("useAppLock must be used within AppLockProvider")
  }
  return context
}
