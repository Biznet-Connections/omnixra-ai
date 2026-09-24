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
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      const $ = cheerio.load(response.data);
      let pageCount = 0;

      $(".job-listing, .job-item, article, .job-card").each((i, el) => {
        const $el = $(el);
        const title = $el.find(".job-title, h2, h3, a").first().text().trim();
        if (!title || title.length < 3) return;
        if (seenTitles.has(title.toLowerCase())) return;
        seenTitles.add(title.toLowerCase());

        // Company extraction (multi-strategy)
        let company = $el.find(".company, .employer, .job-company, .company-name, .job-employer").text().trim();

        // Strategy 1: "Job Title - Company Name" from h3/h2
        if (!company || company === "Unknown Company") {
          const cardTitle = $el.find("h3, h2, .job-title, .job-listing-title, a").first().text().trim();
          const dashMatch = cardTitle.match(/^.+?\s+[-–—]\s+(.+)$/);
          if (dashMatch) company = dashMatch[1].trim();
        }

        // Strategy 2: regex for company suffixes on the listing text (stripping title first)
        if (!company || company === "Unknown Company") {
          const listingText = ($el.text() || "").replace(title || "", "").trim();
          const match = listingText.match(/([A-Z][A-Za-z0-9&\s\.\-]{2,60}?(?:Investment|Investments|Limited|Ltd|Pvt|Holdings|Corporation|Group|Pharmacy|Pharmacies|Services|Health|Trust|Foundation|Council|Hospital|Bank|Insurance|Company|Enterprises))/);
          if (match) company = match[1].replace(/\s+/g, " ").trim();
        }

        if (!company || company === "Unknown Company") company = "Unknown Company";
        company = company.replace(/\s+/g, " ").trim().substring(0, 80);

        // Final cleanup: if company starts with the job title, strip it
        if (title && company.toLowerCase().startsWith(title.toLowerCase().substring(0, 20))) {
          const cleaned = company.substring(title.length).trim();
          if (cleaned) company = cleaned;
        }

        // Location
        const location = $el.find(".location, .job-location").text().trim() || "Zimbabwe";

        // Description
        const description = $el.find(".description, .excerpt, .job-description").text().trim() || $el.text().substring(0, 300).replace(/\s+/g, " ").trim();

        // Salary
        const salary = $el.find(".salary, .job-salary").text().trim() || "";

        // Dates
        const closingDateText = $el.find(".closing-date, .deadline, .expiry, .job-deadline").text().trim();
        const postedDateText = $el.find(".posted-date, .date-posted, .job-date").text().trim();

        // Link
        let link = $el.find("a.job-listing").attr("href") || "";
        if (!link) {
          const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 30);
          $el.find("a").each((_, a) => {
            const href = $(a).attr("href") || "";
            if (href.includes(slug) && !link) link = href;
          });
        }
        if (!link) {
          $el.find("a").each((_, a) => {
            const href = $(a).attr("href") || "";
            if (href.includes("/jobs/") && href.length > 15 && !link) link = href;
          });
        }
        if (!link) {
          const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          link = `/jobs/${slug}/`;
        }

        const absoluteUrl = link.startsWith("http") ? link : `https://vacancymail.co.zw${link}`;

        jobs.push({
          title,
          company,
          location,
          applicationUrl: absoluteUrl,
          source: "VacancyMail",
          sourceUrl: absoluteUrl,
          description,
          salary,
          closingDate: closingDateText ? parseDate(closingDateText) : null,
          postedDate: postedDateText ? parseDate(postedDateText) : new Date(),
          sourceJobId: `vacancymail-${absoluteUrl.split("/").filter(Boolean).pop()}`
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

function parseDate(dateStr) {
  try {
    const cleaned = dateStr.replace(/(st|nd|rd|th)/gi, "").trim();
    const date = new Date(cleaned);
    return isNaN(date) ? null : date;
  } catch {
    return null;
  }
}
