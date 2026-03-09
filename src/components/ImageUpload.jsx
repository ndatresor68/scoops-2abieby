import { useRef, useState, useEffect } from "react"
import { FaCamera, FaImage, FaXmark } from "react-icons/fa6"
import { useMediaQuery } from "../hooks/useMediaQuery"

export default function ImageUpload({
  label,
  value = "",
  onChange,
  required = false,
  accept = "image/*",
  style = {},
}) {
  const isMobile = useMediaQuery("(max-width: 640px)")
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const [preview, setPreview] = useState("")

  useEffect(() => {
    if (value) {
      setPreview(value)
    } else {
      setPreview("")
    }
  }, [value])

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  function handleFileSelect(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type.startsWith("image/")) {
      const previewUrl = URL.createObjectURL(file)
      setPreview(previewUrl)
      onChange?.(file)
    }
  }

  function handleCameraClick() {
    cameraInputRef.current?.click()
  }

  function handleFileClick() {
    fileInputRef.current?.click()
  }

  function handleRemove() {
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview)
    }
    setPreview("")
    onChange?.(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      {label && (
        <label style={{ fontSize: "13px", color: "#6b7280", fontWeight: 600 }}>
          {label} {required && <span style={{ color: "#dc2626" }}>*</span>}
        </label>
      )}

      {preview ? (
        <div style={previewContainer}>
          <img src={preview} alt="Preview" style={previewImage} />
          <button type="button" onClick={handleRemove} style={removeBtn}>
            <FaXmark />
          </button>
        </div>
      ) : (
        <div style={uploadArea}>
          <div style={uploadButtons}>
            <button
              type="button"
              onClick={handleCameraClick}
              style={uploadBtn}
              title="Prendre une photo"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f3f4f6"
                e.currentTarget.style.borderColor = "#7a1f1f"
                e.currentTarget.style.color = "#7a1f1f"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white"
                e.currentTarget.style.borderColor = "#d1d5db"
                e.currentTarget.style.color = "#6b7280"
              }}
            >
              <FaCamera style={{ fontSize: 20 }} />
              <span style={{ fontSize: isMobile ? "13px" : "12px" }}>Caméra</span>
            </button>
            <button
              type="button"
              onClick={handleFileClick}
              style={uploadBtn}
              title="Choisir un fichier"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f3f4f6"
                e.currentTarget.style.borderColor = "#7a1f1f"
                e.currentTarget.style.color = "#7a1f1f"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white"
                e.currentTarget.style.borderColor = "#d1d5db"
                e.currentTarget.style.color = "#6b7280"
              }}
            >
              <FaImage style={{ fontSize: 20 }} />
              <span style={{ fontSize: isMobile ? "13px" : "12px" }}>Fichier</span>
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        style={{ display: "none" }}
        capture={false}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        style={{ display: "none" }}
        capture="environment"
      />
    </div>
  )
}

const previewContainer = {
  position: "relative",
  width: "100%",
  borderRadius: "12px",
  overflow: "hidden",
  border: "2px solid #e5e7eb",
  background: "#f9fafb",
}

const previewImage = {
  width: "100%",
  height: "auto",
  display: "block",
  maxHeight: "300px",
  objectFit: "contain",
}

const removeBtn = {
  position: "absolute",
  top: 8,
  right: 8,
  border: "none",
  background: "rgba(0,0,0,0.7)",
  color: "white",
  width: 32,
  height: 32,
  borderRadius: "50%",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  transition: "all 0.2s ease",
}

const uploadArea = {
  border: "2px dashed #d1d5db",
  borderRadius: "12px",
  padding: "20px",
  background: "#f9fafb",
  textAlign: "center",
}

const uploadButtons = {
  display: "flex",
  gap: 12,
  justifyContent: "center",
  flexWrap: "wrap",
}

const uploadBtn = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  padding: "16px 20px",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  background: "white",
  cursor: "pointer",
  color: "#6b7280",
  transition: "all 0.2s ease",
  minWidth: "100px",
}

// Note: Hover states are handled inline in the component
