import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, Polyline, Polygon, Marker, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix pour les icônes Leaflet avec Vite
import icon from "leaflet/dist/images/marker-icon.png"
import iconShadow from "leaflet/dist/images/marker-shadow.png"
import iconRetina from "leaflet/dist/images/marker-icon-2x.png"

const DefaultIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

/**
 * Composant pour centrer la carte sur la position actuelle
 * Se met à jour automatiquement quand la position change
 */
function MapCenter({ center, zoom, currentUserPosition }) {
  const map = useMap()
  
  useEffect(() => {
    // Prioriser la position de l'utilisateur si disponible
    const targetCenter = currentUserPosition 
      ? [currentUserPosition.lat, currentUserPosition.lng]
      : center
    
    if (targetCenter) {
      map.setView(targetCenter, zoom || map.getZoom())
    }
  }, [center, zoom, map, currentUserPosition])
  
  return null
}

/**
 * Composant pour suivre les clics sur la carte (optionnel)
 */
function MapClickHandler({ onClick }) {
  useMapEvents({
    click: (e) => {
      if (onClick) {
        onClick(e.latlng)
      }
    },
  })
  return null
}

/**
 * Composant de carte Leaflet pour afficher les parcelles
 * 
 * @param {Object} props
 * @param {Array} props.trackPoints - Points GPS du tracé en cours
 * @param {Array} props.polygon - Polygone fermé de la parcelle
 * @param {Array} props.parcelles - Liste des parcelles à afficher
 * @param {Object} props.center - Centre initial de la carte [lat, lng]
 * @param {Number} props.zoom - Niveau de zoom initial
 * @param {Function} props.onMapClick - Callback lors d'un clic sur la carte
 * @param {Boolean} props.fullScreen - Mode plein écran pour mobile
 */
export default function ParcelMap({
  trackPoints = [],
  polygon = null,
  parcelles = [],
  center = [5.3600, -4.0083], // Côte d'Ivoire par défaut
  zoom = 17,
  maxZoom = 19,
  onMapClick = null,
  fullScreen = false,
  currentUserPosition = null, // Position GPS actuelle de l'utilisateur
}) {
  const mapRef = useRef(null)

  // Convertir les points de tracking en format Leaflet
  const trackLatLngs = trackPoints.map((pt) => [pt.lat, pt.lng])

  // Style pour la ligne de tracking
  const trackLineStyle = {
    color: "#3b82f6",
    weight: 4,
    opacity: 0.8,
  }

  // Style pour le polygone final
  const polygonStyle = {
    color: "#10b981",
    weight: 3,
    opacity: 0.8,
    fillColor: "#10b981",
    fillOpacity: 0.2,
  }

  // Style pour les polygones des parcelles existantes
  const parcelleStyle = {
    color: "#7a1f1f",
    weight: 2,
    opacity: 0.7,
    fillColor: "#7a1f1f",
    fillOpacity: 0.15,
  }

  return (
    <div
      style={{
        width: "100%",
        height: fullScreen ? "100vh" : "500px",
        position: fullScreen ? "fixed" : "relative",
        top: fullScreen ? 0 : "auto",
        left: fullScreen ? 0 : "auto",
        zIndex: fullScreen ? 9999 : "auto",
        background: "#f3f4f6",
      }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        maxZoom={maxZoom}
        style={{ width: "100%", height: "100%", zIndex: 1 }}
        scrollWheelZoom={true}
        zoomControl={true}
        ref={mapRef}
      >
        {/* Carte satellite Esri World Imagery */}
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        
        <MapCenter center={center} zoom={zoom} currentUserPosition={currentUserPosition} />
        
        {onMapClick && <MapClickHandler onClick={onMapClick} />}

        {/* Marqueur GPS utilisateur actuel */}
        {currentUserPosition && (
          <Marker
            position={[currentUserPosition.lat, currentUserPosition.lng]}
            icon={L.icon({
              iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="12" fill="#3b82f6" opacity="0.3"/>
                  <circle cx="16" cy="16" r="8" fill="#3b82f6" opacity="0.6"/>
                  <circle cx="16" cy="16" r="4" fill="#3b82f6"/>
                </svg>
              `),
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            })}
          />
        )}

        {/* Ligne de tracking en temps réel */}
        {trackLatLngs.length > 1 && (
          <Polyline positions={trackLatLngs} pathOptions={trackLineStyle} />
        )}

        {/* Polygone final de la parcelle mesurée */}
        {polygon && polygon.length > 2 && (
          <Polygon positions={polygon} pathOptions={polygonStyle} />
        )}

        {/* Polygones des parcelles existantes */}
        {parcelles.map((parcelle) => {
          if (!parcelle.coordonnees) return null
          
          try {
            const coords = JSON.parse(parcelle.coordonnees)
            if (!Array.isArray(coords) || coords.length < 3) return null

            const latLngs = coords.map((c) => [c.lat || c[0], c.lng || c[1]])
            
            return (
              <Polygon
                key={parcelle.id}
                positions={latLngs}
                pathOptions={parcelleStyle}
                eventHandlers={{
                  click: () => {
                    // Popup avec infos de la parcelle
                    const popup = L.popup()
                      .setLatLng(latLngs[0])
                      .setContent(`
                        <div style="padding: 8px;">
                          <strong>${parcelle.code_parcelle || "N/A"}</strong><br/>
                          Producteur: ${parcelle.producteur_nom || "N/A"}<br/>
                          Centre: ${parcelle.centre_nom || "N/A"}<br/>
                          Superficie: ${parcelle.superficie || 0} ha
                        </div>
                      `)
                      .openOn(mapRef.current)
                  },
                }}
              />
            )
          } catch (err) {
            console.error(`[ParcelMap] Error parsing coordinates for parcelle ${parcelle.id}:`, err)
            return null
          }
        })}
      </MapContainer>
    </div>
  )
}
