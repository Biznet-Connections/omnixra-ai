import express from "express";
import Company from "../models/Company.js";
import User from "../models/User.js";

const router = express.Router();

// GET all companies — cursor pagination (scales to millions)
// Query: ?limit=20&cursor=<lastCompanyId>
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;

    // ── Signed-up companies ONLY on first page (no cursor) ──
    let signedUp = [];
    if (!cursor) {
      const signedUpUsers = await User.find({ accountType: "company" })
        .select("companyName name email location industry verified createdAt")
        .sort({ _id: -1 })
        .limit(20)
        .lean();

      signedUp = signedUpUsers.map(user => ({
        _id: user._id,
        name: user.companyName || user.name,
        email: user.email,
        location: user.location || "Zimbabwe",
        category: "Company",
        industry: user.industry || "Other",
        verified: user.verified || false,
        source: "signup",
        createdAt: user.createdAt
      }));
    }

    // ── Seeded companies via cursor ──
    const query = {};
    if (cursor) query._id = { $lt: cursor };

    const seeded = await Company.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .select("name email location category industry verified createdAt")
      .lean();

    const hasMoreSeeded = seeded.length > limit;
    const seededPage = hasMoreSeeded ? seeded.slice(0, limit) : seeded;
    const lastSeeded = seededPage[seededPage.length - 1];
    const nextCursor = hasMoreSeeded && lastSeeded ? lastSeeded._id.toString() : null;

    // ── Merge: signed-up first (only page 1), then seeded ──
    const companies = [...signedUp, ...seededPage];

    res.json({
      companies,
      hasMore: hasMoreSeeded,
      nextCursor,
      count: companies.length
    });
  } catch (error) {
    console.error("Get companies error:", error);
    res.status(500).json({ message: error.message, companies: [], hasMore: false, nextCursor: null, count: 0 });
  }
});

// GET single company by ID
router.get("/:id", async (req, res) => {
  try {
    let company = await Company.findById(req.params.id);

    if (!company) {
      const user = await User.findById(req.params.id).select("-password");
      if (user && user.accountType === "company") {
        company = {
          _id: user._id,
          name: user.companyName || user.name,
          email: user.email,
          location: user.location || "Zimbabwe",
          industry: "Other",
          verified: user.verified || false,
          source: "signup"
        };
      }
    }

    if (!company) return res.status(404).json({ message: "Company not found" });
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
