import * as cheerio from "cheerio"

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim()
}

export function parseWorldBankOpportunities(html, sourceUrl) {
  const $ = cheerio.load(html)
  const items = []

  $(".procurement-item, .project-operation, article, .listing-item").each((index, element) => {
    const title = cleanText($(element).find(".title, h2, h3, .project-name, a").first().text())
    if (!title) return

    const description = cleanText(
      $(element).find(".description, .desc, p, .project-operation__summary").first().text(),
    )
    const location = cleanText(
      $(element).find(".location, .country, .project-country, .region").first().text(),
    )
    const deadline = cleanText(
      $(element).find(".deadline, .closing-date, .date, time").first().attr("datetime") ||
        $(element).find(".deadline, .closing-date, .date, time").first().text(),
    )
    const link = $(element).find("a").first().attr("href")

    items.push({
      title,
      description,
      location: location || "Unknown",
      deadline: deadline || null,
      link: link ? new URL(link, sourceUrl).toString() : sourceUrl,
    })
  })

  return items
}
