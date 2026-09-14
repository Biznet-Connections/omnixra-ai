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
  const text = job?.location
    ? job.location + (job.salary ? " · " + job.salary : "") + " — via Omnixra AI"
    : "Check out this job on Omnixra AI";

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
