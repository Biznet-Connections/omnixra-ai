import { scrapeIharareJobs } from "./sources/iharare.js";
import { scrapeVacancyMail } from "./sources/vacancyMail.js";
import { scrapeZimboJobs } from "./sources/zimboJobs.js";
import { normalizeJob, dedupeJobs } from "./normalizer.js";
import ScrapedJob from "../models/ScrapedJob.js";
import { slugify } from "../utils/slugify.js";
import { askAI } from "../utils/aiService.js";

export async function runScraper() {
  console.log("=== STARTING JOB SCRAPER ===");
  console.log("Time:", new Date().toISOString());

  const allRawJobs = [];

  // Scrape all sources
  const iharareJobs = await scrapeIharareJobs();
  allRawJobs.push(...iharareJobs);

  const vacancyMailJobs = await scrapeVacancyMail();
  allRawJobs.push(...vacancyMailJobs);

  const zimboJobs = await scrapeZimboJobs();
  allRawJobs.push(...zimboJobs);

  console.log(`Total raw jobs found: ${allRawJobs.length}`);

  // Normalize
  const normalizedJobs = allRawJobs.map(job => normalizeJob(job));
  
  // Dedupe
  const uniqueJobs = dedupeJobs(normalizedJobs);
  console.log(`Unique jobs after dedupe: ${uniqueJobs.length}`);

  // Save to database
  let saved = 0;
  let duplicates = 0;

  for (const job of uniqueJobs) {
    try {
      // Add slug
      job.slug = slugify(`${job.category || "general"}-${job.title}`);

      // Check if already exists
      const existing = await ScrapedJob.findOne({ fingerprint: job.fingerprint });
      if (existing) {
        duplicates++;
        continue;
      }

      await ScrapedJob.create(job);
      saved++;
    } catch (error) {
      if (error.code === 11000) {
        duplicates++;
      } else {
        console.error(`Error saving job: ${error.message}`);
      }
    }
  }

  console.log(`Scraper complete: ${saved} new jobs saved, ${duplicates} duplicates skipped`);
  return { saved, duplicates };
}
