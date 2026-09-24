import Company from "../models/Company.js";

// Normalize — strip suffixes, punctuation, extra spaces
export function normalizeCompanyName(name) {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .replace(/\b(pvt|pty|private|limited|ltd|inc|incorporated|corp|corporation|co|company|group|holdings|holdings limited)\b/gi, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function upsertCompanyFromScraped({ name, location, sourceUrl }) {
  if (!name || typeof name !== "string") return null;
  const clean = name.trim();
  if (clean.length < 2 || clean.length > 100) return null;
  if (clean.toLowerCase() === "unknown company") return null;

  const normalized = normalizeCompanyName(clean);
  if (!normalized || normalized.length < 2) return null;

  try {
    // Try exact normalized match
    let company = await Company.findOne({ normalizedName: normalized });

    // Fallback — case-insensitive exact name match
    if (!company) {
      company = await Company.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(clean)}$`, "i") },
      });
    }

    if (company) {
      // Optionally update — link source if missing
      if (!company.sourceUrl && sourceUrl) {
        company.sourceUrl = sourceUrl;
        await company.save();
      }
      return company._id;
    }

    // Create new
    const created = await Company.create({
      name: clean,
      normalizedName: normalized,
      location: location || null,
      source: "scraped",
      autoAdded: true,
      verified: false,
      sourceUrl: sourceUrl || null,
    });
    return created._id;
  } catch (e) {
    // Race condition — another process created it first
    if (e.code === 11000) {
      const existing = await Company.findOne({ normalizedName: normalized });
      return existing?._id || null;
    }
    console.warn("[upsertCompany] error:", e.message);
    return null;
  }
}
