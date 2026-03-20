import * as cheerio from "cheerio"

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim()
}

export function parseUngmOpportunities(html, sourceUrl) {
  const $ = cheerio.load(html)
  const items = []

  $(".notice-item, .notice, article, .tender-item").each((index, element) => {
    const title = cleanText($(element).find(".title, h2, h3, .notice-title, a").first().text())
    if (!title) return

    const description = cleanText(
      $(element).find(".description, .desc, p, .notice-description").first().text(),
    )
    const location = cleanText(
      $(element).find(".location, .country, .agency-country, .notice-country").first().text(),
    )
    const deadline = cleanText(
      $(element).find(".deadline, .closing-date, .notice-deadline, time").first().attr("datetime") ||
        $(element).find(".deadline, .closing-date, .notice-deadline, time").first().text(),
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
