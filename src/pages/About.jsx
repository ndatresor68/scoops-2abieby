import PublicInfoPage from "../components/ui/PublicInfoPage"

export default function About() {
  return (
    <PublicInfoPage
      title="À propos"
      intro="SCOOP ASAB COOP-CA est une plateforme de gestion cooperative pensée pour structurer les activités cacao et café, suivre les appels d'offres et améliorer la prise de décision."
      sections={[
        {
          heading: "Gestion filière",
          content: [
            "La plateforme centralise les opérations liées au cacao et au café pour aider les coopératives à piloter leurs centres, leurs agents et leurs producteurs.",
          ],
        },
        {
          heading: "Appels d'offres",
          content: [
            "Le module d'appels d'offres collecte et classe des opportunités pertinentes afin d'identifier plus vite les marchés intéressants.",
          ],
        },
        {
          heading: "Aide à la décision",
          content: [
            "Des analyses intelligentes et des indicateurs métier permettent de prioriser les meilleures opportunités et d'améliorer la réactivité commerciale.",
          ],
        },
      ]}
    />
  )
}
