// Guest AI rate limit — max 1 chat message per IP per day
const guestChats = new Map(); // key: "ip:YYYY-MM-DD" -> count

function cleanup() {
  const today = new Date().toISOString().slice(0, 10);
  for (const k of guestChats.keys()) {
    if (!k.endsWith(today)) guestChats.delete(k);
  }
}
setInterval(cleanup, 60 * 60 * 1000).unref();

export function checkGuestAiLimit(req) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip;
  const today = new Date().toISOString().slice(0, 10);
  const key = `${ip}:${today}`;
  const count = guestChats.get(key) || 0;
  if (count >= 1) return { allowed: false, count };
  guestChats.set(key, count + 1);
  return { allowed: true, count: count + 1 };
}
