import express from "express";
import User from "../models/User.js";
import Job from "../models/Job.js";
import Company from "../models/Company.js";
import { slugify } from "../utils/slugify.js";

const router = express.Router();

// ── Bot detection for OG previews ──
const BOT_UA_REGEX = /whatsapp|facebookexternalhit|facebookcatalog|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|googlebot|bingbot|embedly|quora link preview|pinterest|outbrain|vkshare|w3c_validator/i;
const BASE_URL = "https://omnixra-ai.com";

// ── ROBOTS.TXT ──
router.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /

Disallow: /api/
Disallow: /uploads/
Disallow: /share/

Sitemap: ${BASE_URL}/sitemap.xml
`);
});

// ── SITEMAP ──
router.get("/sitemap.xml", async (req, res) => {
  try {
    const staticUrls = [
      { loc: `${BASE_URL}/`,              priority: "1.0", changefreq: "daily"  },
      { loc: `${BASE_URL}/jobs`,          priority: "0.9", changefreq: "daily"  },
      { loc: `${BASE_URL}/companies`,     priority: "0.9", changefreq: "daily"  },
      { loc: `${BASE_URL}/news`,          priority: "0.8", changefreq: "daily"  },
      { loc: `${BASE_URL}/professionals`, priority: "0.8", changefreq: "weekly" },
    ];

    const users = await User.find({ accountType: "jobseeker", discoverable: true })
      .select("name _id").limit(500).lean();
    const userUrls = users.map((u) => {
      const slug = slugify(`${u.name}-${u._id}`).slice(0, 80);
      return { loc: `${BASE_URL}/profile/${slug}`, priority: "0.7", changefreq: "weekly" };
    });

    const jobs = await Job.find({ active: true }).select("slug _id").limit(500).lean();
    const jobUrls = jobs.map((j) => ({
      loc: `${BASE_URL}/jobs/${j.slug || j._id}`, priority: "0.8", changefreq: "daily",
    }));

    const companies = await Company.find().select("name _id").limit(500).lean();
    const companyUrls = companies.map((c) => {
      const slug = slugify(`${c.name}-${c._id}`).slice(0, 80);
      return { loc: `${BASE_URL}/companies/${slug}`, priority: "0.8", changefreq: "weekly" };
    });

    const allUrls = [...staticUrls, ...userUrls, ...jobUrls, ...companyUrls];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    for (const url of allUrls) {
      xml += "  <url>\n";
      xml += `    <loc>${url.loc}</loc>\n`;
      if (url.changefreq) xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      if (url.priority)   xml += `    <priority>${url.priority}</priority>\n`;
      xml += "  </url>\n";
    }
    xml += "</urlset>";

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (error) {
    console.error("Sitemap error:", error);
    res.status(500).send("Error generating sitemap");
  }
});

// ── JOB PREVIEW (OpenGraph rich card) ──
router.get("/jobs/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;

    // Try Job model first (Omnixra jobs)
    let job = null;
    try {
      const Job = (await import("../models/Job.js")).default;
      job = await Job.findOne({ slug }).lean();
    } catch (e) {}

    // Fallback to ScrapedJob
    if (!job) {
      try {
        const ScrapedJob = (await import("../models/ScrapedJob.js")).default;
        job = await ScrapedJob.findOne({ slug }).lean();
      } catch (e) {}
    }

    if (!job) {
      // Not found — send to jobs page
      return res.redirect("/jobs");
    }

    // Build title
    const title = job.title
      ? `${job.title}${job.company && job.company !== "Unknown Company" ? " at " + job.company : ""} | Omnixra AI`
      : "Job on Omnixra AI";

    // Build description
    const metaBits = [];
    if (job.company && job.company !== "Unknown Company") metaBits.push(job.company);
    if (job.location) metaBits.push(job.location);
    if (job.salary) metaBits.push(job.salary);
    if (job.type) metaBits.push(job.type);

    let description = metaBits.join(" · ");
    if (job.description) {
      // Clean the description for OG
      let clean = String(job.description)
        // Strip leading "Expires: <date>" metadata
        .replace(/^\s*Expires[:\s]+[\d\w\s]+?(?=[A-Z]|$)/i, "")
        // Strip any trailing date-only fragments like "Sep 2026" that leak
        .replace(/^\s*[A-Z][a-z]{2}\s+\d{4}\s+/i, "")
        // Remove "job Description" label
        .replace(/\bjob\s*Description\b/gi, "")
        // Fix jammed uppercase: "FUNDVACANCY" → "FUND VACANCY"
        .replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2")
        // Fix ALL-CAPS jammed sequences before common job-posting keywords
        .replace(/(VACANCY|NOTICE|APPLICATION|APPLICATIONS|POSITION|POSITIONS|OPPORTUNITY|CANDIDATES|QUALIFICATIONS|REQUIREMENTS|RESPONSIBILITIES|DEPARTMENT|MINISTRY|AUTHORITY|COMMISSION|CANDIDATE)/g, " $1")
        .replace(/\s{2,}/g, " ")
        // Remove separator bars
        .replace(/[─]{3,}/g, " ")
        // Collapse whitespace
        .replace(/\s+/g, " ")
        .trim();

      // Second pass — remove any "Expires: date" that survived mid-text
      clean = clean.replace(/Expires[:\s]+[\d\w\s]{3,20}(?=\s[A-Z])/gi, "").trim();
      if (clean) {
        description += (description ? " — " : "") + clean.slice(0, 200) + (clean.length > 200 ? "…" : "");
      }
    }
    if (!description) description = "Apply on Omnixra AI — Zimbabwe's employment intelligence platform.";

    // Image — use a branded OG fallback for now
    const image = job.companyLogo || `${BASE_URL}/og-jobs-default.png`;
    const url = `${BASE_URL}/jobs/${slug}`;

    // Escape HTML in title/description
    const esc = (t) => String(t || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

    // ── Non-bot browsers: serve the React app directly, let the client route ──
    const ua = req.headers["user-agent"] || "";
    const isBot = BOT_UA_REGEX.test(ua);

    if (!isBot) {
      // Serve the React shell — the app will read window.location.pathname
      const path = await import("path");
      const { fileURLToPath } = await import("url");
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const indexPath = path.join(__dirname, "..", "..", "frontend", "dist", "index.html");
      return res.sendFile(indexPath);
    }

    // ── Bots: serve rich OG HTML ──
    const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:site_name" content="Omnixra AI" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
<link rel="canonical" href="${esc(url)}" />
</head><body></body></html>`;

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "public, max-age=300");
    res.send(html);
  } catch (error) {
    console.error("Job preview error:", error.message);
    res.redirect("/jobs");
  }
});

