import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapeZimboJobs() {
  console.log("=== SCRAPING ZIMBOJOBS ===");
  const jobs = [];
  
  try {
    const response = await axios.get("https://zimbojobs.com/jobs/", {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    
    const $ = cheerio.load(response.data);
    
    $(".job-listing, .job-item, article, .job-card").each((i, el) => {
      const title = $(el).find(".job-title, h2, h3, a").first().text().trim();
      const company = $(el).find(".company, .employer").text().trim() || "Unknown Company";
      const location = $(el).find(".location").text().trim() || "Zimbabwe";
      const link = $(el).find("a").attr("href") || "";
      const description = $(el).find(".description, .excerpt").text().trim() || "";
      
      if (title && !title.includes("Login") && !title.includes("Register")) {
        jobs.push({
          title,
          company,
          location,
          applicationUrl: link.startsWith("http") ? link : `https://zimbojobs.com${link}`,
          source: "ZimboJobs",
          sourceUrl: `https://zimbojobs.com${link}`,
          description,
          sourceJobId: `zimbojobs-${i}`
        });
      }
    });
    
    console.log(`ZimboJobs: ${jobs.length} jobs found`);
  } catch (error) {
    console.error("ZimboJobs scrape error:", error.message);
  }
  
  return jobs;
}
