import express from "express";
import User from "../models/User.js";
import Job from "../models/Job.js";
import Company from "../models/Company.js";
import { slugify } from "../utils/slugify.js";

const router = express.Router();
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
