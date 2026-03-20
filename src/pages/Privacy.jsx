import PublicInfoPage from "../components/ui/PublicInfoPage"

export default function Privacy() {
  return (
    <PublicInfoPage
      title="Politique de confidentialité"
      intro="Cette politique explique quelles données sont collectées dans l'application, comment elles sont utilisées et quelles mesures de sécurité sont mises en place."
      sections={[
        {
          heading: "Données collectées",
          content: [
            "L'application peut collecter des données utilisateurs, des messages, des journaux d'activité et des informations nécessaires au fonctionnement des modules métier.",
          ],
        },
        {
          heading: "Cookies et publicité",
          content: [
            "Des cookies techniques et des services publicitaires comme Google AdSense peuvent être utilisés afin d'améliorer l'expérience et de financer le service.",
          ],
        },
        {
          heading: "Sécurité et confidentialité",
          content: [
            "Les données sont sécurisées via Supabase et ne sont pas revendues à des tiers. Les accès sont limités selon les rôles et les autorisations applicatives.",
          ],
        },
      ]}
    />
  )
}
