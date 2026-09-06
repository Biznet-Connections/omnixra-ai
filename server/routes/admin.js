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
    const users = await User.countDocuments();
    const jobs = await Job.countDocuments();
    const vouchers = await Voucher.countDocuments();
    const companies = await Company.countDocuments();
    res.json({ users, jobs, vouchers, companies });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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

export default router;
