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

export default router;
