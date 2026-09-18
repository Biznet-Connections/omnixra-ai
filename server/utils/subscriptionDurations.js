/**
 * Subscription durations resolved from env vars.
 * Test mode: 3/5/10 minutes
 * Production: 4320/10080/43200 minutes (3/7/30 days)
 */

function parseMinutes(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getDurationMinutes(type) {
  switch (type) {
    case "starter_biweekly":
      return parseMinutes(process.env.SUBSCRIPTION_STARTER_MINUTES, 3);
    case "plus_biweekly":
      return parseMinutes(process.env.SUBSCRIPTION_PLUS_MINUTES, 5);
    case "pro_monthly":
      return parseMinutes(process.env.SUBSCRIPTION_PRO_MINUTES, 10);
    default:
      return 0;
  }
}

export function getExpiresAt(type, from = new Date()) {
  const mins = getDurationMinutes(type);
  return new Date(from.getTime() + mins * 60 * 1000);
}

export function getTierFromType(type) {
  if (type === "starter_biweekly") return "starter";
  if (type === "plus_biweekly") return "plus";
  if (type === "pro_monthly") return "pro";
  return "none";
}

export function getWarningThreshold() {
  const t = parseFloat(process.env.EXPIRY_WARNING_THRESHOLD);
  return Number.isFinite(t) && t > 0 && t < 1 ? t : 0.5;
}
