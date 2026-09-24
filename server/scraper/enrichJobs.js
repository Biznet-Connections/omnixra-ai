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
      // ── iHarare: proper extraction using .single-candidate-widget structure ──

      // 1. COMPANY — from the employer link in the h4 area
      const employerLink = $("h4 a[href*='/employers/'], .job-details-meta a[href*='/employers/']").first();
      if (employerLink.length) {
        const text = employerLink.text().trim().replace(/\s+/g, " ");
        if (text && text.length >= 2 && text.length <= 80) {
          details.company = text;
        }
      }

      // 2. HEADER DESCRIPTION — from the initial job-details-meta paragraph
      const headerMeta = $(".job-details-meta").first().find("p").first().text().trim();
      const headerBits = [];
      if (headerMeta) headerBits.push(headerMeta);

      // 3. ALL .single-candidate-widget SECTIONS — duties, quals, how-to-apply
      const widgets = $(".single-candidate-widget");
      const widgetBlocks = [];

      widgets.each((idx, widget) => {
        const heading = $(widget).find("h3").first().text().trim();
        const headingLower = heading.toLowerCase();
        const paragraphs = $(widget).find("p").toArray()
          .map((el) => $(el).text().trim())
          .filter((s) => s.length > 0);

        // Detect heading type
        const isDuties = headingLower.includes("duties") || headingLower.includes("responsib");
        console.log(`    [w${idx}] h="${heading}" | p=${paragraphs.length} | duties=${isDuties} | hasBullet=${paragraphs.some(p => p.includes("\u2022"))}`);
        const isQuals = headingLower.includes("qualif") || headingLower.includes("experience") || headingLower.includes("requirement");
        const isHowTo = headingLower.includes("how to apply") || headingLower.includes("application");

        // Parse bullets — the source uses <br>• text<br> format inside <p>
        const parseBullets = (text) => {
          return text
            .split(/•/)
            .map((s) => s.trim())
            .filter((s) => s.length > 3 && s.length < 400);
        };

        paragraphs.forEach((p) => {
          if (isDuties) {
            parseBullets(p).forEach((item) => details.responsibilities.push(item));
          } else if (isQuals) {
            parseBullets(p).forEach((item) => details.requirements.push(item));
            // Try closing date in quals/experience paragraph
            const dm = p.match(/closing date[^.]*?(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/i);
            if (dm && !details.closingDate) {
              const d = new Date(dm[1].replace(/(\d+)(st|nd|rd|th)/, "$1"));
              if (!isNaN(d)) details.closingDate = d;
            }
          } else if (isHowTo) {
            details.howToApply = (details.howToApply ? details.howToApply + "\n\n" : "") + p;
          }
        });

        // Add entire widget to the full description
        if (heading || paragraphs.length) {
          widgetBlocks.push(`${heading}\n${paragraphs.join("\n\n")}`);
        }
      });

      // 4. ASSEMBLE FULL DESCRIPTION
      const allParts = [...headerBits, ...widgetBlocks].filter(Boolean);
      details.description = allParts.join("\n\n──────────\n\n").substring(0, 8000);

      // 5. CLOSING DATE FALLBACK — from meta "Expires: 21 Sep 2026" or body text
      if (!details.closingDate) {
        const metaExpires = response.data.match(/Expires[:\s]+(\d{1,2}\s+\w+\s+\d{4})/i);
        if (metaExpires) {
          const d = new Date(metaExpires[1]);
          if (!isNaN(d)) details.closingDate = d;
        }
      }

      // 6. APPLICATION EMAIL (if visible on page — Cloudflare hides as [email protected] usually)
      const emailMatch = response.data.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) details.applicationEmail = emailMatch[0];

      // 7. EMPLOYMENT TYPE
      if (/full\s*time/i.test(response.data)) details.employmentType = "Full-time";
      else if (/part\s*time/i.test(response.data)) details.employmentType = "Part-time";

      // 8. DEDUPE — avoid duplicate items across widget loops
      details.requirements = [...new Set(details.requirements)];
      details.responsibilities = [...new Set(details.responsibilities)];
      console.log(`  🔍 iHarare extractor: desc=${details.description.length}c, req=${details.requirements.length}, resp=${details.responsibilities.length}, company="${details.company}"`);
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

export async function enrichJobs({ onlyMissing = true, limit_count = 30, force = false, source = null } = {}) {
  const startTime = Date.now();
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  🔍 ENRICHING JOB DETAILS                        ║");
  console.log("╚══════════════════════════════════════════════════╝");

  try {
    // Build query
    let query;
    if (force) {
      // Force mode — enrich everything (or filter by source)
      query = source ? { source } : {};
    } else if (onlyMissing) {
      query = {
        $or: [
          { description: { $exists: false } },
          { description: "" },
          { description: { $regex: /^\s*$/ } },
          { $expr: { $lt: [{ $strLenCP: { $ifNull: ["$description", ""] } }, 300] } },
          { company: "Unknown Company" },
          { company: /POSTS?|Positions?/i },
          { company: /^DEPARTMENT OF/i },
          { lastChecked: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      };
    } else {
      query = source ? { source } : {};
    }

    // Sort by lastChecked ascending so oldest-stale jobs get priority
    const jobsToEnrich = await ScrapedJob.find(query)
      .sort({ lastChecked: 1, dateScraped: 1 })
      .limit(limit_count);
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
