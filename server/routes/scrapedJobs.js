import express from "express";
import ScrapedJob from "../models/ScrapedJob.js";

const router = express.Router();

// GET all scraped jobs (removed strict filters)
router.get("/", async (req, res) => {
  try {
    const jobs = await ScrapedJob.find({})
      .sort({ dateScraped: -1, createdAt: -1 })
      .limit(100);
    res.json(jobs);
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
