import axios from "axios";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import ScrapedJob from "../models/ScrapedJob.js";
import { aiExtractJobFields } from "./aiExtract.js";

// Limit to 5 concurrent requests
const limit = pLimit(5);

// Extract company name from <title> patterns:
//   "Job Title - Company Name | Site"
//   "Job Title | Company Name - Site"
//   "Company Name is hiring Job Title"
function extractCompanyFromTitle(titleStr) {
  if (!titleStr) return null;
  // Strip site suffix
  let t = titleStr.replace(/\s*[|\-–—]\s*(Vacancy\s*Mail|iHarare(\s*Jobs)?|ZimboJobs|Zimbabwe).*$/i, "").trim();

  // "Title - Company"
  let m = t.match(/^.+?\s+[-–—]\s+(.+)$/);
  if (m) {
    const candidate = m[1].replace(/\s+/g, " ").trim();
    if (candidate.length >= 3 && candidate.length <= 80) return candidate;
  }

  // "Company is hiring ..."
  m = titleStr.match(/^(.+?)\s+(?:is|are)\s+hiring/i);
  if (m) return m[1].replace(/\s+/g, " ").trim();

  // "Company seeks/requires ..."
  m = titleStr.match(/^(.+?)\s+(?:seeks|requires|invites)/i);
  if (m) return m[1].replace(/\s+/g, " ").trim();

  // "at Company Name"
  m = titleStr.match(/\bat\s+([A-Z][A-Za-z0-9&\s\.\-]{2,60})$/);
  if (m) return m[1].trim();

  return null;
}

