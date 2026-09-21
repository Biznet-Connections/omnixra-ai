import axios from "axios";
import crypto from "crypto";
import RemoteJob from "../../models/RemoteJob.js";

function fp(...parts) {
  return crypto.createHash("md5").update(parts.join("|").toLowerCase()).digest("hex");
}

export async function scrapeRemoteOK() {
  try {
    const res = await axios.get("https://remoteok.com/api", {
      timeout: 25000,
      headers: { "User-Agent": "Omnixra-AI/1.0 (+https://omnixra-ai.com)" },
    });
    const raw = Array.isArray(res.data) ? res.data.slice(1) : [];

    let inserted = 0, updated = 0;
    for (const j of raw) {
      if (!j || !j.id || !j.position || !j.url) continue;
      const sourceJobId = String(j.id);
      const applicationUrl = j.apply_url || j.url;
      const fingerprint = fp("remoteok", sourceJobId, j.position, j.company || "");

      const doc = {
        title: j.position,
        company: j.company || "Unknown Company",
        companyLogo: j.company_logo || j.logo || "",
        location: j.location || "Remote",
        category: (j.tags && j.tags[0]) || "General",
        description: (j.description || "").replace(/<[^>]+>/g, "").slice(0, 5000),
        salary: j.salary_min && j.salary_max ? `$${j.salary_min}-${j.salary_max}/yr` : "",
        salaryMin: j.salary_min || undefined,
        salaryMax: j.salary_max || undefined,
        employmentType: "Full-time",
        tags: (j.tags || []).slice(0, 8),
        applicationUrl,
        sourceUrl: j.url,
        source: "remoteok",
        sourceJobId,
        fingerprint,
        postedDate: j.date ? new Date(j.date) : new Date(),
        dateScraped: new Date(),
        active: true,
      };

      const r = await RemoteJob.updateOne(
        { fingerprint },
        { $set: doc, $setOnInsert: { slug: `${(j.position||"job").toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,40)}-${sourceJobId}` } },
        { upsert: true }
      );
      if (r.upsertedCount) inserted++;
      else if (r.modifiedCount) updated++;
    }
    console.log(`[remoteok] ${inserted} new, ${updated} updated`);
    return { source: "remoteok", inserted, updated, total: raw.length };
  } catch (e) {
    console.error("[remoteok] error:", e.message);
    return { source: "remoteok", error: e.message, total: 0 };
  }
}
