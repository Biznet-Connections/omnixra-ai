import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapeVacancyMail() {
  console.log("=== SCRAPING VACANCYMAIL ===");
  const jobs = [];
  
  try {
    const response = await axios.get("https://vacancymail.co.zw/jobs/", {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    
    const $ = cheerio.load(response.data);
    
    $(".job-listing, .job-item, article, .job-card, .vacancy").each((i, el) => {
      const title = $(el).find(".job-title, h2, h3, a").first().text().trim();
      const company = $(el).find(".company, .employer").text().trim() || "Unknown Company";
      const location = $(el).find(".location").text().trim() || "Zimbabwe";
      const link = $(el).find("a").attr("href") || "";
      const description = $(el).find(".description, .excerpt").text().trim() || "";
      const closingDateText = $(el).find(".closing-date, .deadline, .expiry").text().trim();
      
      if (title && !title.includes("Login") && !title.includes("Register")) {
        jobs.push({
          title,
          company,
          location,
          applicationUrl: link.startsWith("http") ? link : `https://vacancymail.co.zw${link}`,
          source: "VacancyMail",
          sourceUrl: `https://vacancymail.co.zw${link}`,
          description,
          closingDate: closingDateText ? new Date(closingDateText) : null,
          sourceJobId: `vacancymail-${i}`
        });
      }
    });
    
    console.log(`VacancyMail: ${jobs.length} jobs found`);
  } catch (error) {
    console.error("VacancyMail scrape error:", error.message);
  }
  
  return jobs;
}