// Extract full details from a job's detail page
async function fetchJobDetails(job) {
  try {
    const response = await axios.get(job.sourceUrl, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const $ = cheerio.load(response.data);

    const details = {
      description: "",
      requirements: [],
      responsibilities: [],
      salary: "",
      closingDate: null,
      applicationEmail: "",
      employmentType: "",
      company: null
    };

    // Company extraction from <title> — fallback when listing has "Unknown Company"
    try {
      const titleMatch = response.data.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        const extracted = extractCompanyFromTitle(titleMatch[1].trim());
        if (extracted) {
          details.company = extracted;
        }
      }
    } catch (e) {
      // silent
    }

    const url = job.sourceUrl;

    if (url.includes("ihararejobs.com")) {
      // iHarare detail page extraction
      const mainContent = $(".job-description, .job-details, article, main").first();
      details.description = mainContent.find("p").map((_, el) => $(el).text().trim()).get().join("\n\n").substring(0, 5000);
      
      mainContent.find("li").each((_, el) => {
        const text = $(el).text().trim();
        if (text.toLowerCase().includes("requirement") || text.toLowerCase().includes("qualif")) {
          details.requirements.push(text);
        } else if (text.toLowerCase().includes("responsib") || text.toLowerCase().includes("duties")) {
          details.responsibilities.push(text);
        }
      });

      const emailMatch = response.data.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) details.applicationEmail = emailMatch[0];
    } else if (url.includes("vacancymail.co.zw")) {
      // VacancyMail detail page
      const body = $(".job-description, .job-details, .content, article, main").first();
      details.description = body.find("p").map((_, el) => $(el).text().trim()).get().join("\n\n").substring(0, 5000);
      
      // Fallback: full body text
      if (!details.description) {
        details.description = $("body").text().substring(0, 3000).replace(/\s+/g, " ").trim();
      }

      const emailMatch = response.data.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) details.applicationEmail = emailMatch[0];

      // Try to extract requirements / responsibilities
      $("ul li, ol li").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 15 && text.length < 300) {
          if (text.toLowerCase().includes("requir") || text.toLowerCase().includes("qualif")) {
            details.requirements.push(text);
          } else {
            details.responsibilities.push(text);
          }
        }
      });
    } else if (url.includes("zimbojobs.com")) {
      // ZimboJobs detail page - uses __next_f payloads
      const pushes = [...response.data.matchAll(/self\.__next_f\.push\(\[1,"(.+?)"\]\)/gs)];
      const combined = pushes.map(m => {
        try { return JSON.parse(`"${m[1]}"`); } catch { return ""; }
      }).join("");

      // Try multiple fields: description, jobDescription, about, details
      const descMatch = combined.match(/"(?:description|jobDescription|about|details|summary)":"(.*?)"/s);
      if (descMatch) {
        details.description = descMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
          .substring(0, 5000);
      }

      // Extract requirements if present
      const reqMatch = combined.match(/"requirements":"(.*?)"/s);
      if (reqMatch) {
        details.requirements = reqMatch[1].split(/\\n|•|·/).map(s => s.trim()).filter(s => s.length > 5);
      }

      // Extract responsibilities
      const respMatch = combined.match(/"responsibilities":"(.*?)"/s);
      if (respMatch) {
        details.responsibilities = respMatch[1].split(/\\n|•|·/).map(s => s.trim()).filter(s => s.length > 5);
      }

      // Fallback: use a larger snippet from the payload
      if (!details.description) {
        const titleMatch = combined.match(new RegExp(`"title":"${job.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, "i"));
        if (titleMatch) {
          const idx = combined.indexOf(titleMatch[0]);
          const snippet = combined.substring(idx, idx + 2000);
          // Find any long text blocks
          const textMatch = snippet.match(/\$\d+, "([^"]{100,})"/);
          if (textMatch) details.description = textMatch[1].substring(0, 5000);
        }
      }
    }

    return details;
  } catch (error) {
    console.error(`  ⚠️  Enrich failed for ${job.title}:`, error.message);
    return null;
  }
}

export async function enrichJobs({ onlyMissing = true, limit_count = 30 } = {}) {
  const startTime = Date.now();
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  🔍 ENRICHING JOB DETAILS                        ║");
  console.log("╚══════════════════════════════════════════════════╝");

  try {
    // Find jobs to enrich
    const query = onlyMissing
      ? {
          $or: [
            { description: { $exists: false } },
            { description: "" },
            { description: { $regex: /^\s*$/ } },
            { $expr: { $lt: [{ $strLenCP: { $ifNull: ["$description", ""] } }, 300] } }
          ]
        }
      : {};
    const jobsToEnrich = await ScrapedJob.find(query).limit(limit_count);
    console.log(`📋 Found ${jobsToEnrich.length} jobs to enrich`);

    let enriched = 0;
    let failed = 0;

    await Promise.all(
      jobsToEnrich.map(job => limit(async () => {
        const details = await fetchJobDetails(job);
        if (details) {
          if (details.description) job.description = details.description;
          if (details.requirements.length) job.requirements = details.requirements;
          if (details.responsibilities.length) job.responsibilities = details.responsibilities;
          if (details.salary) job.salary = details.salary;
          if (details.closingDate) job.closingDate = details.closingDate;
          if (details.applicationEmail) job.applicationEmail = details.applicationEmail;
          if (details.employmentType) job.employmentType = details.employmentType;
          // Only overwrite company if we don't have one OR it's "Unknown Company"
          if (details.company && (!job.company || job.company === "Unknown Company" || job.company.trim() === "")) {
            console.log(`  🏢 Company fixed (regex): "${job.company}" → "${details.company}"`);
            job.company = details.company;
          }

          // ── AI EXTRACTION — when company is bad OR missing fields ──
          const companyBad =
            !job.company ||
            job.company === "Unknown Company" ||
            /\b(POSTS?|Positions?)\b/i.test(job.company) ||
            /^DEPARTMENT OF/i.test(job.company) ||
            job.company.length < 2;

          const needsAI = companyBad || !job.category || job.category === "General" || !job.closingDate;

          if (needsAI) {
            try {
              const ai = await aiExtractJobFields({
                title: job.title,
                location: job.location,
                source: job.source,
                description: (details.description || job.description || ""),
              });
              if (ai) {
                if (ai.company && companyBad) {
                  console.log(`  🤖 AI company: "${job.company}" → "${ai.company}"`);
                  job.company = ai.company;
                }
                if (ai.category && (!job.category || job.category === "General")) job.category = ai.category;
                if (ai.closingDate && !job.closingDate) job.closingDate = ai.closingDate;
                if (ai.salary && !job.salary) job.salary = ai.salary;
                if (ai.applicationEmail && !job.applicationEmail) job.applicationEmail = ai.applicationEmail;
              }
            } catch (e) {
              console.warn(`  ⚠️ AI extract failed for ${job.title}:`, e.message);
            }
          }

          job.lastChecked = new Date();
          await job.save();
          enriched++;
          console.log(`  ✅ ${job.title.substring(0, 50)}`);
        } else {
          // Detail fetch failed (404, timeout) — run AI extraction on partial data anyway
          try {
            const companyBad =
              !job.company ||
              job.company === "Unknown Company" ||
              /\b(POSTS?|Positions?)\b/i.test(job.company) ||
              /^DEPARTMENT OF/i.test(job.company) ||
              (job.company || "").length < 2;
            const needsAI = companyBad || !job.category || job.category === "General" || !job.closingDate;
            if (needsAI) {
              const ai = await aiExtractJobFields({
                title: job.title,
                location: job.location,
                source: job.source,
                description: job.description || "",
              });
              if (ai) {
                if (ai.company && companyBad) {
                  console.log(`  🤖 AI company (no detail): "${job.company}" → "${ai.company}"`);
                  job.company = ai.company;
                }
                if (ai.category && (!job.category || job.category === "General")) job.category = ai.category;
                if (ai.closingDate && !job.closingDate) job.closingDate = ai.closingDate;
                if (ai.salary && !job.salary) job.salary = ai.salary;
                if (ai.applicationEmail && !job.applicationEmail) job.applicationEmail = ai.applicationEmail;
                job.lastChecked = new Date();
                await job.save();
                enriched++;
              } else {
                failed++;
              }
            } else {
              job.lastChecked = new Date();
              await job.save();
            }
          } catch (e) {
            console.warn(`  ⚠️ AI fallback failed for ${job.title}:`, e.message);
            failed++;
          }
        }
      }))
    );

    const time = Date.now() - startTime;
    console.log("╔══════════════════════════════════════════════════╗");
    console.log(`║  ✅ ENRICH COMPLETE                              ║`);
    console.log(`║  Enriched: ${enriched.toString().padEnd(36)}║`);
    console.log(`║  Failed:   ${failed.toString().padEnd(36)}║`);
    console.log(`║  Time: ${time}ms${' '.repeat(40 - String(time).length)}║`);
    console.log("╚══════════════════════════════════════════════════╝");

    return { enriched, failed };
  } catch (error) {
    console.error("Enrich error:", error.message);
    return { enriched: 0, failed: 0 };
  }
}
