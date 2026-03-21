import { useEffect, useRef } from "react"
import Layout from "./components/Layout"
import AIChatButton from "./components/AIChatButton"
import { syncQueue } from "./services/offlineService"

export default function App() {
  const requestedRef = useRef(false)

  useEffect(() => {
    // Keep StrictMode duplicate guard for app-level one-time work.
    if (requestedRef.current) return
    requestedRef.current = true

    const handleOnline = () => {
      syncQueue()
    }

    window.addEventListener("online", handleOnline)
    syncQueue()

    return () => {
      window.removeEventListener("online", handleOnline)
    }
  }, [])

  return (
    <>
      <Layout />
      <AIChatButton />
    </>
  )
}
