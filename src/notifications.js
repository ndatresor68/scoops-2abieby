import { messaging } from "./firebase"
import { getToken } from "firebase/messaging"

export const requestNotificationPermission = async () => {
  try {
    if (typeof Notification === "undefined") {
      console.warn("[notifications] Notification API is not available in this environment")
      return null
    }

    if (!messaging) {
      console.warn("[notifications] FCM messaging is not initialized")
      return null
    }

    const permission = await Notification.requestPermission()

    if (permission !== "granted") {
      console.log("[notifications] Permission denied")
      return null
    }

    const token = await getToken(messaging, {
      // TODO: Replace with your Web Push / FCM VAPID public key.
      vapidKey: "BH9HvvbpFTjIf71jsNsahJoNNeuBVNdbbIYwBDxJfsywU0nepFNErNWElbMmxYGVgcWC1NRrtW4r-tsNQiC6Qvw",
    })

    console.log("FCM Token:", token)
    return token
  } catch (error) {
    console.error("Error getting token:", error)
    return null
  }
}

