import express from "express";
import { protect } from "../middleware/auth.js";
import { requireTier } from "../middleware/tier.js";
import { resolveCompanyTarget } from "../utils/companyResolver.js";
import { sendEmail, profilePushEmailHtml } from "../utils/mailer.js";
import Conversation from "../models/Conversation.js";
import Application from "../models/Application.js";
import Company from "../models/Company.js";
import User from "../models/User.js";
import { cacheShort } from "../middleware/cache.js";

const router = express.Router();

// GET all companies â€” cursor pagination (scales to millions)
// Query: ?limit=20&cursor=<lastCompanyId>
router.get("/", cacheShort(30), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;

    // â”€â”€ Signed-up companies ONLY on first page (no cursor) â”€â”€
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

    // â”€â”€ Seeded companies via cursor â”€â”€
    const query = {};
    const hasCursorFilter = !!cursor;
    if (cursor) query._id = { $lt: cursor };

    // Fetch a LARGER pool so we get a good mix of real businesses + education
    // (the DB has 462 companies total, so 300 gives us most of them)
    const POOL = cursor ? limit + 1 : 300;

    const seeded = await Company.find(query)
      .sort({ _id: -1 })
      .limit(hasCursorFilter ? limit + 1 : POOL)
      .select("name email location category industry verified createdAt")
      .lean();

    // Fisher-Yates shuffle
    function shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    // Classify education vs real business
    const EDU_KEYWORDS = ["school", "college", "university", "academy", "polytechnic", "institute", "teachers", "primary", "secondary", "high school", "nursery", "kindergarten", "creche"];
    function isEducation(company) {
      const name = (company.name || "").toLowerCase();
      const cat = (company.category || "").toLowerCase();
      const ind = (company.industry || "").toLowerCase();
      if (["education", "school", "academic"].includes(cat)) return true;
      if (["education", "academic"].includes(ind)) return true;
      return EDU_KEYWORDS.some(k => name.includes(k));
    }

    // Bucket
    const verifiedRealBiz = seeded.filter(x => x.verified && !isEducation(x));
    const realBiz = seeded.filter(x => !x.verified && !isEducation(x));
    const eduBiz = seeded.filter(x => isEducation(x));

    // Sort: verified real → real (shuffled) → education (shuffled)
    const shuffled = [
      ...shuffle(verifiedRealBiz),
      ...shuffle(realBiz),
      ...shuffle(eduBiz),
    ];

    const hasMoreSeeded = shuffled.length > limit;
    const seededPage = hasMoreSeeded ? shuffled.slice(0, limit) : shuffled;
    const lastSeeded = seededPage[seededPage.length - 1];
    const nextCursor = hasMoreSeeded && lastSeeded ? lastSeeded._id.toString() : null;

    // â”€â”€ Merge: signed-up first (only page 1), then seeded â”€â”€
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

// GET POSTS BY A COMPANY (from User account or by company name)
router.get("/:id/posts", async (req, res) => {
  try {
    const Post = (await import("../models/Post.js")).default;
    const Company = (await import("../models/Company.js")).default;
    const User = (await import("../models/User.js")).default;

    const idParam = req.params.id;

    let company = await Company.findById(idParam).lean();
    let companyUser = null;
    if (!company) {
      companyUser = await User.findById(idParam).select("name companyName").lean();
    }

    const companyName = company?.name || companyUser?.companyName || companyUser?.name;
    if (!companyName) return res.status(404).json({ message: "Company not found" });

    const orConds = [];
    if (companyUser) orConds.push({ author: companyUser._id });

    // Also match by user.companyName
    const matchingUsers = await User.find({ companyName }).select("_id").lean();
    if (matchingUsers.length) orConds.push({ author: { $in: matchingUsers.map(u => u._id) } });

    if (orConds.length === 0) return res.json({ posts: [], count: 0 });

    const posts = await Post.find({ $or: orConds, deleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("author", "name companyName profilePicture verified accountType")
      .lean();

    res.json({ posts, count: posts.length });
  } catch (error) {
    console.error("[companies/:id/posts] error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;

// ── CONTACT COMPANY (Inbox HR / Push My Profile) — Starter+ ──
router.post("/:id/contact", protect, requireTier("starter"), async (req, res) => {
  try {
    const { mode = "inbox", message = "" } = req.body; // mode: "inbox" | "push_profile"
    const Company = (await import("../models/Company.js")).default;
    const User = (await import("../models/User.js")).default;

    let company = await Company.findById(req.params.id).lean();

    // Fallback: registered company might be a User with accountType=company
    if (!company) {
      const companyUser = await User.findOne({ _id: req.params.id, accountType: "company" }).lean();
      if (companyUser) {
        company = {
          _id: companyUser._id,
          name: companyUser.companyName || companyUser.name,
          email: companyUser.email,
        };
      }
    }

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const target = await resolveCompanyTarget({ companyId: company._id, companyName: company.name });

    const defaultMsg = mode === "push_profile"
      ? `Hi, I'd like to introduce myself. Name: ${req.user.name}. ${req.user.headline || ""} Skills: ${(req.user.skills || []).join(", ")}`
      : message || `Hi, I'd like to connect.`;

    // Registered company → DM
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
      conversation.messages.push({ sender: req.user._id, text: defaultMsg });
      conversation.lastMessage = defaultMsg.slice(0, 80);
      conversation.lastMessageAt = new Date();
      await conversation.save();

      return res.json({ message: "Sent to Omnixra inbox", method: "dm", conversationId: conversation._id });
    }

    // Seed company → email
    if (target.type === "email") {
      const html = profilePushEmailHtml({
        user: req.user,
        companyName: company.name,
        message: defaultMsg,
      });
      const result = await sendEmail({
        to: target.email,
        subject: mode === "push_profile" ? `Profile: ${req.user.name}` : `New message from ${req.user.name}`,
        html,
        replyTo: req.user.email,
      });
      return res.json({
        message: result.success ? "Email sent" : "Could not send email",
        method: "email",
        success: result.success,
      });
    }

    return res.status(400).json({ message: "Company cannot be reached" });
  } catch (error) {
    console.error("Contact company error:", error);
    res.status(500).json({ message: error.message });
  }
});
