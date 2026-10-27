import axios from "axios";
import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Parse JSON-LD JobPosting block from raw HTML.
 * VacancyMail embeds raw newlines inside JSON strings — sanitize first.
 */
export function extractJobPostingJsonLd(html) {
  const blocks = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ].map((m) => m[1]);

  for (const raw of blocks) {
    // Replace control chars (newlines/tabs inside strings) with a space
    const cleaned = raw
      .replace(/[\u0000-\u001F\u007F]/g, (c) =>
        c === "\n" || c === "\r" || c === "\t" ? " " : ""
      )
      .trim();

    try {
      const data = JSON.parse(cleaned);
      const arr = Array.isArray(data) ? data : [data];
      for (const item of arr) {
        if (item && item["@type"] === "JobPosting") return item;
      }
    } catch {
      // try next block
    }
  }
  return null;
}

/**
 * VacancyMail date format: "Sept. 23, 2026, 12:20 p.m." or "Oct. 1, 2026"
 */
export function parseVacancyDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  const m = s.match(/([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) return null;

  const [, monStr, day, year] = m;
  const months = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  };
  const month = months[monStr.toLowerCase().replace(".", "")];
  if (month === undefined) return null;

  return new Date(Date.UTC(Number(year), month, Number(day), 12, 0, 0));
}

/**
 * Fetch a VacancyMail detail page and return clean JSON-LD extracted fields.
 * Company is intentionally NOT extracted (JSON-LD says "VacancyMail" which is wrong).
 * Returns null if no JSON-LD found or page too short.
 */
export async function enrichFromVacancyMailJsonLd(sourceUrl) {
  if (!sourceUrl) return null;

  const res = await axios.get(sourceUrl, {
    timeout: 20000,
    headers: { "User-Agent": UA },
    maxRedirects: 5,
  });

  const html = res.data || "";
  const ld = extractJobPostingJsonLd(html);
  if (!ld) return null;

  const out = {
    _source: "jsonld",
  };

  // Clean description
  if (ld.description && typeof ld.description === "string") {
    const d = ld.description.replace(/\s+/g, " ").trim();
    if (d.length > 30) out.description = d.slice(0, 5000);
  }

  // Dates
  const posted = parseVacancyDate(ld.datePosted);
  if (posted) out.postedDate = posted;

  const closing = parseVacancyDate(ld.validThrough);
  if (closing) out.closingDate = closing;

  // Salary
  let sal = ld.baseSalary;
  if (sal && typeof sal === "object") {
    sal = sal?.value?.value ?? sal?.value ?? null;
  }
  if (sal && typeof sal === "string" && sal.trim() && sal.trim().toUpperCase() !== "TBA") {
    out.salary = sal.trim().slice(0, 80);
  }

  // Location
  const addr = ld.jobLocation?.address;
  if (addr) {
    const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry]
      .filter(Boolean);
    const loc = [...new Set(parts)].join(", ");
    if (loc) out.location = loc.slice(0, 120);
  }

  return out;
}
