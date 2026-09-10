import express from "express";
import { searchJSearch } from "../scraper/sources/jsearch.js";

const router = express.Router();

// GET remote jobs (via JSearch API)
router.get("/", async (req, res) => {
  try {
    const query = req.query.q || "remote developer";
    const page = parseInt(req.query.page) || 1;

    // If API key is missing, return coming soon
    if (!process.env.JSEARCH_API_KEY || process.env.JSEARCH_API_KEY.trim() === "") {
      return res.json({
        jobs: [],
        hasMore: false,
        total: 0,
        page,
        comingSoon: true,
        message: "Remote jobs coming soon. Add JSEARCH_API_KEY to enable."
      });
    }

    const result = await searchJSearch(query, page);
    res.json(result);
  } catch (error) {
    console.error("Remote jobs error:", error.message);
    res.status(500).json({ message: error.message, jobs: [], hasMore: false });
  }
});

export default router;
