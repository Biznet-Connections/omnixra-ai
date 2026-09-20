import express from "express";
import User from "../models/User.js";
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

// GET APPLICANTS ACROSS ALL MY JOBS (company only)
router.get("/applicants/me", protect, async (req, res) => {
  try {
    if (req.user.accountType !== "company") {
      return res.status(403).json({ message: "Company only" });
    }

    // Find all jobs posted by this company
    // Companies may match by companyId (if they have one) or by company name
    const Job = (await import("../models/Job.js")).default;
    const companyName = req.user.companyName || req.user.name;

    const myJobs = await Job.find({
      $or: [
        { postedBy: req.user._id },
        { companyId: req.user._id },
        { company: companyName },
      ],
    }).select("_id title company location").lean();

    const jobIds = myJobs.map(j => j._id);

    if (jobIds.length === 0) {
      return res.json([]);
    }

    const Application = (await import("../models/Application.js")).default;
    const applications = await Application.find({ jobId: { $in: jobIds } })
      .populate("userId", "name profilePicture location headline skills")
      .populate("jobId", "title company location")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json(applications);
  } catch (error) {
    console.error("applicants/me error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id/close", protect, async (req, res) => {
  try {
    if (req.user.accountType !== "company" && req.user.accountType !== "admin") {
      return res.status(403).json({ message: "Company account required" });
    }
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Ownership check
    const companyName = req.user.companyName || req.user.name;
    const isOwner =
      String(job.postedBy) === String(req.user._id) ||
      job.company === companyName ||
      req.user.accountType === "admin";
    if (!isOwner) return res.status(403).json({ message: "Not your job" });

    job.status = "paused";
    await job.save();
    res.json({ message: "Job closed", job });
  } catch (error) {
    console.error("[jobs/:id/close] error:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST A JOB (company only)
router.post("/post", protect, async (req, res) => {
  try {
    if (req.user.accountType !== "company" && req.user.accountType !== "admin") {
      return res.status(403).json({ message: "Company account required" });
    }

    const { title, category, location, salary, type, description, requirements, deadline, applicationUrl } = req.body;

    if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
    if (!location?.trim()) return res.status(400).json({ message: "Location is required" });
    if (!description?.trim()) return res.status(400).json({ message: "Description is required" });

    // Validate deadline
    if (deadline) {
      const d = new Date(deadline);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ message: "Invalid deadline date" });
      }
      if (d < new Date()) {
        return res.status(400).json({ message: "Deadline cannot be in the past" });
      }
    }

    // Slug
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const expiresAt = deadline
      ? new Date(deadline)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

    const job = await Job.create({
      title: title.trim(),
      slug,
      category: category || "General",
      location: location.trim(),
      salary: salary?.trim() || null,
      type: type || "Full-time",
      description: description.trim(),
      requirements: requirements?.trim() || null,
      deadline: deadline || null,
      applicationUrl: applicationUrl?.trim() || null,
      company: req.user.companyName || req.user.name,
      postedBy: req.user._id,
      companyId: null,
      status: "active",
      expiresAt,
      source: "company",
    });

    console.log("[job posted]", job.title, "by", req.user.email);

    res.status(201).json({ message: "Job posted successfully", job });
  } catch (error) {
    console.error("Post job error:", error);
    res.status(500).json({ message: error.message });
  }
});

// AI MATCHING — company pays 1 credit, gets 10 best candidates
router.post("/:id/ai-match", protect, async (req, res) => {
  try {
    if (req.user.accountType !== "company" && req.user.accountType !== "admin") {
      return res.status(403).json({ message: "Company account required" });
    }

    const user = await User.findById(req.user._id);
    if (!user.aiMatchCredits || user.aiMatchCredits < 1) {
      return res.status(402).json({
        message: "You need an AI Match credit to use this. Buy one for $5.",
        requiresPurchase: true,
        productType: "ai_matching",
      });
    }

    const job = await Job.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Get all applicants to this job
    const applicants = await Application.find({ jobId: req.params.id })
      .populate("userId", "name profilePicture location headline skills category about")
      .lean();

    // Get broader pool — users matching the job category
    const matchingUsers = await User.find({
      accountType: "jobseeker",
      category: job.category || "General",
    })
      .select("name profilePicture location headline skills category about")
      .limit(50)
      .lean();

    // Combine + dedupe
    const seen = new Set();
    const candidates = [];
    for (const a of applicants) {
      if (a.userId && !seen.has(String(a.userId._id))) {
        seen.add(String(a.userId._id));
        candidates.push({ ...a.userId, source: "applicant" });
      }
    }
    for (const u of matchingUsers) {
      if (!seen.has(String(u._id))) {
        seen.add(String(u._id));
        candidates.push({ ...u, source: "match" });
      }
    }

    if (candidates.length === 0) {
      return res.status(200).json({
        message: "No candidates found matching this job",
        candidates: [],
        creditsLeft: user.aiMatchCredits,
      });
    }

    // Build AI prompt for ranking
    const { askAI } = await import("../utils/aiService.js");
    const candidateBrief = candidates.slice(0, 20).map((c, i) =>
      `#${i + 1}: ${c.name} | ${c.category || "General"} | ${c.location || "?"} | Skills: ${(c.skills || []).join(",") || "none"} | ${c.headline || ""}`
    ).join("\n");

    const prompt = `Job: ${job.title} at ${job.company}
Category: ${job.category}
Location: ${job.location}
Description: ${(job.description || "").slice(0, 300)}

Candidates:
${candidateBrief}

Rank the TOP 10 candidates by fit for this job. Return ONLY a JSON array like:
[{"rank":1,"name":"...","score":95,"reason":"..."}]
Score 0-100 based on match. Be honest — some may be low scores.`;

    let ranked = [];
    try {
      const aiResponse = await askAI([
        { role: "system", content: "You rank candidates for jobs. Return ONLY valid JSON." },
        { role: "user", content: prompt },
      ]);
      const jsonMatch = String(aiResponse).match(/\[[\s\S]*\]/);
      if (jsonMatch) ranked = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("[ai-match] AI ranking failed:", e.message);
      // Fallback: just rank by applicant source
      ranked = candidates.slice(0, 10).map((c, i) => ({
        rank: i + 1,
        name: c.name,
        score: c.source === "applicant" ? 85 - i : 70 - i,
        reason: c.source === "applicant" ? "Already applied" : "Category match",
      }));
    }

    // Enrich with full candidate data
    const enriched = ranked.slice(0, 10).map(r => {
      const c = candidates.find(x => x.name === r.name);
      return {
        ...r,
        _id: c?._id,
        profilePicture: c?.profilePicture,
        location: c?.location,
        headline: c?.headline,
        skills: c?.skills || [],
        category: c?.category,
        source: c?.source,
      };
    });

    // Deduct 1 credit
    await User.findByIdAndUpdate(req.user._id, { $inc: { aiMatchCredits: -1 } });

    // Save match result on job
    await Job.findByIdAndUpdate(req.params.id, {
      aiMatchedAt: new Date(),
      aiMatches: enriched,
    });

    res.json({
      message: `Found ${enriched.length} top candidates`,
      candidates: enriched,
      creditsLeft: user.aiMatchCredits - 1,
    });
  } catch (error) {
    console.error("[ai-match] error:", error);
    res.status(500).json({ message: error.message });
  }
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

// ── GET MY JOBS (company-only) ──
router.get("/mine/list", protect, async (req, res) => {
  try {
    if (req.user.accountType !== "company" && req.user.accountType !== "admin") {
      return res.status(403).json({ message: "Company account required" });
    }

    const jobs = await Job.find({ postedBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const Application = (await import("../models/Application.js")).default;
    const jobIds = jobs.map(j => j._id);
    const counts = await Application.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: "$jobId", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map(c => [c._id.toString(), c.count]));

    const enriched = jobs.map(j => {
      const daysLeft = j.expiresAt
        ? Math.max(0, Math.ceil((new Date(j.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)))
        : null;
      const isExpired = j.expiresAt ? new Date(j.expiresAt) < new Date() : false;
      return {
        ...j,
        applicantCount: countMap[j._id.toString()] || 0,
        daysLeft,
        isExpired,
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error("my-jobs error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── EDIT A JOB (owner only) ──
router.put("/:id", protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    if (job.postedBy?.toString() !== req.user._id.toString() && req.user.accountType !== "admin") {
      return res.status(403).json({ message: "Not your job" });
    }

    const editable = [
      "title", "category", "location", "salary", "type",
      "description", "requirements", "deadline", "applicationUrl",
    ];
    for (const field of editable) {
      if (req.body[field] !== undefined) {
        job[field] = typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
      }
    }

    await job.save();
    res.json({ message: "Job updated", job });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A job with this title already exists" });
    }
    console.error("edit job error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── PAUSE / RESUME A JOB (owner only) ──
router.patch("/:id/status", protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "paused", "expired", "draft"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    if (job.postedBy?.toString() !== req.user._id.toString() && req.user.accountType !== "admin") {
      return res.status(403).json({ message: "Not your job" });
    }

    job.status = status;
    job.active = status === "active";
    await job.save();

    res.json({ message: "Job " + status, job });
  } catch (error) {
    console.error("job status error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── DELETE A JOB (owner only) ──
router.delete("/:id", protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    if (job.postedBy?.toString() !== req.user._id.toString() && req.user.accountType !== "admin") {
      return res.status(403).json({ message: "Not your job" });
    }

    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: "Job deleted" });
  } catch (error) {
    console.error("delete job error:", error);
    res.status(500).json({ message: error.message });
  }
});
export default router;

