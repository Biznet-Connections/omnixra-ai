import axios from "axios";
import crypto from "crypto";
import RemoteJob from "../../models/RemoteJob.js";

function fp(...parts) {
  return crypto.createHash("md5").update(parts.join("|").toLowerCase()).digest("hex");
}

export async function scrapeHimalayas() {
  try {
    const res = await axios.get("https://himalayas.app/jobs/api?limit=50", {
      timeout: 25000,
      headers: { "User-Agent": "Omnixra-AI/1.0 (+https://omnixra-ai.com)" },
    });
    const raw = res.data?.jobs || res.data?.data || [];

    let inserted = 0, updated = 0;
    for (const j of raw) {
      const id = j.id || j.slug || j.guid;
      if (!id || !j.title) continue;
      const sourceJobId = String(id);
      const applicationUrl = j.applicationLink || j.url || `https://himalayas.app/jobs/${id}`;
      const fingerprint = fp("himalayas", sourceJobId, j.title, j.companyName || j.company?.name || "");

      const doc = {
        title: j.title || j.jobTitle,
        company: j.companyName || j.company?.name || "Unknown Company",
        companyLogo: j.companyLogo || j.company?.logo || "",
        location: Array.isArray(j.locationRestrictions) && j.locationRestrictions.length
          ? j.locationRestrictions.join(", ")
          : "Remote",
        category: j.category || "General",
        description: (j.description || j.jobDescription || "").replace(/<[^>]+>/g, "").slice(0, 5000),
        salary: j.minSalary && j.maxSalary ? `$${j.minSalary}-${j.maxSalary}/yr` : "",
        salaryMin: j.minSalary || undefined,
        salaryMax: j.maxSalary || undefined,
        employmentType: j.employmentType || "Full-time",
        tags: (j.tags || []).slice(0, 8),
        applicationUrl,
        sourceUrl: j.url || `https://himalayas.app/jobs/${id}`,
        source: "himalayas",
        sourceJobId,
        fingerprint,
        postedDate: j.pubDate ? new Date(j.pubDate) : new Date(),
        dateScraped: new Date(),
        active: true,
      };

      const r = await RemoteJob.updateOne(
        { fingerprint },
        { $set: doc, $setOnInsert: { slug: `${(doc.title||"job").toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,40)}-${sourceJobId}` } },
        { upsert: true }
      );
      if (r.upsertedCount) inserted++;
      else if (r.modifiedCount) updated++;
    }
    console.log(`[himalayas] ${inserted} new, ${updated} updated`);
    return { source: "himalayas", inserted, updated, total: raw.length };
  } catch (e) {
    console.error("[himalayas] error:", e.message);
    return { source: "himalayas", error: e.message, total: 0 };
  }
}
