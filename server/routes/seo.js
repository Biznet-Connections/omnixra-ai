import express from "express";
import User from "../models/User.js";
import Job from "../models/Job.js";
import Company from "../models/Company.js";
import { slugify } from "../utils/slugify.js";

const router = express.Router();

// Dynamic Sitemap
router.get("/sitemap.xml", async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const staticUrls = [
      { loc: `${baseUrl}/`, priority: "1.0" },
      { loc: `${baseUrl}/jobs`, priority: "0.9" },
      { loc: `${baseUrl}/companies`, priority: "0.9" },
      { loc: `${baseUrl}/news`, priority: "0.8" },
      { loc: `${baseUrl}/professionals`, priority: "0.8" }
    ];

    // Get all users with public profiles
    const users = await User.find({ accountType: "jobseeker", discoverable: true }).select("name headline category").limit(500);
    const userUrls = users.map(user => {
      const slug = slugify(`${user.name}-${user._id}`.slice(0, 80));
      return {
        loc: `${baseUrl}/profile/${slug}`,
        priority: "0.7"
      };
    });

    // Get all active jobs
    const jobs = await Job.find({ active: true }).select("slug").limit(500);
    const jobUrls = jobs.map(job => ({
      loc: `${baseUrl}/jobs/${job.slug || job._id}`,
      priority: "0.8"
    }));

    // Get all companies
    const companies = await Company.find().select("name").limit(500);
    const companyUrls = companies.map(company => {
      const slug = slugify(`${company.name}-${company._id}`.slice(0, 80));
      return {
        loc: `${baseUrl}/companies/${slug}`,
        priority: "0.8"
      };
    });

    const allUrls = [...staticUrls, ...userUrls, ...jobUrls, ...companyUrls];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    allUrls.forEach(url => {
      xml += `  <url>\n    <loc>${url.loc}</loc>\n    <priority>${url.priority}</priority>\n  </url>\n`;
    });
    xml += '</urlset>';

    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch (error) {
    console.error("Sitemap error:", error);
    res.status(500).send("Error generating sitemap");
  }
});

// Dynamic Profile Preview (OG tags for Google/Facebook/WhatsApp)
router.get("/profile/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    // Extract ID from slug (last part)
    const parts = slug.split("-");
    const userId = parts[parts.length - 1];
    
    const user = await User.findById(userId).select("name headline category location profilePicture profilePicLocked verified");
    if (!user) {
      return res.status(404).send('<html><body><h1>Profile not found</h1></body></html>');
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const title = `${user.name} — ${user.headline || "Professional"} | Omnixra AI`;
    const description = `${user.name} is a ${user.headline || "Professional"}. Location: ${user.location || "Unknown"}. Category: ${user.category || "General"}. Join Omnixra AI to connect.`;
    const image = user.profilePicture && !user.profilePicLocked ? user.profilePicture : `${baseUrl}/favicon.svg`;
    const url = `${baseUrl}/profile/${slug}`;

    const html = `<!DOCTYPE html><html lang="en"><head>
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

// Dynamic Company Preview
router.get("/companies/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const parts = slug.split("-");
    const companyId = parts[parts.length - 1];
    
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).send('<html><body><h1>Company not found</h1></body></html>');
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const title = `${company.name} | Omnixra AI`;
    const description = `${company.name} — ${company.industry || "Company"}. Location: ${company.location || "Unknown"}. Discover jobs and connect on Omnixra AI.`;
    const image = `${baseUrl}/favicon.svg`;
    const url = `${baseUrl}/companies/${slug}`;

    const html = `<!DOCTYPE html><html lang="en"><head>
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