// ── PROFILE PREVIEW ──
router.get("/profile/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const parts = slug.split("-");
    const userId = parts[parts.length - 1];

    const user = await User.findById(userId).select(
      "name headline category location profilePicture profilePicLocked verified"
    );
    if (!user) return res.status(404).send("<html><body><h1>Profile not found</h1></body></html>");

    const title = `${user.name} — ${user.headline || "Professional"} | Omnixra AI`;
    const description = `${user.name} is a ${user.headline || "Professional"}. Location: ${user.location || "Unknown"}. Category: ${user.category || "General"}. Join Omnixra AI to connect.`;
    const image = user.profilePicture && !user.profilePicLocked ? user.profilePicture : `${BASE_URL}/favicon.svg`;
    const url = `${BASE_URL}/profile/${slug}`;

    const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8" />
<title>${title}</title>
<meta name="description" content="${description}" />
<meta property="og:type" content="profile" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${image}" />
<meta property="og:url" content="${url}" />
<meta property="og:site_name" content="Omnixra AI" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />
<link rel="canonical" href="${url}" />
</head><body>
<script>window.location.href="/user-profile?userId=${userId}";</script>
</body></html>`;

    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error) {
    console.error("Profile preview error:", error);
    res.status(500).send("Error generating profile preview");
  }
});

// ── COMPANY PREVIEW ──
router.get("/companies/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const parts = slug.split("-");
    const companyId = parts[parts.length - 1];

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).send("<html><body><h1>Company not found</h1></body></html>");

    const title = `${company.name} | Omnixra AI`;
    const description = `${company.name} — ${company.industry || "Company"}. Location: ${company.location || "Unknown"}. Discover jobs and connect on Omnixra AI.`;
    const image = `${BASE_URL}/favicon.svg`;
    const url = `${BASE_URL}/companies/${slug}`;

    const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8" />
<title>${title}</title>
<meta name="description" content="${description}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${image}" />
<meta property="og:url" content="${url}" />
<meta property="og:site_name" content="Omnixra AI" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />
<link rel="canonical" href="${url}" />
</head><body>
<script>window.location.href="/companies";</script>
</body></html>`;

    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error) {
    console.error("Company preview error:", error);
    res.status(500).send("Error generating company preview");
  }
});

export default router;
