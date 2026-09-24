// Share utility — works on web (navigator.share) + native (Capacitor Share)
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

// Detect if we're running as native app
function isNative() {
  return (
    Capacitor?.isNativePlatform?.() ||
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "file:"
  );
}

// Build the shareable URL for a post
export function buildPostUrl(post) {
  const id = post?._originalId || post?._id;
  if (!id) return "https://omnixra-ai.com";
  return `https://omnixra-ai.com/post/${id}`;
}

// Build the shareable URL for an AI chat
export function buildAIUrl(chatId) {
  if (!chatId) return "https://omnixra-ai.com";
  return `https://omnixra-ai.com/shared-ai/${chatId}`;
}

// ── Main share function ──
// post: { _id, text, author, image, video }
export async function sharePost(post) {
  const url = buildPostUrl(post);
  const authorName = post?.author?.name || "Someone";
  const snippet = (post?.text || "").trim().slice(0, 100);
  const title = `Post by ${authorName}`;
  const text = snippet ? `"${snippet}${snippet.length >= 100 ? "..." : ""}"` : "Check out this post on Omnixra AI";

  if (isNative()) {
    try {
      await Share.share({
        title,
        text,
        url,
        dialogTitle: "Share this post",
      });
      return { shared: true, url };
    } catch (e) {
      // User cancelled or error — fall through to clipboard
      console.warn("Native share cancelled or failed:", e.message);
      return { shared: false, cancelled: true, url };
    }
  }

  // Web
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return { shared: true, url };
    } catch (e) {
      if (e.name === "AbortError") return { shared: false, cancelled: true, url };
    }
  }

  // Fallback: clipboard
  try {
    await navigator.clipboard.writeText(url);
    return { shared: true, url, copiedToClipboard: true };
  } catch (e) {
    return { shared: false, error: e.message, url };
  }
}

// ── Share AI response ──
export async function shareAIResponse(chatId, previewText = "") {
  const url = buildAIUrl(chatId);
  const title = "AI response on Omnixra";
  const text = previewText
    ? `"${previewText.slice(0, 100)}${previewText.length >= 100 ? "..." : ""}" — via Omnixra AI`
    : "Check out this AI response on Omnixra AI";

  if (isNative()) {
    try {
      await Share.share({ title, text, url, dialogTitle: "Share AI response" });
      return { shared: true, url };
    } catch (e) {
      console.warn("Native share cancelled or failed:", e.message);
      return { shared: false, cancelled: true, url };
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return { shared: true, url };
    } catch (e) {
      if (e.name === "AbortError") return { shared: false, cancelled: true, url };
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return { shared: true, url, copiedToClipboard: true };
  } catch (e) {
    return { shared: false, error: e.message, url };
  }
}


// ── Share a job posting ──
export async function shareJob(job) {
  const slug = job?.slug || job?._id;
  const url = slug ? "https://omnixra-ai.com/jobs/" + slug : "https://omnixra-ai.com/jobs";
  const title = job?.title ? job.title + (job.company ? " at " + job.company : "") : "Job on Omnixra";

  // Build a rich multi-line share text
  const lines = [];

  // Line 1: Title
  if (job?.title) lines.push(`📋 ${job.title}`);
  // Line 2: Company
  if (job?.company && job.company !== "Unknown Company") lines.push(`🏢 ${job.company}`);
  // Line 3: Location · Type · Salary
  const metaBits = [];
  if (job?.location) metaBits.push(`📍 ${job.location}`);
  if (job?.type) metaBits.push(`⏱ ${job.type}`);
  if (job?.salary) metaBits.push(`💰 ${job.salary}`);
  if (metaBits.length) lines.push(metaBits.join("  ·  "));

  // Line 4: Deadline
  const deadline = job?.closingDate || job?.deadline;
  if (deadline) {
    const d = new Date(deadline);
    if (!isNaN(d)) lines.push(`📅 Closes ${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`);
  }

  // Short summary — first 180 chars of description, cleaned
  if (job?.description) {
    let summary = String(job.description);
    // Strip leading "Expires: <date>" metadata
    summary = summary.replace(/^\s*Expires[:\s]+[\d\w\s]+?(?=[A-Z]|$)/i, "");
    // Strip trailing date-only fragments like "Sep 2026"
    summary = summary.replace(/^\s*[A-Z][a-z]{2}\s+\d{4}\s+/i, "");
    // Remove "job Description" label
    summary = summary.replace(/\bjob\s*Description\b/gi, "");
    // Fix jammed uppercase
    summary = summary.replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2");
    // Fix ALL-CAPS jammed sequences before common job-posting keywords
    summary = summary.replace(/(VACANCY|NOTICE|APPLICATION|APPLICATIONS|POSITION|POSITIONS|OPPORTUNITY|CANDIDATES|QUALIFICATIONS|REQUIREMENTS|RESPONSIBILITIES|DEPARTMENT|MINISTRY|AUTHORITY|COMMISSION)/g, " $1");
    summary = summary.replace(/\s{2,}/g, " ");
    // Remove separator bars
    summary = summary.replace(/[─]{3,}/g, " ");
    // Collapse whitespace
    summary = summary.replace(/\s+/g, " ").trim();
    // Second pass cleanup
    summary = summary.replace(/Expires[:\s]+[\d\w\s]{3,20}(?=\s[A-Z])/gi, "").trim();

    if (summary) {
      lines.push("");
      lines.push(summary.slice(0, 180) + (summary.length > 180 ? "…" : ""));
    }
  }

  // Source attribution — URL lives in the `url` field only, NOT here
  // (otherwise WhatsApp/Telegram render it twice)
  lines.push("");
  lines.push("— via Omnixra AI 🇿🇼");

  const text = lines.join("\n");

  if (isNative()) {
    try {
      await Share.share({ title, text, url, dialogTitle: "Share this job" });
      return { shared: true, url };
    } catch (e) {
      console.warn("Native share cancelled or failed:", e.message);
      return { shared: false, cancelled: true, url };
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return { shared: true, url };
    } catch (e) {
      if (e.name === "AbortError") return { shared: false, cancelled: true, url };
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return { shared: true, url, copiedToClipboard: true };
  } catch (e) {
    return { shared: false, error: e.message, url };
  }
}

export default { sharePost, shareAIResponse, shareJob, buildPostUrl, buildAIUrl };
