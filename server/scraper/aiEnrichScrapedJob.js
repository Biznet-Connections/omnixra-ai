import axios from "axios";
import * as cheerio from "cheerio";
import { askChat } from "../utils/aiProviders.js";

// Strip HTML → clean text
function htmlToText(html) {
  try {
    const $ = cheerio.load(html);
    // Remove scripts, styles, nav, footer
    $("script, style, nav, footer, header, noscript, iframe").remove();
    // Get main content text
    const text = $("body").text() || "";
    return text.replace(/\s+/g, " ").trim().slice(0, 5000);
  } catch {
    return "";
  }
}

// Extract structured data from raw page text via AI
async function aiExtractFromText({ text, title, company, source }) {
  const prompt = `You are a job posting parser for Zimbabwe. Extract structured data from this raw page text.

Respond with ONLY valid JSON (no prose, no fences):
{
  "description": "clean 2-3 paragraph role summary (NO junk, NO nav links, 400-800 chars)",
  "requirements": ["req1", "req2", ...],
  "responsibilities": ["duty1", "duty2", ...],
  "closingDate": "YYYY-MM-DD or null",
  "salary": "salary range or TBA or null",
  "applicationEmail": "email or null",
  "employmentType": "Full-time / Part-time / Contract / Internship or null"
}

CRITICAL — STRIP ALL OF THESE FROM description:
- Navigation: "Search for CVs", "Jobseeker Register", "Employer Register", "Login", "Sign Up"
- Site chrome: "Ads by google", "Similar Jobs", "Browse Candidates", "Add Resume"
- Footer: "Terms and Privacy Policy", "Expires DD MMM YYYY" (repeated), "Other Jobs in same location"
- Job meta: "Job Type", "Salary", "Expiry Date", "Date Posted" — move these OUT of description
- Repeated text from sidebars

DESCRIPTION must be ONLY:
- 2-3 clean paragraphs describing what the role is
- Written naturally, as if summarizing the job for a candidate
- No bullet points, no headers, just prose

RULES:
- requirements: qualification/education/experience bullets (each 3-200 chars)
- responsibilities: duty/task bullets (each 3-200 chars)
- If requirements/responsibilities are missing from text, return []
- closingDate: parse dates like "closing 30 Oct 2026", "Expires 01 Oct 2026"
- Return valid JSON ONLY

Job: ${title} at ${company} (source: ${source})

RAW PAGE TEXT:
${text}`;

  const result = await askChat(
    [
      { role: "system", content: "You are a precise JSON-only job parser. Reply with valid JSON only." },
      { role: "user", content: prompt },
    ],
    { temperature: 0.2, maxTokens: 800, jsonMode: true }
  );

  let raw = result?.text || "";
  raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

// Main: enrich a scraped job by fetching its detail page
export async function aiEnrichScrapedJob(job) {
  const url = job.sourceUrl || job.applicationUrl;
  if (!url) return null;

  try {
    const response = await axios.get(url, {
      timeout: 20000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
      },
      maxRedirects: 5,
    });

    const text = htmlToText(response.data);
    if (!text || text.length < 200) {
      console.warn("[aiEnrich] page too short:", url);
      return null;
    }

    const ai = await aiExtractFromText({
      text,
      title: job.title,
      company: job.company,
      source: job.source,
    });

    if (!ai) return null;

    // Sanitize
    const out = {};
    if (ai.description && typeof ai.description === "string" && ai.description.length > 50) {
      out.description = ai.description.slice(0, 5000);
    }
    if (Array.isArray(ai.requirements)) {
      out.requirements = ai.requirements.map((s) => String(s).trim()).filter((s) => s.length > 3 && s.length < 300).slice(0, 20);
    }
    if (Array.isArray(ai.responsibilities)) {
      out.responsibilities = ai.responsibilities.map((s) => String(s).trim()).filter((s) => s.length > 3 && s.length < 300).slice(0, 20);
    }
    if (ai.closingDate && /^\d{4}-\d{2}-\d{2}$/.test(ai.closingDate)) {
      out.closingDate = new Date(ai.closingDate);
    }
    if (ai.salary && typeof ai.salary === "string") {
      out.salary = ai.salary.trim().slice(0, 80);
    }
    if (ai.applicationEmail && /@/.test(ai.applicationEmail)) {
      out.applicationEmail = ai.applicationEmail.trim();
    }
    if (ai.employmentType && typeof ai.employmentType === "string") {
      out.employmentType = ai.employmentType.trim().slice(0, 40);
    }

    return out;
  } catch (e) {
    console.warn("[aiEnrich] failed for", url, ":", e.message);
    return null;
  }
}
