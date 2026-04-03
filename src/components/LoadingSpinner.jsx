import React from 'react'

/**
 * Lightweight loading spinner pour mobile
 * Sans animations lourdes pour ne pas bloquer le rendu
 */
export default function LoadingSpinner() {
  return (
    <div style={containerStyle}>
      <div style={spinnerStyle}>
        <div style={dotsStyle}>
          <span style={dotStyle} />
          <span style={dotStyle} />
          <span style={dotStyle} />
        </div>
      </div>
      <p style={textStyle}>Chargement...</p>
    </div>
  )
}

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '200px',
  width: '100%',
  gap: '16px',
}

const spinnerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
}

const dotsStyle = {
  display: 'flex',
  gap: '4px',
}

const dotStyle = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#7a1f1f',
  opacity: 0.6,
  animation: 'pulse 1.4s infinite',
}

// Ajouter les styles d'animation au document
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes pulse {
      0%, 80%, 100% { opacity: 0.4; }
      40% { opacity: 1; }
    }
  `
  document.head.appendChild(style)
}
