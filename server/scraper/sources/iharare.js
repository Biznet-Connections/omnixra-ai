import axios from "axios";
import * as cheerio from "cheerio";

const BLOCKLIST = ["location", "category", "job type", "job details", "keywords", "browse jobs", "filter", "search", "links", "other links", "home", "about", "contact", "privacy", "terms", "menu", "navigation"];

export async function scrapeIharareJobs(maxPages = 3) {
  console.log("=== SCRAPING IHARARE JOBS ===");
  const jobs = [];
  const seen = new Set();

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1
      ? "https://ihararejobs.com/jobs/"
      : `https://ihararejobs.com/jobs/?page=${page}`;

    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      const $ = cheerio.load(response.data);
      let pageCount = 0;

      $("h3").each((i, el) => {
        const title = $(el).text().trim();
        if (!title || title.length < 5) return;
        if (BLOCKLIST.some(b => title.toLowerCase().includes(b))) return;
        if (seen.has(title.toLowerCase())) return;
        seen.add(title.toLowerCase());

        const container = $(el).closest("article, .job-listing, .job-card, .job-item, div").first();
        const containerText = container.text() || $(el).parent().parent().text() || "";

        // Location
        let location = "Zimbabwe";
        const locMatch = containerText.match(/(HARARE|Bulawayo|Mutare|Gweru|Kwekwe|Masvingo|Midlands|Mwenezi|Zvishavane|Chinhoyi|Marondera|Norton|Bindura|Hwange|Victoria Falls|Chiredzi|Shurugwi|Nyazura|Chirundu)/i);
        if (locMatch) location = locMatch[1];

        // Company
        let company = "Unknown Company";
        const companyMatch = containerText.match(/([A-Z][A-Za-z\s&\(\)\/\.\,\-]{2,60}(?:Pvt|Ltd|Limited|Corp|Organization|International|University|Ministry|Foundation|Council|Hospital|Bank|Insurance))/);
        if (companyMatch) company = companyMatch[1].replace(/\s+/g, " ").trim().substring(0, 80);

        if (company === "Unknown Company") {
          const knownMatch = containerText.match(/(UNOPS|FAO|Old Mutual|Plan International|CIMAS|Midlands State University|UNICEF|WHO|UNDP|Food and Agriculture Organization)/i);
          if (knownMatch) company = knownMatch[1];
        }

        // Link
        let link = "";
        $(el).find("a").each((_, a) => {
          const href = $(a).attr("href") || "";
          if (href && href !== "/" && !href.startsWith("#") && href.length > 3 && !link) link = href;
        });
        if (!link) {
          container.find("a").each((_, a) => {
            const href = $(a).attr("href") || "";
            if (href && href !== "/" && !href.startsWith("#") && href.length > 3 && !link) link = href;
          });
        }

        const absoluteUrl = link.startsWith("http") ? link : `https://ihararejobs.com${link}`;

        // Deadline
        let closingDate = null;
        const expiresMatch = containerText.match(/Expires\s+(\d{1,2}\s+\w{3}\s+\d{4})/i);
        if (expiresMatch) {
          const d = new Date(expiresMatch[1]);
          if (!isNaN(d)) closingDate = d;
        }

        jobs.push({
          title,
          company,
          location,
          applicationUrl: absoluteUrl,
          source: "iHarare Jobs",
          sourceUrl: absoluteUrl,
          description: containerText.substring(0, 300).replace(/\s+/g, " ").trim(),
          closingDate,
          sourceJobId: `iharare-${title.toLowerCase().replace(/\s+/g, "-").substring(0, 40)}`
        });
        pageCount++;
      });

      console.log(`iHarare page ${page}: ${pageCount} jobs`);
      if (pageCount === 0) break; // no more pages
    } catch (error) {
      console.error(`iHarare page ${page} error:`, error.message);
      break;
    }
  }

  console.log(`iHarare total: ${jobs.length} jobs`);
  return jobs;
}
