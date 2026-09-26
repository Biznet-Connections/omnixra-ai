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
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120" },
      });
      const $ = cheerio.load(response.data);
      let pageCount = 0;

      // VacancyMail: each job is <a class="job-listing" href="/jobs/slug-NUMBER/">
      $("a.job-listing").each((_, el) => {
        const $el = $(el);
        const href = $el.attr("href") || "";

        // MUST match real URL pattern: /jobs/slug-NUMBER/
        if (!/^\/jobs\/[a-z0-9-]+-\d+\/?$/i.test(href)) return;

        // Title — usually in h3 inside the details div
        const title = $el.find("h3, .job-listing-title, .job-title").first().text().trim()
          || $el.find("h4, h2").first().text().trim();
        if (!title || title.length < 3) return;
        if (seenTitles.has(title.toLowerCase())) return;
        seenTitles.add(title.toLowerCase());

        // Company — usually has a company-name or logo sibling
        let company =
          $el.find(".company-name, .job-listing-company-name, .company").first().text().trim()
          || "";

        // Fallback: find the company name in the details block
        if (!company) {
          const detailsText = $el.find(".job-listing-details").text().trim();
          // Look for "at Company" or a capitalized name after the title
          const lines = detailsText.split("\n").map(s => s.trim()).filter(Boolean);
          for (const line of lines) {
            if (line.toLowerCase() !== title.toLowerCase() && /^[A-Z]/.test(line) && line.length > 2 && line.length < 80) {
              company = line;
              break;
            }
          }
        }
        company = (company || "Unknown Company").replace(/\s+/g, " ").trim().substring(0, 80);

        // Location
        const location =
          $el.find(".job-listing-location, .location, .job-location").first().text().trim()
          || "Zimbabwe";

        // Description (short snippet from listing)
        const description =
          $el.find(".job-listing-description, .description, .excerpt").first().text().trim()
          || $el.text().substring(0, 400).replace(/\s+/g, " ").trim();

        // Salary / date snippets if present
        const salary = $el.find(".job-listing-salary, .salary").first().text().trim() || "";

        const absoluteUrl = `https://vacancymail.co.zw${href}`;

        jobs.push({
          title,
          company,
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
