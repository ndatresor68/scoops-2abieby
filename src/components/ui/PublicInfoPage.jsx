export default function PublicInfoPage({ title, intro, sections = [], actions = null }) {
  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.intro}>{intro}</p>
        {actions ? <div style={styles.actions}>{actions}</div> : null}
      </div>

      <div style={styles.grid}>
        {sections.map((section) => (
          <section key={section.heading} style={styles.card}>
            <h2 style={styles.cardTitle}>{section.heading}</h2>
            {section.content.map((paragraph) => (
              <p key={paragraph} style={styles.paragraph}>
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  hero: {
    padding: "28px 32px",
    borderRadius: 24,
    background: "linear-gradient(135deg, rgba(122,31,31,0.08) 0%, rgba(255,255,255,0.98) 100%)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
  },
  title: {
    margin: 0,
    fontSize: "clamp(28px, 4vw, 40px)",
    color: "#0f172a",
    lineHeight: 1.1,
  },
  intro: {
    margin: "12px 0 0",
    maxWidth: 760,
    color: "#475569",
    lineHeight: 1.7,
    fontSize: 15,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 18,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  },
  card: {
    padding: 22,
    borderRadius: 20,
    background: "#ffffff",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    boxShadow: "0 14px 30px rgba(15, 23, 42, 0.05)",
  },
  cardTitle: {
    margin: 0,
    marginBottom: 12,
    fontSize: 18,
    color: "#0f172a",
  },
  paragraph: {
    margin: 0,
    color: "#475569",
    lineHeight: 1.7,
  },
}
