import express from "express";
import Company from "../models/Company.js";
import User from "../models/User.js";

const router = express.Router();

// GET all companies (seeded + signed-up)
router.get("/", async (req, res) => {
  console.log("=== GET ALL COMPANIES ===");
  try {
    // Seeded companies
    const seededCompanies = await Company.find();
    
    // Signed-up companies (users with accountType "company")
    const signedUpCompanies = await User.find({ accountType: "company" })
      .select("companyName name email location industry verified");
    
    // Format signed-up to match company shape
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
    
    const allCompanies = [...seededCompanies, ...formattedSignedUp];
    res.json(allCompanies);
  } catch (error) {
    console.error("Get companies error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET single company by ID
router.get("/:id", async (req, res) => {
  try {
    // First try seeded Company collection
    let company = await Company.findById(req.params.id);
    
    // If not found, try User collection (signed-up company)
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
