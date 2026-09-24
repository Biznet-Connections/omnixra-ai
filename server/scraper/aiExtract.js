import { askChat } from "../utils/aiProviders.js";

const VALID_CATEGORIES = [
  "Accounting", "IT", "Engineering", "Teaching", "Healthcare", "Sales",
  "Marketing", "Admin", "Driver", "General", "Security", "Construction",
  "Mining", "Agriculture", "Hospitality", "HR", "Finance", "Legal", "NGO"
];

function buildPrompt(job) {
  const desc = (job.description || "").slice(0, 1200);
  return `You are a job posting parser for Zimbabwe. Extract fields from the listing below.

Respond with ONLY valid JSON — no prose, no code fences, no explanation:
{
  "company": "the real hiring employer name or null",
  "category": "one of: ${VALID_CATEGORIES.join(", ")} — or null",
  "closingDate": "YYYY-MM-DD or null",
  "salary": "salary range string or null",
  "applicationEmail": "email or null"
}

Rules:
- company MUST be the hiring organisation, NOT the job title, NOT a department
- If description mentions "within X Pharmacies", company = "X"
- If title says "TEACHING ASSISTANT - DEPARTMENT OF MINING", company should be the university if mentioned, else null
- closingDate: parse from text like "closing 30 Oct 2026", "deadline 15 November", "expires 03 Oct 2026"
- salary: return a range string like "$500-800/mo" if mentioned, else null
- Return null for any field you cannot confidently extract

Listing:
Title: ${job.title}
Location: ${job.location || "unknown"}
Source: ${job.source || "unknown"}
Description: ${desc}`;
}

function parseJsonSafe(str) {
  if (!str) return null;
  let t = String(str).trim();
  t = t.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  // Extract first {...} block
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

export async function aiExtractJobFields(job) {
  try {
    const result = await askChat(
      [
        { role: "system", content: "You are a precise JSON-only job posting parser. Reply with valid JSON only." },
        { role: "user", content: buildPrompt(job) },
      ],
      { temperature: 0.2, maxTokens: 300, jsonMode: true }
    );
    const parsed = parseJsonSafe(result?.text || "");
    if (!parsed) return null;

    // Sanitize
    const out = {};
    if (parsed.company && typeof parsed.company === "string") {
      let c = parsed.company.replace(/\s+/g, " ").trim().slice(0, 80);

      // Sanity filters — reject obvious AI hallucinations
      const badPatterns = [
        /\b(reports? to|based in|located in|working in|harare|bulawayo|mutare|gweru|kwekwe|masvingo)\b/i,
        /^(management|general|operations|services|administration|unknown|n\/?a|null)$/i,
        /\band\b.*\band\b/i,   // too many "and"s — sentence fragments
        /\bthe\b.*\bthe\b/i,  // multiple "the" — not a company name
      ];
      const tooLong = c.split(/\s+/).length > 8;
      const hasSentencePunctuation = /\.\s|\.$/.test(c) && !/\b(pty|ltd|limited|inc|corp|co|company|group|holdings|trust|foundation|council|authority|hospital|university|college|school|institute|bank|insurance|pharmacies|pharmacy)\b/i.test(c);

      const isBad = badPatterns.some((rx) => rx.test(c)) || tooLong || hasSentencePunctuation;

      if (!isBad && c.length >= 2 && c.length <= 70 && c.toLowerCase() !== "unknown company" && c.toLowerCase() !== "null") {
        out.company = c;
      } else {
        console.log(`  🚫 Rejected AI company: "${c}" (isBad=${isBad}, tooLong=${tooLong}, punct=${hasSentencePunctuation})`);
      }
    }
    if (parsed.category && VALID_CATEGORIES.includes(parsed.category)) {
      out.category = parsed.category;
    }
    if (parsed.closingDate && /^\d{4}-\d{2}-\d{2}$/.test(parsed.closingDate)) {
      out.closingDate = new Date(parsed.closingDate);
    }
    if (parsed.salary && typeof parsed.salary === "string") {
      const s = parsed.salary.trim().slice(0, 60);
      if (s && s.toLowerCase() !== "null") out.salary = s;
    }
    if (parsed.applicationEmail && /@/.test(parsed.applicationEmail)) {
      out.applicationEmail = parsed.applicationEmail.trim();
    }
    return out;
  } catch (e) {
    console.warn("[aiExtract] failed:", e.message);
    return null;
  }
}
