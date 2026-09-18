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
router.get("/", cacheShort(60, 120), async (req, res) => {
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
