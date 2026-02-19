import { useState } from "react"
import { supabase } from "./supabaseClient"

export default function Login({ onLogin }) {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  async function handleLogin(e) {
    e.preventDefault()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setError("Email ou mot de passe incorrect")
    } else {
      onLogin(data.user)
    }
  }

  return (
    <div style={backgroundStyle}>
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <h2 style={titleStyle}>Connexion</h2>

          <form onSubmit={handleLogin} style={{ width: "100%" }}>

            {/* EMAIL */}
            <div style={inputContainerStyle}>
              <span style={iconStyle}>👤</span>
              <input
                type="email"
                placeholder="Entrez votre email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            {/* PASSWORD */}
            <div style={{ ...inputContainerStyle, marginTop: 20 }}>
              <span style={iconStyle}>🔒</span>
              <input
                type="password"
                placeholder="Entrez votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <button type="submit" style={buttonStyle}>
              Se connecter
            </button>

            {error && (
              <p style={errorStyle}>{error}</p>
            )}

          </form>
        </div>
      </div>
    </div>
  )
}

const backgroundStyle = {
  backgroundImage: "url('/cacao.jpg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  height: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
}

const overlayStyle = {
  backdropFilter: "blur(5px)",
  width: "100%",
  height: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
}

const cardStyle = {
  backgroundColor: "rgba(255,255,255,0.95)",
  padding: 45,
  borderRadius: 18,
  width: 420,
  boxShadow: "0 15px 35px rgba(0,0,0,0.25)"
}

const titleStyle = {
  marginBottom: 25,
  textAlign: "center",
  fontSize: 22
}

const inputContainerStyle = {
  display: "flex",
  alignItems: "center",
  backgroundColor: "#f5f5f5",
  borderRadius: 10,
  padding: "12px 15px"
}

const iconStyle = {
  marginRight: 10,
  fontSize: 18
}

const inputStyle = {
  border: "none",
  background: "transparent",
  outline: "none",
  width: "100%",
  fontSize: 14
}

const buttonStyle = {
  marginTop: 30,
  width: "100%",
  padding: 14,
  backgroundColor: "#5b2c1f",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 15,
  fontWeight: "bold"
}

const errorStyle = {
  marginTop: 15,
  color: "red",
  textAlign: "center"
}