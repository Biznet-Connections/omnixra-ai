import { scrapeIharareJobs } from "./sources/iharare.js";
import { scrapeVacancyMail } from "./sources/vacancyMail.js";
import { scrapeZimboJobs } from "./sources/zimboJobs.js";
import { normalizeJob, dedupeJobs } from "./normalizer.js";
import ScrapedJob from "../models/ScrapedJob.js";
import { slugify } from "../utils/slugify.js";
import { matchJobsToUsers } from "../utils/notifyBatcher.js";

/**
 * Enrich a single VacancyMail job: JSON-LD first (free/clean), AI fallback.
 */
async function enrichVacancyMailJob(doc) {
  const { enrichFromVacancyMailJsonLd } = await import("./vacancyMailJsonLd.js");
  const { aiEnrichScrapedJob } = await import("./aiEnrichScrapedJob.js");

  let patch = {};
  let usedJsonLd = false;
  let usedAi = false;

  // ── 1. JSON-LD (0 AI cost) ──
  try {
    const ld = await enrichFromVacancyMailJsonLd(doc.sourceUrl);
    if (ld) {
      if (ld.description) patch.description = ld.description;
      if (ld.postedDate) patch.postedDate = ld.postedDate;
      if (ld.closingDate) patch.closingDate = ld.closingDate;
      if (ld.salary) patch.salary = ld.salary;
      if (ld.location) patch.location = ld.location;
      usedJsonLd = true;
    }
  } catch (e) {
    console.warn("[vacancymail-jsonld] failed:", e.message);
  }

  // ── 2. AI — for company + requirements + responsibilities ──
  try {
    const ai = await aiEnrichScrapedJob(doc);
    if (ai) {
      if (ai.company && (!doc.company || /^(pending enrichment|unknown company)$/i.test(doc.company))) {
        patch.company = ai.company;
      }
      if (ai.description) patch.description = ai.description; // AI's version is richer
      if (ai.requirements?.length) patch.requirements = ai.requirements;
      if (ai.responsibilities?.length && ai.responsibilities[0] !== "Job Related") {
        patch.responsibilities = ai.responsibilities;
      }
      if (ai.closingDate && !patch.closingDate) patch.closingDate = ai.closingDate;
      if (ai.salary && !patch.salary) patch.salary = ai.salary;
      if (ai.applicationEmail) patch.applicationEmail = ai.applicationEmail;
      if (ai.employmentType) patch.employmentType = ai.employmentType;
      usedAi = true;
    }
  } catch (e) {
    console.warn("[vacancymail-ai] failed:", e.message);
  }

  // ── 3. Company final fallback ──
  if (!patch.company && (!doc.company || /^(pending enrichment|unknown company)$/i.test(doc.company))) {
    patch.company = "Confidential Employer";
  }

  patch.enriched = true;
  patch.enrichedAt = new Date();
  patch.enrichmentSource = usedJsonLd && usedAi ? "jsonld+ai" : usedJsonLd ? "jsonld" : usedAi ? "ai" : null;
  patch.lastChecked = new Date();

  return patch;
}

/**
 * Generic AI-only enrichment for non-VacancyMail jobs (Iharare, Zimbo, etc.)
 */
async function enrichGenericJob(doc) {
  const { aiEnrichScrapedJob } = await import("./aiEnrichScrapedJob.js");
  try {
    const ai = await aiEnrichScrapedJob(doc);
    if (!ai) return null;
    const patch = {};
    if (ai.company && (!doc.company || /^(pending enrichment|unknown company)$/i.test(doc.company))) patch.company = ai.company;
    if (ai.description) patch.description = ai.description;
    if (ai.requirements?.length) patch.requirements = ai.requirements;
    if (ai.responsibilities?.length) patch.responsibilities = ai.responsibilities;
    if (ai.closingDate) patch.closingDate = ai.closingDate;
    if (ai.salary) patch.salary = ai.salary;
    if (ai.applicationEmail) patch.applicationEmail = ai.applicationEmail;
    if (ai.employmentType) patch.employmentType = ai.employmentType;
    if (!patch.company && (!doc.company || /^(pending enrichment|unknown company)$/i.test(doc.company))) {
      patch.company = "Confidential Employer";
    }
    patch.enriched = true;
    patch.enrichedAt = new Date();
    patch.enrichmentSource = "ai";
    patch.lastChecked = new Date();
    return patch;
  } catch (e) {
    console.warn("[generic-ai] failed:", e.message);
    return null;
  }
}

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
      const created = await ScrapedJob.create(job);
      saved++;

      // Auto-enrich in background (don't block the scrape)
      (async () => {
        try {
          const isVacancyMail = created.source === "VacancyMail";
          const patch = isVacancyMail
            ? await enrichVacancyMailJob(created)
            : await enrichGenericJob(created);

          if (patch && Object.keys(patch).length > 0) {
            await ScrapedJob.updateOne({ _id: created._id }, { $set: patch });
            console.log(`  ✨ enriched [${created.source}]: ${created.title} → ${patch.enrichmentSource || "none"}`);
          }
        } catch (e) {
          console.warn("[auto-enrich] failed:", e.message);
        }
      })();
    } catch (error) {
      if (error.code === 11000) duplicates++;
      else console.error(`  ❌ Save error: ${error.message}`);
    }
  }

  // ── Legacy auto-enrich pass (kept for safety) ──
  let enrichResult = { enriched: 0, failed: 0 };
  try {
    const { enrichJobs } = await import("./enrichJobs.js");
    console.log("\n🔎 Auto-enriching remaining jobs missing company/details...");
    enrichResult = await enrichJobs({ onlyMissing: true, limit_count: 40 });
    console.log(`🔎 Enrichment pass: ${enrichResult.enriched} fixed, ${enrichResult.failed} failed`);
  } catch (e) {
    console.warn("Auto-enrich pass failed:", e.message);
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

  return { saved, duplicates, total: totalInDb, enriched: enrichResult.enriched, enrichFailed: enrichResult.failed };
}
