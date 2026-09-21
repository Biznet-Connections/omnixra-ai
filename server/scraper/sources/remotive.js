import axios from "axios";
import crypto from "crypto";
import RemoteJob from "../../models/RemoteJob.js";

function fp(...parts) {
  return crypto.createHash("md5").update(parts.join("|").toLowerCase()).digest("hex");
}

export async function scrapeRemotive() {
  try {
    const res = await axios.get("https://remotive.com/api/remote-jobs?limit=50", {
      timeout: 25000,
      headers: { "User-Agent": "Omnixra-AI/1.0 (+https://omnixra-ai.com)" },
    });
    const raw = res.data?.jobs || [];

    let inserted = 0, updated = 0;
    for (const j of raw) {
      if (!j || !j.id || !j.title || !j.url) continue;
      const sourceJobId = String(j.id);
      const fingerprint = fp("remotive", sourceJobId, j.title, j.company_name || "");

      const doc = {
        title: j.title,
        company: j.company_name || "Unknown Company",
        companyLogo: j.company_logo || "",
        location: j.candidate_required_location || "Remote",
        category: j.category || "General",
        description: (j.description || "").replace(/<[^>]+>/g, "").slice(0, 5000),
        salary: j.salary || "",
        employmentType: j.job_type || "Full-time",
        tags: (j.tags || []).slice(0, 8),
        applicationUrl: j.url,
        sourceUrl: j.url,
        source: "remotive",
        sourceJobId,
        fingerprint,
        postedDate: j.publication_date ? new Date(j.publication_date) : new Date(),
        dateScraped: new Date(),
        active: true,
      };

      const r = await RemoteJob.updateOne(
        { fingerprint },
        { $set: doc, $setOnInsert: { slug: `${(j.title||"job").toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,40)}-${sourceJobId}` } },
        { upsert: true }
      );
      if (r.upsertedCount) inserted++;
      else if (r.modifiedCount) updated++;
    }
    console.log(`[remotive] ${inserted} new, ${updated} updated`);
    return { source: "remotive", inserted, updated, total: raw.length };
  } catch (e) {
    console.error("[remotive] error:", e.message);
    return { source: "remotive", error: e.message, total: 0 };
  }
}
