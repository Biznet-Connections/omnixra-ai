import express from "express";
import Company from "../models/Company.js";
import User from "../models/User.js";

const router = express.Router();

// GET all companies (paginated + signed-up companies)
router.get("/", async (req, res) => {
  console.log("=== GET ALL COMPANIES ===");
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    // Only on page 1, fetch signed-up companies too
    const seededCompanies = await Company.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    let allCompanies = [...seededCompanies];

    // Add signed-up companies only on first page
    if (page === 1) {
      const signedUpCompanies = await User.find({ accountType: "company" })
        .select("companyName name email location industry verified")
        .limit(20);

      const formattedSignedUp = signedUpCompanies.map(user => ({
        _id: user._id,
        name: user.companyName || user.name,
        email: user.email,
        location: user.location || "Zimbabwe",
        category: "Company",
        industry: "Other",
        verified: user.verified || false,
        source: "signup"
      }));

      allCompanies = [...formattedSignedUp, ...allCompanies];
    }

    const total = await Company.countDocuments();
    const hasMore = page * limit < total;

    console.log(`Serving page ${page}: ${allCompanies.length} companies (total: ${total})`);

    res.json({
      companies: allCompanies,
      hasMore,
      total,
      page,
      nextPage: hasMore ? page + 1 : null
    });
  } catch (error) {
    console.error("Get companies error:", error);
    res.status(500).json({ message: error.message, companies: [], hasMore: false, total: 0, page: 1 });
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
