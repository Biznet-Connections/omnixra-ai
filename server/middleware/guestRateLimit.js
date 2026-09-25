// ── Guest rate limit ──
// 60 requests / minute per IP for unauthenticated users.
// Logged-in users are not limited.

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 60;

const buckets = new Map(); // ip -> { count, resetAt }

function cleanup() {
  const now = Date.now();
  for (const [ip, b] of buckets.entries()) {
    if (now > b.resetAt) buckets.delete(ip);
  }
}

setInterval(cleanup, 5 * 60 * 1000).unref();

export function guestRateLimit(req, res, next) {
  // Skip if user is authenticated (has Authorization header)
  if (req.headers.authorization) return next();

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip;
  const now = Date.now();
  let b = buckets.get(ip);

  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(ip, b);
  }

  b.count++;

  if (b.count > MAX_REQUESTS) {
    res.set("Retry-After", Math.ceil((b.resetAt - now) / 1000));
    return res.status(429).json({ message: "Too many requests. Please slow down or sign in." });
  }

  next();
}

export default guestRateLimit;
