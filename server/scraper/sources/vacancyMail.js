import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapeVacancyMail(maxPages = 3) {
  console.log("=== SCRAPING VACANCYMAIL ===");
  const jobs = [];
  const seenTitles = new Set();

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1
      ? "https://vacancymail.co.zw/jobs/"
      : `https://vacancymail.co.zw/jobs/?page=${page}`;

    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120" },
      });
      const $ = cheerio.load(response.data);
      let pageCount = 0;

      $("a.job-listing").each((_, el) => {
        const $el = $(el);
        const href = $el.attr("href") || "";

        if (!/^\/jobs\/[a-z0-9-]+-\d+\/?$/i.test(href)) return;

        const title = $el.find("h3, .job-listing-title, .job-title").first().text().trim()
          || $el.find("h4, h2").first().text().trim();
        if (!title || title.length < 3) return;
        if (seenTitles.has(title.toLowerCase())) return;
        seenTitles.add(title.toLowerCase());

        // Company — try selectors first (usually absent on VacancyMail), else null
        let company =
          $el.find(".company-name, .job-listing-company-name, .company").first().text().trim()
          || null;

        // Reject obvious placeholders so downstream knows it needs enrichment
        if (company && /^(vacancymail|unknown company|unknown)$/i.test(company)) {
          company = null;
        }

        const location =
          $el.find(".job-listing-location, .location, .job-location").first().text().trim()
          || "Zimbabwe";

        const description =
          $el.find(".job-listing-description, .description, .excerpt").first().text().trim()
          || "";

        const salary = $el.find(".job-listing-salary, .salary").first().text().trim() || "";

        const absoluteUrl = `https://vacancymail.co.zw${href}`;

        jobs.push({
          title,
          // Use placeholder so schema (required: true) accepts it, but mark for enrichment
          company: company || "Pending Enrichment",
          location,
          applicationUrl: absoluteUrl,
          source: "VacancyMail",
          sourceUrl: absoluteUrl,
          description,
          salary,
          closingDate: null,
          postedDate: new Date(),
          sourceJobId: `vacancymail-${href.split("/").filter(Boolean).pop()}`,
        });
        pageCount++;
      });

      console.log(`VacancyMail page ${page}: ${pageCount} jobs`);
      if (pageCount === 0) break;
    } catch (error) {
      console.error(`VacancyMail page ${page} error:`, error.message);
      break;
    }
  }

  console.log(`VacancyMail total: ${jobs.length} jobs`);
  return jobs;
}
