import express from "express";
import Post from "../models/Post.js";
import Job from "../models/Job.js";

const router = express.Router();

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanDescription(text = "", max = 180) {
  return String(text).replace(/\s+/g, " ").trim().slice(0, max);
}

function previewHtml({ title, description, image, url, type = "website" }) {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta property="og:type" content="${type}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:image:width" content="1280" />
<meta property="og:image:height" content="720" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:site_name" content="Omnixra AI" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
<link rel="canonical" href="${escapeHtml(url)}" />
</head><body>
<div style="font-family:Arial,sans-serif;padding:40px;text-align:center;background:#06070b;color:#fff;min-height:100vh;display:flex;flex-direction:column;justify-content:center;">
<div style="font-size:40px;margin-bottom:16px;">✨</div>
<h1 style="font-size:22px;margin:0 0 8px;">${escapeHtml(title)}</h1>
<p style="font-size:14px;color:#94a3b8;margin:0 0 24px;">${escapeHtml(description)}</p>
<a href="${escapeHtml(url)}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;">Open on Omnixra AI</a>
</div>
</body></html>`;
}

// POST SHARE PREVIEW
router.get("/posts/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("author", "name");
    if (!post) {
      return res.status(404).send(previewHtml({
        title: "Post not found | Omnixra AI",
        description: "This post could not be found.",
        image: "https://omnixra-ai.com/favicon.svg",
        url: "https://omnixra-ai.com"
      }));
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const url = `${baseUrl}/posts/${post._id}`;
    const authorName = post.author?.name || "Omnixra AI User";
    const description = cleanDescription(post.text || "Check out this post on Omnixra AI.");
    let title = `${authorName} on Omnixra AI`;
    let image = `${baseUrl}/favicon.svg`;

    if (post.mediaType === "video" && post.thumbnailUrl) {
      image = post.thumbnailUrl;
      title = `${authorName} shared a video on Omnixra AI`;
    } else if (post.mediaType === "image" && post.image) {
      image = post.image;
    }

    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(previewHtml({ title, description, image, url, type: "article" }));
  } catch (error) {
    console.error("Post preview error:", error);
    res.status(500).send("Unable to generate preview");
  }
});

// JOB SHARE PREVIEW
router.get("/jobs/:slug", async (req, res) => {
  try {
    const job = await Job.findOne({ slug: req.params.slug });
    if (!job) {
      return res.status(404).send(previewHtml({
        title: "Job not found | Omnixra AI",
        description: "This job vacancy could not be found.",
        image: "https://omnixra-ai.com/favicon.svg",
        url: "https://omnixra-ai.com"
      }));
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const url = `${baseUrl}/jobs/${job.slug}`;
    const title = `${job.title} at ${job.company}`;
    const description = cleanDescription(`${job.location} · ${job.salary || "Competitive"} · Apply now`);
    const image = `${baseUrl}/favicon.svg`;

    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(previewHtml({ title, description, image, url, type: "website" }));
  } catch (error) {
    console.error("Job preview error:", error);
    res.status(500).send("Unable to generate preview");
  }
});

export default router;
