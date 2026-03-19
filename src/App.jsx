import { useEffect, useRef } from "react"
import Layout from "./components/Layout"

export default function App() {
  const requestedRef = useRef(false)

  useEffect(() => {
    // Keep StrictMode duplicate guard for app-level one-time work.
    if (requestedRef.current) return
    requestedRef.current = true
  }, [])

  return <Layout />
}
