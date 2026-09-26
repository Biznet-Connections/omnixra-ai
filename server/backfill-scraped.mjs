import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import mongoose from "mongoose";
import ScrapedJob from "./models/ScrapedJob.js";
import { aiEnrichScrapedJob } from "./scraper/aiEnrichScrapedJob.js";

await mongoose.connect(process.env.MONGODB_URI);

// Find jobs missing requirements OR responsibilities
const jobs = await ScrapedJob.find({
  $or: [
    { requirements: { $size: 0 } },
    { requirements: { $exists: false } },
    { responsibilities: { $size: 0 } },
    { responsibilities: { $exists: false } },
    { description: "" },
    { description: { $exists: false } },
    { $expr: { $lt: [{ $strLenCP: { $ifNull: ["$description", ""] } }, 100] } },
  ],
}).limit(100);

console.log(`Found ${jobs.length} jobs to enrich\n`);

let ok = 0, fail = 0;
const CONCURRENCY = 3;
const queue = [...jobs];

async function worker() {
  while (queue.length > 0) {
    const job = queue.shift();
    if (!job) continue;
    try {
      const data = await aiEnrichScrapedJob(job);
      if (data && (data.requirements?.length || data.responsibilities?.length || data.description)) {
        if (data.description) job.description = data.description;
        if (data.requirements?.length) job.requirements = data.requirements;
        if (data.responsibilities?.length) job.responsibilities = data.responsibilities;
        if (data.closingDate) job.closingDate = data.closingDate;
        if (data.salary) job.salary = data.salary;
        if (data.applicationEmail) job.applicationEmail = data.applicationEmail;
        if (data.employmentType) job.employmentType = data.employmentType;
        job.lastChecked = new Date();
        await job.save();
        ok++;
        console.log(`✅ [${ok + fail}/${jobs.length}] ${(job.title || "").slice(0, 45)}`);
      } else {
        fail++;
        console.log(`⚠️ [${ok + fail}/${jobs.length}] ${(job.title || "").slice(0, 45)}`);
      }
    } catch (e) {
      fail++;
      console.error(`❌ ${job.title}:`, e.message);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

console.log(`\n✅ Done. Enriched: ${ok}, Failed: ${fail}`);
await mongoose.disconnect();
process.exit(0);
