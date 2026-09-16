import crypto from "crypto";
import Post from "../models/Post.js";

// Rotating daily focus - cycles through 10 topics so each day is different
const DAILY_FOCUS = [
  "Technology and Digital Skills",
  "Healthcare and Medical Careers",
  "Finance, Banking and Accounting",
  "Engineering and Construction",
  "Sales, Marketing and Customer Success",
  "Education, Training and Academia",
  "Logistics, Transport and Supply Chain",
  "Agriculture and Agribusiness",
  "Remote and Freelance Opportunities",
  "Entrepreneurship and Startups",
];

// Get the focus for today based on day of year
export function getTodayFocus() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return DAILY_FOCUS[dayOfYear % DAILY_FOCUS.length];
}

// Extract keywords and headlines from previous news posts
export async function getRecentNewsTopics(days = 7) {
  try {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recent = await Post.find({
      authorType: "ai",
      deleted: false,
      createdAt: { $gte: cutoff },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("text createdAt")
      .lean();

    const topics = [];
    for (const post of recent) {
      if (!post.text) continue;
      const lines = post.text.split("\n");
      for (const line of lines) {
        const cleaned = line.replace(/^#+\s*/, "").trim();
        if (cleaned.length >= 20 && cleaned.length <= 140) {
          topics.push(cleaned);
        }
      }
      if (topics.length >= 30) break;
    }

    // Deduplicate by normalized form
    const seen = new Set();
    const unique = [];
    for (const t of topics) {
      const key = t.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(t);
      if (unique.length >= 20) break;
    }

    return unique;
  } catch (e) {
    console.warn("[NEWS DEDUPE] fetch error:", e.message);
    return [];
  }
}

// Hash news text to detect exact duplicates
export function hashNews(text) {
  const normalized = String(text || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 500);
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

// Check if a news post with the same hash was made in the last 30 days
export async function isDuplicateNews(newsHash) {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const existing = await Post.findOne({
      authorType: "ai",
      newsHash: newsHash,
      createdAt: { $gte: cutoff },
      deleted: false,
    }).lean();
    return !!existing;
  } catch (e) {
    return false;
  }
}

export default { getTodayFocus, getRecentNewsTopics, hashNews, isDuplicateNews };
