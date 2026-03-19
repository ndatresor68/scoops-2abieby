import { useEffect, useRef } from "react"
import Layout from "./components/Layout"
import { requestNotificationPermission } from "./notifications"

export default function App() {
  const requestedRef = useRef(false)

  useEffect(() => {
    // Client-side only; avoid duplicate prompts in StrictMode/dev
    if (requestedRef.current) return
    requestedRef.current = true

    if (typeof window === "undefined" || typeof Notification === "undefined") return
    // Better UX: only ask if not already granted/denied
    if (Notification.permission === "default") {
      ;(async () => {
        try {
          const result = await requestNotificationPermission()
          console.log("Notification permission result:", result)
        } catch (err) {
          console.warn("[App] Notification permission request failed:", err)
        }
      })()
    }
  }, [])

  return <Layout />
}
