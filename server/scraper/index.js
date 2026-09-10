import { scrapeIharareJobs } from "./sources/iharare.js";
import { scrapeVacancyMail } from "./sources/vacancyMail.js";
import { scrapeZimboJobs } from "./sources/zimboJobs.js";
import { normalizeJob, dedupeJobs } from "./normalizer.js";
import ScrapedJob from "../models/ScrapedJob.js";
import { slugify } from "../utils/slugify.js";

export async function runScraper() {
  const startTime = Date.now();
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  🕐 STARTING JOB SCRAPER                         ║");
  console.log(`║  Time: ${new Date().toISOString()}                 ║`);
  console.log("╚══════════════════════════════════════════════════╝");

  const allRawJobs = [];

  console.log("\n📡 Scraping iHarare (5 pages)...");
  const iharareStart = Date.now();
  const iharareJobs = await scrapeIharareJobs(5);
  console.log(`  ✅ iHarare: ${iharareJobs.length} jobs in ${Date.now() - iharareStart}ms`);
  allRawJobs.push(...iharareJobs);

  console.log("\n📡 Scraping VacancyMail (5 pages)...");
  const vmStart = Date.now();
  const vacancyMailJobs = await scrapeVacancyMail(5);
  console.log(`  ✅ VacancyMail: ${vacancyMailJobs.length} jobs in ${Date.now() - vmStart}ms`);
  allRawJobs.push(...vacancyMailJobs);

  console.log("\n📡 Scraping ZimboJobs...");
  const zbStart = Date.now();
  const zimboJobs = await scrapeZimboJobs();
  console.log(`  ✅ ZimboJobs: ${zimboJobs.length} jobs in ${Date.now() - zbStart}ms`);
  allRawJobs.push(...zimboJobs);

  console.log(`\n📊 TOTAL RAW: ${allRawJobs.length} jobs from all sources`);

  const normalizedJobs = allRawJobs.map(job => normalizeJob(job));
  const uniqueJobs = dedupeJobs(normalizedJobs);
  console.log(`🧹 Deduped: ${uniqueJobs.length} unique jobs`);

  let saved = 0;
  let duplicates = 0;

  for (const job of uniqueJobs) {
    try {
      job.slug = slugify(`${job.category || "general"}-${job.title}`);
      const existing = await ScrapedJob.findOne({ fingerprint: job.fingerprint });
      if (existing) { duplicates++; continue; }
      await ScrapedJob.create(job);
      saved++;
    } catch (error) {
      if (error.code === 11000) duplicates++;
      else console.error(`  ❌ Save error: ${error.message}`);
    }
  }

  const totalInDb = await ScrapedJob.countDocuments({});
  const time = Date.now() - startTime;
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log(`║  ✅ SCRAPER COMPLETE                             ║`);
  console.log(`║  New jobs saved:    ${saved.toString().padEnd(29)}║`);
  console.log(`║  Duplicates skipped: ${duplicates.toString().padEnd(28)}║`);
  console.log(`║  Total in database:  ${totalInDb.toString().padEnd(28)}║`);
  console.log(`║  Time: ${time}ms${' '.repeat(40 - String(time).length)}║`);
  console.log("╚══════════════════════════════════════════════════╝\n");

  return { saved, duplicates, total: totalInDb };
}
