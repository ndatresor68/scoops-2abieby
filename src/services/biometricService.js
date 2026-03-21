function toBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

function randomChallenge() {
  return crypto.getRandomValues(new Uint8Array(32))
}

export function isBiometricSupported() {
  return typeof window !== "undefined" && !!window.PublicKeyCredential && !!navigator.credentials
}

export async function registerBiometricCredential(user) {
  if (!isBiometricSupported()) {
    throw new Error("Biométrie non disponible sur cet appareil")
  }

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: randomChallenge(),
      rp: {
        name: "SCOOP ASAB",
        id: window.location.hostname,
      },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: user?.email || user?.id || "user@scoops.local",
        displayName: user?.nom || user?.email || "Utilisateur SCOOP ASAB",
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      timeout: 60000,
      attestation: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required",
      },
    },
  })

  if (!credential?.rawId) {
    throw new Error("Impossible d'enregistrer la biométrie")
  }

  return {
    credentialId: toBase64(credential.rawId),
  }
}

export async function authenticateWithBiometric(credentialId) {
  if (!isBiometricSupported() || !credentialId) {
    throw new Error("Biométrie non disponible")
  }

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomChallenge(),
      allowCredentials: [
        {
          id: fromBase64(credentialId),
          type: "public-key",
        },
      ],
      userVerification: "required",
      timeout: 60000,
    },
  })

  return !!assertion
}
