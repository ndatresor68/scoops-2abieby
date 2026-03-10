# Cocoa Receipt Component - Setup Guide

## ✅ Component Created

A professional cocoa purchase receipt component has been created at:
`src/components/CocoaReceipt.jsx`

## Features

### Two Identical Sections
- **Top Section**: "Copie Planteur" (Farmer's Copy)
- **Bottom Section**: "Copie Coopérative" (Cooperative Copy)
- Dashed cutting line with "Couper ici" text

### Receipt Content

**Header:**
- Cooperative name: SCOOP ASAB-COOP-CA
- Motto: Union • Discipline • Travail
- Title: Reçu officiel de pesée

**Purchase Information:**
- Date de pesée
- Centre
- Nom de l'agent
- Nom du producteur
- Code producteur

**Purchase Details Table:**
- Type cacao
- Nombre de sacs
- Poids total (kg)
- Prix par kg
- Montant total (FCFA) - Large, bold, centered

**QR Code:**
- Contains: purchase id, producteur code, poids, montant, date
- Centered display

**Footer Message:**
- Respectful message thanking the farmer
- Cooperative values and mission

### Design
- Elegant and clean layout
- Printable format
- Receipt width: 320px
- Green cocoa theme colors (#166534)
- Clear separation between sections

### Export Options
- **Print**: Browser print functionality
- **PDF**: Export to PDF format

## Installation

### Required Dependency

Install the QR code library:

```bash
npm install qrcode
```

### Integration

The component is already integrated into `src/achats.jsx`:

1. **Import added:**
```javascript
import CocoaReceipt from "./components/CocoaReceipt"
import { FaReceipt } from "react-icons/fa"
```

2. **State added:**
```javascript
const [showReceipt, setShowReceipt] = useState(false)
const [selectedAchat, setSelectedAchat] = useState(null)
```

3. **Button added in table:**
- "Reçu" button opens the receipt modal
- "PDF" button generates the old PDF format

4. **Modal added:**
- Displays the receipt component
- Can be closed or printed

## Usage

### Display Receipt

Click the "Reçu" button next to any purchase in the purchases table.

### Print Receipt

1. Click "Reçu" button
2. Click "Imprimer" button in the receipt modal
3. Browser print dialog opens
4. Print or save as PDF

### Export PDF

1. Click "Reçu" button
2. Click "Exporter PDF" button
3. PDF file downloads automatically

## Component Props

```typescript
interface CocoaReceiptProps {
  achat: {
    id: string
    date_pesee?: string
    created_at?: string
    centre_id?: string
    nom_agent?: string
    nom_producteur?: string
    code_producteur?: string
    sacs?: number
    poids?: number
    prix_unitaire?: number
    prix_kg?: number
    montant?: number
  }
  centreNom?: string
  onClose?: () => void
}
```

## PDF Format

The PDF export uses:
- Format: 80mm x 200mm (thermal printer compatible)
- Two sections on same page
- Dashed cutting line
- QR code included
- Green theme colors

## Styling

All styles are inline for easy customization:
- Colors: Green (#166534) for cooperative theme
- Fonts: Helvetica family
- Layout: Centered, clean, professional
- Responsive: Works on mobile and desktop

## Notes

- QR code generation requires `qrcode` library
- If QR code fails, text fallback is displayed
- Receipt is optimized for printing
- Both sections are identical for farmer and cooperative records

## Troubleshooting

### QR Code Not Showing
- Ensure `qrcode` library is installed: `npm install qrcode`
- Check browser console for errors
- Fallback text will display if QR generation fails

### PDF Not Generating
- Check browser console for errors
- Ensure jsPDF is installed (already in dependencies)
- Verify purchase data is complete

### Print Layout Issues
- Use browser print preview to adjust margins
- Ensure "Background graphics" is enabled in print settings
- Receipt is optimized for A4 or thermal printer paper
