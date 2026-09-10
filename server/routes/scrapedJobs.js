import express from "express";
import ScrapedJob from "../models/ScrapedJob.js";

const router = express.Router();

// GET all scraped jobs (paginated)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await ScrapedJob.countDocuments({});
    const jobs = await ScrapedJob.find({})
      .sort({ dateScraped: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const hasMore = page * limit < total;

    res.json({ jobs, hasMore, total, page });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single scraped job by slug
router.get("/:slug", async (req, res) => {
  try {
    const job = await ScrapedJob.findOne({ slug: req.params.slug });
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
