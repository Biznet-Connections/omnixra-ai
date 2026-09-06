import express from "express";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Calculate REAL match percentage
function calculateMatch(userCategory, jobCategory, userSkills = []) {
  if (!userCategory || !jobCategory) return 30;
  const userCat = userCategory.toLowerCase();
  const jobCat = jobCategory.toLowerCase();
  if (userCat === "general") return Math.floor(Math.random() * 20) + 30;
  if (userCat === jobCat) return 96;
  if (jobCat === "general") return Math.floor(Math.random() * 15) + 15;
  if (jobCat.includes(userCat) || userCat.includes(jobCat)) return 80;
  const relatedMap = {
    "information technology": ["networking", "telecommunications", "software", "it"],
    "networking": ["information technology", "telecommunications", "it"],
    "finance & accounting": ["financial services", "banking", "accounting"],
    "marketing & sales": ["digital marketing", "sales", "retail"],
    "healthcare": ["nursing", "pharmaceutical", "medical"],
    "education": ["teaching", "academic", "training"],
    "plumbing": ["construction", "maintenance"],
    "electrical": ["construction", "maintenance"],
    "welding & fabrication": ["construction", "manufacturing"],
    "mechanics": ["transport", "automotive"],
    "carpentry": ["construction", "furniture"],
    "housekeeping": ["domestic", "cleaning"],
    "gardening": ["landscaping", "outdoor"],
    "driving": ["transport", "logistics"],
    "security": ["safety", "protection"],
    "farm work": ["agriculture", "farming"],
    "construction labour": ["construction", "building"]
  };
  const related = relatedMap[userCat] || [];
  if (related.includes(jobCat)) return 65;
  const skills = userSkills.map(s => s.toLowerCase());
  const hasSkillMatch = skills.some(s => jobCat.includes(s) || s.includes(jobCat));
  if (hasSkillMatch) return 75;
  return Math.floor(Math.random() * 10) + 5;
}

// GET all active jobs
router.get("/", async (req, res) => {
  try {
    const jobs = await Job.find({ active: true }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// GET single job — handle generated jobs
router.get("/:id", async (req, res) => {
  try {
    // If ID starts with "generated-", return a generated job object
    if (req.params.id.startsWith("generated-")) {
      return res.json({
        _id: req.params.id,
        title: "Generated Job",
        company: "Company",
        location: "Zimbabwe",
        category: "General",
        description: "This is an AI-generated job opportunity.",
        source: "ai-generated",
        isGenerated: true
      });
    }
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// APPLY TO JOB — handle both real and generated jobs
router.post("/:id/apply", protect, async (req, res) => {
  console.log(`=== APPLY TO JOB ${req.params.id} ===`);
  try {
    const { message, cvAttachment } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Please write a message to apply." });
    }

    let job;
    let matchPercentage = 50;

    // Check if this is a generated job
    if (req.params.id.startsWith("generated-")) {
      job = {
        _id: req.params.id,
        title: "Generated Job",
        company: "Company",
        category: "General",
        companyId: null
      };
      matchPercentage = Math.floor(Math.random() * 20) + 30;
    } else {
      job = await Job.findById(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      matchPercentage = calculateMatch(req.user.category, job.category, req.user.skills);
    }

    const existing = await Application.findOne({ jobId: req.params.id, userId: req.user._id });
    if (existing) return res.status(400).json({ message: "You already applied to this job." });

    const application = await Application.create({
      jobId: req.params.id,
      userId: req.user._id,
      companyId: job.companyId || null,
      message: message.trim(),
      matchPercentage,
      cvAttachment: cvAttachment || null
    });

    res.status(201).json({ message: "Application submitted successfully!", application });
  } catch (error) {
    console.error("Apply error:", error);
    res.status(500).json({ message: error.message });
  }
});

// APPLY FOR ME (premium)
router.post("/:id/apply-for-me", protect, async (req, res) => {
  console.log(`=== APPLY FOR ME - Job ${req.params.id} ===`);
  try {
    if (!req.user.isPremium) {
      return res.status(403).json({ message: "Premium feature. Redeem a voucher to use Apply for Me." });
    }

    let job;
    let matchPercentage = 50;
    if (req.params.id.startsWith("generated-")) {
      job = { _id: req.params.id, title: "Generated Job", company: "Company", category: "General", companyId: null };
      matchPercentage = Math.floor(Math.random() * 20) + 30;
    } else {
      job = await Job.findById(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      matchPercentage = calculateMatch(req.user.category, job.category, req.user.skills);
    }

    const existing = await Application.findOne({ jobId: req.params.id, userId: req.user._id });
    if (existing) return res.status(400).json({ message: "You already applied to this job." });

    const { askAI } = await import("../utils/aiService.js");
    const aiMessage = await askAI([
      { role: "system", content: "Write a professional job application message." },
      { role: "user", content: `Write a cover letter for ${req.user.name} applying to ${job.title}. Skills: ${req.user.skills?.join(", ") || "General"}.` }
    ]);

    const application = await Application.create({
      jobId: req.params.id,
      userId: req.user._id,
      companyId: job.companyId || null,
      message: aiMessage,
      matchPercentage,
      cvAttachment: null
    });

    res.status(201).json({ message: "AI applied on your behalf!", application });
  } catch (error) {
    console.error("Apply for me error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET MY APPLICATIONS
router.get("/applications/me", protect, async (req, res) => {
  console.log(`=== GET MY APPLICATIONS ===`);
  try {
    const applications = await Application.find({ userId: req.user._id })
      .populate("jobId", "title company location salary category")
      .populate("companyId", "name industry")
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// GET APPLICATION DETAIL
router.get("/applications/:id", protect, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("jobId", "title company description location salary type category")
      .populate("companyId", "name industry");
    if (!application) return res.status(404).json({ message: "Application not found" });
    res.json(application);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// GET COMPANY APPLICANTS
router.get("/:jobId/applicants", protect, async (req, res) => {
  console.log(`=== GET APPLICANTS FOR JOB ${req.params.jobId} ===`);
  try {
    if (req.user.accountType !== "company" && req.user.accountType !== "admin") {
      return res.status(403).json({ message: "Company account required" });
    }
    const applications = await Application.find({ jobId: req.params.jobId })
      .populate("userId", "name profilePicture headline category isPremium profilePicLocked")
      .sort({ matchPercentage: -1, createdAt: -1 });
    res.json(applications);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// UPDATE APPLICATION STATUS
router.put("/applications/:id/status", protect, async (req, res) => {
  try {
    if (req.user.accountType !== "company" && req.user.accountType !== "admin") {
      return res.status(403).json({ message: "Company account required" });
    }
    const { status } = req.body;
    const updateData = { status };
    if (status === "viewed") updateData.viewedAt = new Date();
    const application = await Application.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate("userId", "name profilePicture headline");
    res.json(application);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

export default router;
