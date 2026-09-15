import express from "express";
import { protect } from "../middleware/auth.js";
import User from "../models/User.js";
import { isFirebaseReady, sendPushToUser } from "../utils/fcm.js";

const router = express.Router();

// Register (or refresh) a device token for the current user
router.post("/register-token", protect, async (req, res) => {
  try {
    const { token, platform } = req.body || {};
    if (!token) return res.status(400).json({ message: "token required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.fcmTokens) user.fcmTokens = [];

    // Remove duplicates (same token)
    user.fcmTokens = user.fcmTokens.filter((t) => (t && t.token) !== token);

    user.fcmTokens.push({
      token,
      platform: platform || "android",
      createdAt: new Date(),
    });

    // Cap to last 5 devices
    if (user.fcmTokens.length > 5) {
      user.fcmTokens = user.fcmTokens.slice(-5);
    }

    await user.save();
    console.log("Token registered for user", String(user._id), "-", user.fcmTokens.length, "total");
    res.json({ success: true, count: user.fcmTokens.length });
  } catch (err) {
    console.error("Register token error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Remove a token (on logout or toggle off)
router.delete("/unregister-token", protect, async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ message: "token required" });

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { fcmTokens: { token } },
    });

    console.log("Token removed for user", String(req.user._id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send a test push to the current user (handy for verification)
router.get("/test", protect, async (req, res) => {
  try {
    const ready = await isFirebaseReady();
    if (!ready) return res.status(503).json({ message: "Firebase not initialized" });

    const user = await User.findById(req.user._id);
    const result = await sendPushToUser(user, {
      title: "Test from Omnixra",
      body: "If you see this, push is working!",
      data: { type: "test", screen: "home" },
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
