import axios from "axios";
import crypto from "crypto";
import RemoteJob from "../../models/RemoteJob.js";

function fp(...parts) {
  return crypto.createHash("md5").update(parts.join("|").toLowerCase()).digest("hex");
}

export async function scrapeArbeitnow() {
  try {
    const res = await axios.get("https://arbeitnow.com/api/job-board-api", {
      timeout: 25000,
      headers: { "User-Agent": "Omnixra-AI/1.0 (+https://omnixra-ai.com)" },
    });
    const raw = (res.data?.data || []).filter((j) => j && j.remote === true);

    let inserted = 0, updated = 0;
    for (const j of raw) {
      if (!j || !j.title || !j.url) continue;
      const sourceJobId = String(j.slug || j.url);
      const fingerprint = fp("arbeitnow", sourceJobId, j.title, j.company_name || "");

      const doc = {
        title: j.title,
        company: j.company_name || "Unknown Company",
        companyLogo: j.company_logo || "",
        location: j.location || "Remote",
        category: (j.tags && j.tags[0]) || "General",
        description: (j.description || "").replace(/<[^>]+>/g, "").slice(0, 5000),
        salary: "",
        employmentType: (j.job_types && j.job_types[0]) || "Full-time",
        tags: (j.tags || []).slice(0, 8),
        applicationUrl: j.url,
        sourceUrl: j.url,
        source: "arbeitnow",
        sourceJobId,
        fingerprint,
        postedDate: j.created_at ? new Date(j.created_at * 1000) : new Date(),
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
    console.log(`[arbeitnow] ${inserted} new, ${updated} updated`);
    return { source: "arbeitnow", inserted, updated, total: raw.length };
  } catch (e) {
    console.error("[arbeitnow] error:", e.message);
    return { source: "arbeitnow", error: e.message, total: 0 };
  }
}
