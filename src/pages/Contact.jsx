import PublicInfoPage from "../components/ui/PublicInfoPage"

export default function Contact() {
  return (
    <PublicInfoPage
      title="Contact"
      intro="Pour toute demande d'information, d'assistance ou de partenariat, vous pouvez joindre directement l'équipe de référence de la plateforme."
      sections={[
        {
          heading: "Coordonnées",
          content: [
            "Email : ndatresor68@gmail.com",
            "Téléphone : 0715887556",
            "WhatsApp : https://wa.me/2250715887555",
          ],
        },
        {
          heading: "Support",
          content: [
            "Les demandes de support technique, d'intégration ou d'accompagnement projet peuvent être envoyées par email ou via WhatsApp.",
          ],
        },
      ]}
    />
  )
}
