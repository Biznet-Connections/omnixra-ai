import express from "express";
import Voucher from "../models/Voucher.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// REDEEM VOUCHER
router.post("/redeem", protect, async (req, res) => {
  try {
    const { code } = req.body;

    const voucher = await Voucher.findOne({ code: code.toUpperCase() });

    if (!voucher) {
      return res.status(404).json({ message: "Invalid voucher code" });
    }

    if (voucher.used) {
      return res.status(400).json({ message: "Voucher already used" });
    }

    if (voucher.expiresAt && new Date() > voucher.expiresAt) {
      return res.status(400).json({ message: "Voucher expired" });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + voucher.durationDays);

    voucher.used = true;
    voucher.usedBy = req.user._id;
    await voucher.save();

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        isPremium: true,
        premiumVoucher: voucher.code,
        premiumExpiresAt: expiresAt
      },
      { new: true }
    );

    res.json({
      message: "Voucher redeemed successfully",
      isPremium: user.isPremium,
      premiumExpiresAt: user.premiumExpiresAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
