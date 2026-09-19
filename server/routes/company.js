import express from "express";
import { protect } from "../middleware/auth.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import Conversation from "../models/Conversation.js";

const router = express.Router();

// ── Company dashboard stats ──
router.get("/dashboard", protect, async (req, res) => {
  try {
    if (req.user.accountType !== "company") {
      return res.status(403).json({ message: "Company only" });
    }

    const companyName = req.user.companyName || req.user.name;
    const userId = req.user._id;

    // My jobs
    const myJobs = await Job.find({
      $or: [
        { postedBy: userId },
        { company: companyName },
      ],
    })
      .select("_id title location category status createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const jobIds = myJobs.map(j => j._id);
    const activeJobs = myJobs.filter(j => j.status !== "expired" && j.status !== "paused").length;

    // Applications to my jobs
    const totalApplications = jobIds.length > 0
      ? await Application.countDocuments({ jobId: { $in: jobIds } })
      : 0;

    // Recent applicants (top 5)
    const recentApplications = jobIds.length > 0
      ? await Application.find({ jobId: { $in: jobIds } })
          .populate("userId", "name profilePicture location headline category")
          .populate("jobId", "title company location")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean()
      : [];

    // Unread messages across all conversations
    const conversations = await Conversation.find({ participants: userId }).lean();
    let unreadMessages = 0;
    for (const conv of conversations) {
      for (const m of conv.messages || []) {
        if (String(m.sender) !== String(userId)) {
          const readBy = (m.readBy || []).map(x => String(x));
          if (!readBy.includes(String(userId))) unreadMessages++;
        }
      }
    }

    res.json({
      companyName,
      activeJobs,
      totalApplications,
      unreadMessages,
      totalJobs: myJobs.length,
      recentApplications,
      activeJobsList: myJobs.slice(0, 3),
    });
  } catch (error) {
    console.error("[company/dashboard] error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
