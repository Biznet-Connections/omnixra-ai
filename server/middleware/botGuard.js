// ── Bot Guard ──
// Blocks known scrapers, AI crawlers, and suspicious behavior.
// Whitelists Google, social preview bots, and normal browsers.

const ALLOWED_BOT_UA = [
  /googlebot/i,
  /google-inspectiontool/i,
  /googleimage/i,
  /googleother/i,
  /bingbot/i,
  /bingpreview/i,
  /duckduckbot/i,
  /applebot(?!-extended)/i,
  /yandex/i,
  /baiduspider/i,
  // Social/link preview
  /facebookexternalhit/i,
  /facebookcatalog/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /slackbot/i,
  /discordbot/i,
  /pinterest/i,
  /embedly/i,
  /quora link preview/i,
  /vkshare/i,
  /w3c_validator/i,
  // Uptime monitors (add as needed)
  /uptimerobot/i,
  /pingdom/i,
];

const BLOCKED_BOT_UA = [
  // AI training crawlers
  /gptbot/i,
  /chatgpt-user/i,
  /claudebot/i,
  /claude-web/i,
  /anthropic-ai/i,
  /perplexitybot/i,
  /ccbot/i,
  /bytespider/i,
  /amazonbot/i,
  /applebot-extended/i,
  /meta-externalagent/i,
  /cohere-ai/i,
  /diffbot/i,
  /imagesiftbot/i,
  // SEO tools
  /ahrefsbot/i,
  /semrushbot/i,
  /mj12bot/i,
  /dotbot/i,
  /dataforseobot/i,
  /petalbot/i,
  /blexbot/i,
  /serpstatbot/i,
  // Generic scrapers
  /scrapy/i,
  /nutch/i,
  /httrack/i,
  /^wget/i,
  /^curl/i,
  /python-requests/i,
  /python-urllib/i,
  /go-http-client/i,
  /java\/\d/i,
  /libwww-perl/i,
  /node-fetch/i,
  /axios/i,
  /okhttp/i,
  // Vulnerability scanners
  /nikto/i,
  /sqlmap/i,
  /nmap/i,
  /masscan/i,
  /zgrab/i,
  /nessus/i,
  /acunetix/i,
];

// Honeypot paths — real users never hit these; bots always do
const HONEYPOT_PATHS = [
  /^\/wp-admin/i,
  /^\/wp-login/i,
  /^\/wp-content/i,
  /^\/xmlrpc\.php/i,
  /^\/\.env/i,
  /^\/\.git/i,
  /^\/\.aws/i,
  /^\/admin\.php/i,
  /^\/phpmyadmin/i,
  /^\/config\.json$/i,
  /^\/config\.php$/i,
  /^\/vendor/i,
  /^\/backup/i,
];

// In-memory block list — bans repeat offenders for N minutes
const bannedIps = new Map();
const BAN_DURATION_MS = 60 * 60 * 1000; // 1 hour

function isBanned(ip) {
  const until = bannedIps.get(ip);
  if (!until) return false;
  if (Date.now() > until) {
    bannedIps.delete(ip);
    return false;
  }
  return true;
}

function banIp(ip, reason) {
  console.warn(`[botGuard] BANNING ${ip} for 1h — reason: ${reason}`);
  bannedIps.set(ip, Date.now() + BAN_DURATION_MS);
}

export function botGuard(req, res, next) {
  const ua = req.headers["user-agent"] || "";
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip;

  // 1. Already banned?
  if (isBanned(ip)) {
    return res.status(403).send("Forbidden");
  }

  // 2. Honeypot paths — insta-ban
  if (HONEYPOT_PATHS.some((rx) => rx.test(req.path))) {
    banIp(ip, "honeypot path: " + req.path);
    return res.status(404).send("Not found");
  }

  // 3. Empty/suspicious user agent
  if (!ua || ua.length < 8) {
    banIp(ip, "empty or short UA");
    return res.status(403).send("Forbidden");
  }

  // 4. Whitelist: allow Google, social, monitors
  if (ALLOWED_BOT_UA.some((rx) => rx.test(ua))) {
    return next();
  }

  // 5. Block list: deny known scrapers/AI crawlers
  if (BLOCKED_BOT_UA.some((rx) => rx.test(ua))) {
    console.warn(`[botGuard] blocked UA on ${req.path}: ${ua.slice(0, 80)}`);
    return res.status(403).send("Forbidden");
  }

  // 6. Allow everything else (real browsers)
  return next();
}

export default botGuard;
