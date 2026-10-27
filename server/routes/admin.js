import express from "express";
import { protect } from "../middleware/auth.js";
import { adminOnly } from "../middleware/admin.js";
import Voucher from "../models/Voucher.js";
import User from "../models/User.js";
import Job from "../models/Job.js";
import Company from "../models/Company.js";

const router = express.Router();

router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const Post = (await import("../models/Post.js")).default;
    const Boost = (await import("../models/Boost.js")).default;

    const users = await User.countDocuments();
    const posts = await Post.countDocuments({ deleted: false });
    const jobs = await Job.countDocuments();
    const vouchers = await Voucher.countDocuments();
    const companies = await Company.countDocuments();
    let boosts = 0;
    try { boosts = await Boost.countDocuments(); } catch (e) { boosts = 0; }

    res.json({ users, posts, jobs, vouchers, companies, boosts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET recent activity
router.get("/activity", protect, adminOnly, async (req, res) => {
  try {
    const Post = (await import("../models/Post.js")).default;
    const activities = [];

    // Recent posts
    const recentPosts = await Post.find({ deleted: false })
      .populate("author", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    recentPosts.forEach(p => {
      activities.push({
        message: `${p.author?.name || "User"} posted`,
        time: timeAgo(p.createdAt),
        color: "#8b5cf6",
        timestamp: p.createdAt
      });
    });

    // Recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select("name email createdAt")
      .lean();
    recentUsers.forEach(u => {
      activities.push({
        message: `New user: ${u.name}`,
        time: timeAgo(u.createdAt),
        color: "#10b981",
        timestamp: u.createdAt
      });
    });

    // Sort by timestamp desc
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(activities.slice(0, 8));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

router.post("/vouchers", protect, adminOnly, async (req, res) => {
  try {
    const { code, durationDays, expiresAt } = req.body;
    const voucher = await Voucher.create({
      code: code.toUpperCase(),
      durationDays: durationDays || 30,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdBy: req.user._id
    });
    res.status(201).json(voucher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/vouchers", protect, adminOnly, async (req, res) => {
  try {
    const vouchers = await Voucher.find().populate("usedBy", "name email").sort({ createdAt: -1 });
    res.json(vouchers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/users", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve verification
router.put("/approve-verification/:userId", protect, adminOnly, async (req, res) => {
  console.log(`=== APPROVE VERIFICATION for ${req.params.userId} ===`);
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { verified: true, verifiedRequested: false },
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/seed-companies", protect, adminOnly, async (req, res) => {
  try {
    const companies = [
      { name: "Goldenknot Financial Holdings", email: "hr@goldenknot.co.zw", location: "Harare, Zimbabwe", category: "Financial Services", industry: "Finance" },
      { name: "Star International Logistics", email: "hr@starinternational.co.zw", location: "Harare, Zimbabwe", category: "Transport & Logistics", industry: "Logistics" }
    ];
    const created = await Company.insertMany(companies);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST AS OMNIXRA AI
router.post("/post-as-ai", protect, adminOnly, async (req, res) => {
  try {
    const Post = (await import("../models/Post.js")).default;
    const { text, image } = req.body;
    let aiUser = await User.findOne({ email: "ai@omnixra.ai" });
    if (!aiUser) {
      aiUser = await User.create({
        name: "Omnixra AI", email: "ai@omnixra.ai", password: "AIUserPassword123!",
        accountType: "admin", verified: true, headline: "AI Career Assistant"
      });
    }
    const post = await Post.create({
      author: aiUser._id, authorType: "ai", text, image: image || null,
      visibility: "public", likes: 0, comments: []
    });
    res.status(201).json(post);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// TOGGLE VERIFY
router.put("/verify/:userId", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.verified = !user.verified;
    await user.save();
    res.json({ verified: user.verified });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// TOGGLE PREMIUM
router.put("/premium/:userId", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.isPremium = !user.isPremium;
    await user.save();
    res.json({ isPremium: user.isPremium });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// DELETE USER
router.delete("/users/:userId", protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.userId);
    res.json({ message: "User deleted" });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// MANUAL: Enrich job details
router.post("/enrich-jobs", protect, adminOnly, async (req, res) => {
  try {
    const { enrichJobs } = await import("../scraper/enrichJobs.js");
    const result = await enrichJobs({ onlyMissing: true, limit_count: 50 });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// MANUAL: Run scraper now
router.post("/run-scraper", protect, adminOnly, async (req, res) => {
  try {
    const { runScraper } = await import("../scraper/index.js");
    const result = await runScraper();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// MANUAL: Run AI job generation now
router.post("/generate-ai-jobs", protect, adminOnly, async (req, res) => {
  try {
    const { generateDailyAIJobs } = await import("../scraper/generateAIJobs.js");
    const result = await generateDailyAIJobs();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

// ═══════════════════════════════════════════════════════════════════
// ADMIN APPLICATIONS CONSOLE (Phase 2)
// ═══════════════════════════════════════════════════════════════════

// GET all applications (paginated, filterable)
router.get("/applications", protect, adminOnly, async (req, res) => {
  try {
    const Application = (await import("../models/Application.js")).default;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status && req.query.status !== "all") filter.status = req.query.status;

    if (req.query.q) {
      const rx = new RegExp(req.query.q.trim(), "i");
      // match job title, company name, or user name/email via lookup
      filter.$or = [
        { companyName: rx },
      ];
    }

    const [apps, total] = await Promise.all([
      Application.find(filter)
        .populate("jobId", "title company location")
        .populate("userId", "name email profilePicture")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments(filter),
    ]);

    // client-side text filter for user name / email / job title
    let items = apps;
    if (req.query.q) {
      const q = req.query.q.trim().toLowerCase();
      items = apps.filter(a =>
        (a.userId?.name || "").toLowerCase().includes(q) ||
        (a.userId?.email || "").toLowerCase().includes(q) ||
        (a.jobId?.title || "").toLowerCase().includes(q) ||
        (a.companyName || "").toLowerCase().includes(q)
      );
    }

    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    console.error("[admin/applications]", e.message);
    res.status(500).json({ message: e.message });
  }
});

// GET single application detail
router.get("/applications/:id", protect, adminOnly, async (req, res) => {
  try {
    const Application = (await import("../models/Application.js")).default;
    const app = await Application.findById(req.params.id)
      .populate("jobId", "title company location salary category type")
      .populate("userId", "name email profilePicture headline location")
      .populate("companyId", "name industry")
      .populate("companyUserId", "name email profilePicture")
      .lean();
    if (!app) return res.status(404).json({ message: "Application not found" });
    res.json(app);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// UPDATE status (fires socket + push to applicant)
router.put("/applications/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const Application = (await import("../models/Application.js")).default;
    const { status } = req.body;
    const valid = ["applied", "viewed", "interview", "shortlisted", "rejected"];
    if (!valid.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    app.status = status;
    if (status === "viewed" && !app.viewedAt) app.viewedAt = new Date();
    await app.save();

    // Real-time socket to the applicant
    try {
      const { getIO } = await import("../socket.js");
      const io = getIO();
      if (io) {
        io.to(String(app.userId)).emit("application-updated", {
          applicationId: String(app._id),
          status: app.status,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) { console.warn("[status emit]", e.message); }

    // Push notification
    try {
      const User = (await import("../models/User.js")).default;
      const applicant = await User.findById(app.userId).select("fcmTokens").lean();
      if (applicant && applicant.fcmTokens?.length) {
        const { sendPushToUser } = await import("../utils/fcm.js");
        const label = {
          viewed: "Your application was viewed",
          interview: "You got an interview request!",
          shortlisted: "You've been shortlisted!",
          rejected: "Application update",
        }[status] || "Application update";
        await sendPushToUser(applicant, {
          title: label,
          body: `${app.companyName || "Company"} · tap to view`,
          data: { type: "application", deepLink: "/inbox" },
        });
      }
    } catch (e) { console.warn("[status push]", e.message); }

    res.json({ ok: true, status: app.status });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// REPLY as the company — stores in application thread (no Conversation)
router.post("/applications/:id/reply", protect, adminOnly, async (req, res) => {
  try {
    const Application = (await import("../models/Application.js")).default;
    const User = (await import("../models/User.js")).default;
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: "Message required" });

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    // Resolve company sender (real first, then shadow)
    let senderId = app.companyUserId;
    let senderName = app.companyName || "Company";

    if (!senderId && app.companyId) {
      const co = await User.findById(app.companyId).select("_id name").lean();
      if (co) { senderId = co._id; senderName = co.name || senderName; }
    }
    if (!senderId && app.companyName) {
      const co = await User.findOne({
        name: app.companyName, accountType: "company", isShadow: { $ne: true },
      }).select("_id name").lean();
      if (co) { senderId = co._id; senderName = co.name || senderName; }
    }

    // Shadow auto-create
    if (!senderId && app.companyName) {
      const slug = app.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "company";
      const shadowEmail = `shadow-${slug}@omnixra.shadow`;
      let shadow = await User.findOne({ email: shadowEmail }).select("_id name").lean();
      if (!shadow) {
        const bcrypt = (await import("bcryptjs")).default;
        const hash = await bcrypt.hash(Math.random().toString(36).slice(2) + Date.now(), 8);
        const created = await User.create({
          name: app.companyName, email: shadowEmail, password: hash,
          accountType: "company", companyName: app.companyName, verified: true, isShadow: true,
        });
        senderId = created._id; senderName = created.name;
        console.log(`[admin reply] created shadow company "${app.companyName}"`);
      } else {
        senderId = shadow._id; senderName = shadow.name || senderName;
      }
    }

    // Last resort
    if (!senderId) {
      const supportEmail = "support@omnixra.ai";
      let support = await User.findOne({ email: supportEmail }).select("_id name").lean();
      if (!support) {
        const bcrypt = (await import("bcryptjs")).default;
        const hash = await bcrypt.hash(Math.random().toString(36).slice(2) + Date.now(), 8);
        const created = await User.create({
          name: "Omnixra Support", email: supportEmail, password: hash,
          accountType: "admin", verified: true,
        });
        senderId = created._id; senderName = created.name;
      } else { senderId = support._id; senderName = support.name || "Omnixra Support"; }
    }

    // Push to thread
    const reply = {
      from: "company",
      senderId,
      senderName,
      text: text.trim(),
      verified: true,
      createdAt: new Date(),
    };
    app.replies = app.replies || [];
    app.replies.push(reply);
    app.lastStatusAt = new Date(); // reuse for unread marker
    await app.save();

    // Realtime socket
    try {
      const { getIO } = await import("../socket.js");
      const io = getIO();
      if (io) {
        io.to(String(app.userId)).emit("application-reply", {
          applicationId: String(app._id),
          from: "company",
          senderName,
          text: reply.text,
          createdAt: reply.createdAt,
        });
      }
    } catch (e) { console.warn("[reply emit]", e.message); }

    // Push notification
    try {
      const applicant = await User.findById(app.userId).select("fcmTokens").lean();
      if (applicant && applicant.fcmTokens?.length) {
        const { sendPushToUser } = await import("../utils/fcm.js");
        await sendPushToUser(applicant, {
          title: senderName,
          body: text.trim().slice(0, 90),
          data: { type: "application_reply", deepLink: "/inbox" },
        });
      }
    } catch (e) { console.warn("[reply push]", e.message); }

    res.json({ ok: true, replyId: String(app.replies[app.replies.length - 1]._id || Date.now()) });
  } catch (e) {
    console.error("[admin reply]", e.message);
    res.status(500).json({ message: e.message });
  }
});

// DELETE any reply from an application thread (admin)
router.delete("/applications/:id/reply/:replyId", protect, adminOnly, async (req, res) => {
  try {
    const Application = (await import("../models/Application.js")).default;
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Not found" });

    const reply = app.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    reply.deleteOne();
    await app.save();

    try {
      const { getIO } = await import("../socket.js");
      const io = getIO();
      if (io) {
        io.to(String(app.userId)).emit("application-reply-deleted", {
          applicationId: String(app._id),
          replyId: req.params.replyId,
        });
      }
    } catch (e) {}

    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});
