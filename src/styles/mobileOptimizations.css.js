/**
 * Optimisations CSS pour mobile
 * À ajouter dans index.html ou les fichiers CSS globaux
 */

export const MOBILE_OPTIMIZATIONS_CSS = `
/* ==========================================
   OPTIMISATIONS DE PERFORMANCE POUR MOBILE
   ========================================== */

/* Réduire les animations sur batterie faible */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Optimiser les fonts pour mobile */
@font-face {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-weight: 400;
  font-style: normal;
  font-display: swap; /* Afficher le texte immédiatement */
}

/* Utiliser transform pour les animations (GPU-accelerated) */
.animated {
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* Réduire les animations pendant le scroll */
.scroll-container {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch; /* Momentum scrolling sur iOS */
}

/* Optimiser les inputs pour mobile */
input,
textarea,
select {
  font-size: 16px; /* Éviter le zoom au focus sur iOS */
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  -webkit-appearance: none; /* Retirer le style par défaut */
  appearance: none;
}

/* Optimiser les touches pour mobile */
button,
a {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation; /* Réduire le délai de 300ms */
}

/* Optimiser la performance des listes */
.list-container {
  contain: layout style paint;
  will-change: contents;
}

/* Utiliser la contention pour les sections */
section,
article,
aside {
  contain: layout style paint;
}

/* Réduire les ombres sur mobile */
@media (max-width: 768px) {
  * {
    box-shadow: none !important;
  }
  
  .elevated {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12) !important;
  }
}

/* Optimiser le rendu des textes */
body {
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Désactiver les transitions lourdes sur mobile */
@media (max-width: 768px) {
  transition: none !important;
  animation: none !important;
}

/* Optimiser les images pour mobile */
img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Utiliser content-visibility pour les éléments hors écran */
.off-screen-content {
  content-visibility: auto;
}

/* Optimiser la performance du viewport */
html {
  scroll-behavior: smooth;
}

/* Prévenir le layout shift */
img,
video {
  display: block;
  height: auto;
}
`

/**
 * Injection des styles d'optimisation dans le document
 */
export function injectMobileOptimizations() {
  if (typeof document === 'undefined') return

  const style = document.createElement('style')
  style.innerHTML = MOBILE_OPTIMIZATIONS_CSS
  style.id = 'mobile-optimizations'
  document.head.appendChild(style)
}
