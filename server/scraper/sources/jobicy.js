import axios from "axios";
import crypto from "crypto";
import RemoteJob from "../../models/RemoteJob.js";

function fp(...parts) {
  return crypto.createHash("md5").update(parts.join("|").toLowerCase()).digest("hex");
}

export async function scrapeJobicy() {
  try {
    const res = await axios.get("https://jobicy.com/api/v2/remote-jobs?count=50", {
      timeout: 25000,
      headers: { "User-Agent": "Omnixra-AI/1.0 (+https://omnixra-ai.com)" },
    });
    const raw = res.data?.jobs || [];

    let inserted = 0, updated = 0;
    for (const j of raw) {
      if (!j || !j.id || !j.jobTitle || !j.url) continue;
      const sourceJobId = String(j.id);
      const fingerprint = fp("jobicy", sourceJobId, j.jobTitle, j.companyName || "");

      const doc = {
        title: j.jobTitle,
        company: j.companyName || "Unknown Company",
        companyLogo: j.companyLogo || "",
        location: j.jobGeo || "Remote",
        category: (j.jobIndustry && j.jobIndustry[0]) || "General",
        description: (j.jobDescription || "").replace(/<[^>]+>/g, "").slice(0, 5000),
        salary: j.annualSalaryMin && j.annualSalaryMax ? `${j.salaryCurrency || "$"}${j.annualSalaryMin}-${j.annualSalaryMax}/yr` : "",
        salaryMin: j.annualSalaryMin || undefined,
        salaryMax: j.annualSalaryMax || undefined,
        currency: j.salaryCurrency || "USD",
        employmentType: (j.jobType && j.jobType[0]) || "Full-time",
        tags: j.jobExcerpt ? [j.jobExcerpt.slice(0, 120)] : [],
        applicationUrl: j.url,
        sourceUrl: j.url,
        source: "jobicy",
        sourceJobId,
        fingerprint,
        postedDate: j.pubDate ? new Date(j.pubDate) : new Date(),
        dateScraped: new Date(),
        active: true,
      };

      const r = await RemoteJob.updateOne(
        { fingerprint },
        { $set: doc, $setOnInsert: { slug: `${(j.jobTitle||"job").toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,40)}-${sourceJobId}` } },
        { upsert: true }
      );
      if (r.upsertedCount) inserted++;
      else if (r.modifiedCount) updated++;
    }
    console.log(`[jobicy] ${inserted} new, ${updated} updated`);
    return { source: "jobicy", inserted, updated, total: raw.length };
  } catch (e) {
    console.error("[jobicy] error:", e.message);
    return { source: "jobicy", error: e.message, total: 0 };
  }
}
