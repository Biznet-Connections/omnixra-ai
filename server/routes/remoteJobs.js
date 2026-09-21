import express from "express";
import RemoteJob from "../models/RemoteJob.js";

const router = express.Router();

// GET remote jobs (paginated) from local RemoteJob collection
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const q = (req.query.q || "").trim();

    const filter = { active: true };
    if (q && q.toLowerCase() !== "remote") {
      filter.$or = [
        { title: new RegExp(q, "i") },
        { company: new RegExp(q, "i") },
        { category: new RegExp(q, "i") },
        { tags: new RegExp(q, "i") },
      ];
    }

    const total = await RemoteJob.countDocuments(filter);
    const jobs = await RemoteJob.find(filter)
      .sort({ postedDate: -1, dateScraped: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Map applyUrl for JobCard compatibility
    const mapped = jobs.map(j => ({
      ...j,
      applicationUrl: j.applicationUrl || j.applyUrl,
      deadline: null,
    }));

    res.json({
      jobs: mapped,
      hasMore: page * limit < total,
      total,
      page,
      comingSoon: total === 0,
    });
  } catch (error) {
    console.error("Remote jobs error:", error.message);
    res.status(500).json({ message: error.message, jobs: [], hasMore: false, total: 0 });
  }
});

export default router;
