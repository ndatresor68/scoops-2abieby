import { useEffect, useRef } from "react"
import Layout from "./components/Layout"
import AIChatButton from "./components/AIChatButton"

export default function App() {
  const requestedRef = useRef(false)

  useEffect(() => {
    // Keep StrictMode duplicate guard for app-level one-time work.
    if (requestedRef.current) return
    requestedRef.current = true
  }, [])

  return (
    <>
      <Layout />
      <AIChatButton />
    </>
  )
}
