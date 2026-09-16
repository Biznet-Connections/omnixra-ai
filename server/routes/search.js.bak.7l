import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Job from "../models/Job.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Escape regex special chars to prevent ReDoS
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/search?q=...&type=all|people|jobs|companies|posts
router.get("/", protect, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().slice(0, 80);
    const type = String(req.query.type || "all").toLowerCase();
    if (!q) {
      return res.json({ people: [], jobs: [], companies: [], posts: [] });
    }

    const rx = new RegExp(escapeRegex(q), "i");
    const limit = 20;
    const wantsPeople = type === "all" || type === "people";
    const wantsJobs = type === "all" || type === "jobs";
    const wantsCompanies = type === "all" || type === "companies";
    const wantsPosts = type === "all" || type === "posts";

    const [people, companies, jobs, posts] = await Promise.all([
      wantsPeople
        ? User.find({
            accountType: "jobseeker",
            $or: [{ name: rx }, { headline: rx }, { category: rx }],
          })
            .select("name profilePicture profilePicLocked headline category location accountType")
            .limit(limit)
            .lean()
        : Promise.resolve([]),

      wantsCompanies
        ? User.find({
            accountType: "company",
            $or: [{ companyName: rx }, { name: rx }, { category: rx }],
          })
            .select("name companyName profilePicture headline category location accountType")
            .limit(limit)
            .lean()
        : Promise.resolve([]),

      wantsJobs
        ? Job.find({
            deleted: false,
            $or: [{ title: rx }, { company: rx }, { location: rx }, { description: rx }],
          })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean()
        : Promise.resolve([]),

      wantsPosts
        ? Post.find({
            deleted: false,
            $or: [{ visibility: "public" }, { visibility: { $exists: false } }],
            text: rx,
          })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate("author", "name profilePicture profilePicLocked headline category accountType")
            .lean()
        : Promise.resolve([]),
    ]);

    // Normalize posts for PostCard
    const normalizedPosts = posts.map((p) => ({
      ...p,
      hasImage: !!p.image,
      hasVideo: !!p.video,
      totalComments: Array.isArray(p.comments) ? p.comments.length : 0,
      comments: [],
    }));

    // Normalize companies to look like CompanyCard expects
    const normalizedCompanies = companies.map((c) => ({
      ...c,
      name: c.companyName || c.name,
    }));

    res.json({
      people: people.map((p) => ({ ...p, name: p.name || "User" })),
      companies: normalizedCompanies,
      jobs,
      posts: normalizedPosts,
    });
  } catch (err) {
    console.error("[SEARCH] error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;
