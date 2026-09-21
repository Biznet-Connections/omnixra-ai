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

    // Atomic update — avoids VersionError race when device registers twice quickly.
    // 1. Pull any existing entry for this token (dedupe)
    // 2. Push the fresh entry
    // 3. Slice to last 5
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { fcmTokens: { token } } },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        fcmTokens: {
          $each: [{ token, platform: platform || "android", createdAt: new Date() }],
          $slice: -5,
        },
      },
    });

    const fresh = await User.findById(req.user._id).select("fcmTokens").lean();
    const count = (fresh?.fcmTokens || []).length;
    console.log("Token registered for user", String(req.user._id), "-", count, "total");
    res.json({ success: true, count });
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

router.get('/preferences', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPrefs');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.notificationPrefs || { jobAlerts: true, news: true, social: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/preferences', protect, async (req, res) => {
  try {
    const body = req.body || {};
    const updates = {};
    if (typeof body.jobAlerts === 'boolean') updates['notificationPrefs.jobAlerts'] = body.jobAlerts;
    if (typeof body.news === 'boolean') updates['notificationPrefs.news'] = body.news;
    if (typeof body.social === 'boolean') updates['notificationPrefs.social'] = body.social;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid preferences provided' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).select('notificationPrefs');
    console.log('[PUSH PREFS] Updated for user', String(req.user._id).slice(-6), updates);
    res.json(user.notificationPrefs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/test-flush', protect, async (req, res) => {
  try {
    const { flushJobBatches } = await import('../utils/notifyBatcher.js');
    const result = await flushJobBatches({ force: true });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/test-news', protect, async (req, res) => {
  try {
    const Post = (await import('../models/Post.js')).default;
    const newsPost = await Post.findOne({ authorType: 'ai' }).sort({ createdAt: -1 }).lean();
    if (!newsPost) return res.status(404).json({ message: 'No AI news post found' });
    const { default: serverModule } = await import('../server.js').catch(() => ({ default: null }));
    res.json({ ok: true, message: 'News push helper is inside server.js; trigger manually by restarting the server', postId: newsPost._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
