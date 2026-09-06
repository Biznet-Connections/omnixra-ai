import express from "express";
import Boost from "../models/Boost.js";
import Voucher from "../models/Voucher.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// CREATE BOOST
router.post("/", protect, async (req, res) => {
  console.log(`=== CREATE BOOST ===`);
  try {
    const { type, postId, reach, price, voucherCode } = req.body;

    // Verify voucher if provided
    if (voucherCode) {
      const voucher = await Voucher.findOne({ code: voucherCode.toUpperCase(), used: false });
      if (!voucher) return res.status(400).json({ message: "Invalid voucher code" });
      
      voucher.used = true;
      voucher.usedBy = req.user._id;
      await voucher.save();
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const boost = await Boost.create({
      userId: req.user._id,
      type,
      postId,
      reach,
      price,
      status: "active",
      voucherCode,
      expiresAt
    });

    res.status(201).json({ message: "Boost activated successfully!", boost });
  } catch (error) {
    console.error("Boost error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET MY BOOSTS
router.get("/", protect, async (req, res) => {
  try {
    const boosts = await Boost.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(boosts);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

export default router;
