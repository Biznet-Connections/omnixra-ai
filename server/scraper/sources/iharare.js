import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapeIharareJobs() {
  console.log("=== SCRAPING IHARARE JOBS ===");
  const jobs = [];
  
  try {
    const response = await axios.get("https://ihararejobs.com/jobs/", {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    
    const $ = cheerio.load(response.data);
    
    $(".job-listing, .job-item, article, .job-card").each((i, el) => {
      const title = $(el).find(".job-title, h2, h3").text().trim();
      const company = $(el).find(".company, .employer").text().trim() || "Unknown Company";
      const location = $(el).find(".location").text().trim() || "Zimbabwe";
      const link = $(el).find("a").attr("href") || "";
      const description = $(el).find(".description, .excerpt").text().trim() || "";
      const closingDateText = $(el).find(".closing-date, .deadline").text().trim();
      
      if (title) {
        jobs.push({
          title,
          company,
          location,
          applicationUrl: link.startsWith("http") ? link : `https://ihararejobs.com${link}`,
          source: "iHarare Jobs",
          sourceUrl: `https://ihararejobs.com${link}`,
          description,
          closingDate: closingDateText ? new Date(closingDateText) : null,
          sourceJobId: `iharare-${i}`
        });
      }
    });
    
    console.log(`iHarare: ${jobs.length} jobs found`);
  } catch (error) {
    console.error("iHarare scrape error:", error.message);
  }
  
  return jobs;
}
