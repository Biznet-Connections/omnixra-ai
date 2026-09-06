import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapeVacancyMail() {
  console.log("=== SCRAPING VACANCYMAIL ===");
  const jobs = [];
  
  try {
    // Try multiple URL patterns
    const urls = [
      "https://vacancymail.co.zw/jobs/",
      "https://vacancymail.co.zw/vacancies/",
      "https://vacancymail.co.zw/"
    ];
    
    let html = "";
    for (const url of urls) {
      try {
        const response = await axios.get(url, {
          timeout: 15000,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });
        html = response.data;
        break;
      } catch (e) {
        console.log(`Failed to fetch ${url}: ${e.message}`);
      }
    }
    
    if (!html) return jobs;
    
    const $ = cheerio.load(html);
    
    // Common selectors for job listings
    const selectors = [
      ".job-listing", ".job-item", "article", ".job-card", ".vacancy",
      ".job-listing-item", ".job-list-item", ".job"
    ];
    
    // Use a set to avoid duplicates within this scrape
    const seenTitles = new Set();
    
    $(selectors.join(", ")).each((i, el) => {
      const $el = $(el);
      const title = $el.find(".job-title, h2, h3, a").first().text().trim();
      if (!title || title.length < 3) return;
      if (seenTitles.has(title.toLowerCase())) return;
      seenTitles.add(title.toLowerCase());
      
      const company = $el.find(".company, .employer, .job-company").text().trim() || "Unknown Company";
      const location = $el.find(".location, .job-location").text().trim() || "Zimbabwe";
      const link = $el.find("a").attr("href") || "";
      const description = $el.find(".description, .excerpt, .job-description").text().trim() || "";
      const salary = $el.find(".salary, .job-salary").text().trim() || "";
      const closingDateText = $el.find(".closing-date, .deadline, .expiry, .job-deadline").text().trim();
      const postedDateText = $el.find(".posted-date, .date-posted, .job-date").text().trim();
      
      jobs.push({
        title,
        company,
        location,
        applicationUrl: link.startsWith("http") ? link : `https://vacancymail.co.zw${link}`,
        source: "VacancyMail",
        sourceUrl: `https://vacancymail.co.zw${link}`,
        description,
        salary,
        closingDate: closingDateText ? parseDate(closingDateText) : null,
        postedDate: postedDateText ? parseDate(postedDateText) : new Date(),
        sourceJobId: `vacancymail-${i}`
      });
    });
    
    console.log(`VacancyMail: ${jobs.length} jobs found`);
  } catch (error) {
    console.error("VacancyMail scrape error:", error.message);
  }
  
  return jobs;
}

function parseDate(dateStr) {
  try {
    // Handle common formats: "20/09/2026", "20 September 2026", "2026-09-20"
    const cleaned = dateStr.replace(/(st|nd|rd|th)/gi, "").trim();
    const date = new Date(cleaned);
    return isNaN(date) ? null : date;
  } catch {
    return null;
  }
}
