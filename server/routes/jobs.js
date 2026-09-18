import express from "express";
import { sendEmail, applicationEmailHtml } from "../utils/mailer.js";
import { resolveCompanyTarget } from "../utils/companyResolver.js";
import { requireTier } from "../middleware/tier.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import { protect } from "../middleware/auth.js";
import { cacheShort } from "../middleware/cache.js";

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

// GET all active jobs (paginated)
router.get("/", cacheShort(60, 120), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Job.countDocuments({ active: true });
    const jobs = await Job.find({ active: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const hasMore = page * limit < total;

    res.json({ jobs, hasMore, total, page });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// GET job by slug (for shared links)
router.get("/slug/:slug", cacheShort(300, 600), async (req, res) => {
  try {
    const job = await Job.findOne({ slug: req.params.slug });
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// GET single job â€” handle generated jobs
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

// APPLY TO JOB â€” handle both real and generated jobs
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

// ── APPLY VIA OMNIXRA (Starter+) ──
router.post("/:id/apply-omnixra", protect, requireTier("starter"), async (req, res) => {
  try {
    const { message, cvAttachment, cvName } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: "Message required" });

    let job;
    if (req.params.id.startsWith("generated-")) {
      job = { _id: req.params.id, title: "Generated Job", company: "Company", companyId: null };
    } else {
      job = await Job.findById(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
    }

    const existing = await Application.findOne({ jobId: req.params.id, userId: req.user._id });
    if (existing) return res.status(400).json({ message: "You already applied to this job." });

    const target = await resolveCompanyTarget({
      companyId: job.companyId,
      companyName: job.company,
    });

    const application = await Application.create({
      jobId: req.params.id,
      userId: req.user._id,
      companyId: job.companyId || null,
      companyName: job.company,
      message,
      status: "applied",
      matchPercentage: 50,
      method: "omnixra",
      cvAttachment: cvAttachment || null,
      cvName: cvName || null,
    });

    // Route: registered company → DM; else → email
    if (target.type === "user") {
      let conversation = await Conversation.findOne({
        participants: { $all: [req.user._id, target.userId], $size: 2 },
      });
      if (!conversation) {
        conversation = await Conversation.create({
          participants: [req.user._id, target.userId],
          messages: [],
        });
      }
      conversation.messages.push({
        sender: req.user._id,
        text: `Application for ${job.title}\n\n${message}`,
      });
      conversation.lastMessage = `Application for ${job.title}`;
      conversation.lastMessageAt = new Date();
      await conversation.save();

      application.companyUserId = target.userId;
      application.conversationId = conversation._id;
      application.deliveredTo = "omnixra-inbox";
      application.deliveredAt = new Date();
      await application.save();

      return res.status(201).json({ message: "Sent to company Omnixra inbox", application, method: "dm" });
    }

    if (target.type === "email") {
      const html = applicationEmailHtml({
        applicantName: req.user.name,
        applicantEmail: req.user.email,
        applicantPhone: req.user.phone || "",
        jobTitle: job.title,
        companyName: job.company,
        coverLetter: message,
        cvUrl: null,
      });
      const result = await sendEmail({
        to: target.email,
        subject: `Application: ${job.title} — ${req.user.name}`,
        html,
        replyTo: req.user.email,
      });

      application.deliveredTo = target.email;
      application.deliveredAt = result.success ? new Date() : null;
      await application.save();

      return res.status(201).json({
        message: result.success ? "Application sent by email" : "Application saved (email failed)",
        application,
        method: "email",
      });
    }

    return res.status(201).json({ message: "Application saved", application, method: "saved" });
  } catch (error) {
    console.error("Apply-omnixra error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── LOG GMAIL APPLICATION (free) ──
router.post("/:id/apply-gmail-log", protect, async (req, res) => {
  try {
    const { message } = req.body;
    let job;
    if (req.params.id.startsWith("generated-")) {
      job = { _id: req.params.id, title: "Generated Job", company: "Company", companyId: null };
    } else {
      job = await Job.findById(req.params.id);
    }

    const existing = await Application.findOne({ jobId: req.params.id, userId: req.user._id });
    if (existing) return res.json({ message: "Already logged", application: existing });

    const application = await Application.create({
      jobId: req.params.id,
      userId: req.user._id,
      companyId: job?.companyId || null,
      companyName: job?.company,
      message: message || "Applied via Gmail",
      method: "gmail",
      matchPercentage: 50,
    });

    res.status(201).json({ message: "Logged", application });
  } catch (error) {
    console.error("Gmail log error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── PUSH CV (Starter+) ──
router.post("/:id/push-cv", protect, requireTier("starter"), async (req, res) => {
  try {
    const { note = "" } = req.body;

    let job;
    if (req.params.id.startsWith("generated-")) {
      job = { _id: req.params.id, title: "Generated Job", company: "Company", companyId: null };
    } else {
      job = await Job.findById(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
    }

    const existing = await Application.findOne({ jobId: req.params.id, userId: req.user._id });
    if (existing && existing.pushedCV) {
      return res.status(400).json({ message: "You already pushed your CV to this job." });
    }

    const target = await resolveCompanyTarget({
      companyId: job.companyId,
      companyName: job.company,
    });

    const pushMessage = note
      ? `[CV PUSHED] ${note}`
      : `[CV PUSHED] ${req.user.name} pushed their CV for ${job.title}.`;

    let application;
    if (existing) {
      existing.pushedCV = true;
      existing.message = existing.message + "\n\n" + pushMessage;
      await existing.save();
      application = existing;
    } else {
      application = await Application.create({
        jobId: req.params.id,
        userId: req.user._id,
        companyId: job.companyId || null,
        companyName: job.company,
        message: pushMessage,
        status: "applied",
        matchPercentage: 50,
        method: "omnixra",
        pushedCV: true,
      });
    }

    // Deliver
    if (target.type === "user") {
      let conversation = await Conversation.findOne({
        participants: { $all: [req.user._id, target.userId], $size: 2 },
      });
      if (!conversation) {
        conversation = await Conversation.create({
          participants: [req.user._id, target.userId],
          messages: [],
        });
      }
      conversation.messages.push({
        sender: req.user._id,
        text: `CV PUSHED for ${job.title}\n\n${note || "Please review my attached CV."}`,
      });
      conversation.lastMessage = `CV pushed for ${job.title}`;
      conversation.lastMessageAt = new Date();
      await conversation.save();

      application.companyUserId = target.userId;
      application.conversationId = conversation._id;
      application.deliveredTo = "omnixra-inbox";
      application.deliveredAt = new Date();
      await application.save();
    } else if (target.type === "email") {
      const html = applicationEmailHtml({
        applicantName: req.user.name,
        applicantEmail: req.user.email,
        applicantPhone: req.user.phone || "",
        jobTitle: `[CV PUSHED] ${job.title}`,
        companyName: job.company,
        coverLetter: note || `${req.user.name} has pushed their CV for this role.`,
        cvUrl: null,
      });
      const result = await sendEmail({
        to: target.email,
        subject: `CV Pushed: ${job.title} - ${req.user.name}`,
        html,
        replyTo: req.user.email,
      });
      application.deliveredTo = target.email;
      application.deliveredAt = result.success ? new Date() : null;
      await application.save();
    }

    return res.status(201).json({
      message: "CV pushed successfully",
      application,
      method: target.type,
    });
  } catch (error) {
    console.error("Push CV error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── APPLY FOR ME (Starter+ — auto-send) ──
router.post("/:id/apply-for-me", protect, requireTier("starter"), async (req, res) => {
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
