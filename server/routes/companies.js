import express from "express";
import Company from "../models/Company.js";
import Job from "../models/Job.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const companies = await Company.find();
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const jobs = await Job.find({ company: company.name, active: true });
    res.json({ company, jobs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
