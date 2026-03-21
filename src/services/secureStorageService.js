const STORAGE_PREFIX = "secure_store"

function getStorageKey(scope) {
  return `${STORAGE_PREFIX}:${scope}`
}

function bufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

function base64ToBuffer(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

async function derivePinHash(pin, saltBase64) {
  const encoder = new TextEncoder()
  const salt = base64ToBuffer(saltBase64)
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(pin), { name: "PBKDF2" }, false, [
    "deriveBits",
  ])

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 120000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  )

  return bufferToBase64(bits)
}

function readScope(scope) {
  try {
    const raw = window.localStorage.getItem(getStorageKey(scope))
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    return null
  }
}

function writeScope(scope, value) {
  window.localStorage.setItem(getStorageKey(scope), JSON.stringify(value))
}

export function getSecureSettings(scope) {
  return readScope(scope)
}

export function clearSecureSettings(scope) {
  window.localStorage.removeItem(getStorageKey(scope))
}

export async function storePinSettings(scope, pin, extra = {}) {
  const salt = bufferToBase64(crypto.getRandomValues(new Uint8Array(16)))
  const pinHash = await derivePinHash(pin, salt)
  const payload = {
    ...readScope(scope),
    ...extra,
    salt,
    pinHash,
    updatedAt: new Date().toISOString(),
  }

  writeScope(scope, payload)
  return payload
}

export async function verifyPin(scope, pin) {
  const current = readScope(scope)
  if (!current?.pinHash || !current?.salt) return false

  const computedHash = await derivePinHash(pin, current.salt)
  return computedHash === current.pinHash
}

export function updateSecureSettings(scope, patch) {
  const current = readScope(scope) || {}
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  }

  writeScope(scope, next)
  return next
}
