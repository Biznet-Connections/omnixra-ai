import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// GET USER BY ID
router.get("/user/:id", protect, async (req, res) => {
  console.log(`=== GET USER PROFILE: ${req.params.id} ===`);
  try {
    const user = await User.findById(req.params.id)
      .populate("connections", "name profilePicture headline profilePicLocked")
      .populate("followers", "name profilePicture headline profilePicLocked")
      .select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.profilePicLocked) user.profilePicture = undefined;

    const posts = await Post.find({
      author: user._id,
      deleted: false,
      $or: [{ visibility: "public" }, { visibility: { $exists: false } }]
    })
      .populate("author", "name profilePicture profilePicLocked")
      .sort({ createdAt: -1 });

    console.log(`Found ${posts.length} posts for ${user.name}`);

    const isFollowing = req.user.followingUsers?.some(id => id.toString() === user._id.toString()) || false;
    const isConnected = req.user.connections?.some(id => id.toString() === user._id.toString()) || false;
    console.log("isFollowing:", isFollowing, "isConnected:", isConnected);

    res.json({
      user,
      posts,
      isFollowing,
      isConnected,
      stats: {
        connections: user.connections?.length || 0,
        followers: user.followers?.length || 0,
        posts: posts.length,
        likes: posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0)
      }
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET MY PROFILE
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("connections", "name profilePicture headline profilePicLocked")
      .populate("following", "name industry location")
      .populate("followers", "name profilePicture headline profilePicLocked")
      .populate("followingUsers", "name profilePicture headline profilePicLocked")
      .select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE PROFILE PICTURE
router.put("/update-picture", protect, async (req, res) => {
  try {
    const { profilePicture, profilePicLocked } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { profilePicture, profilePicLocked }, { new: true }).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// REQUEST VERIFICATION
router.put("/request-verification", protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { verifiedRequested: true }, { new: true }).select("-password");
    res.json({ message: "Verification requested", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET VIEWS
router.get("/views", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("profileViews.viewer", "name profilePicture headline profilePicLocked")
      .populate("companyViews.company", "name industry location");
    res.json({ profileViews: user.profileViews, companyViews: user.companyViews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// RECORD PROFILE VIEW
router.post("/record-view/:userId", protect, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (targetUser._id.toString() === req.user._id.toString()) return res.json({ message: "Own view" });
    const existing = targetUser.profileViews.find(v => v.viewer.toString() === req.user._id.toString());
    if (!existing) {
      targetUser.profileViews.push({ viewer: req.user._id, viewerType: req.user.accountType });
      await targetUser.save();
    }
    res.json({ message: "View recorded" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// RECORD COMPANY VIEW
router.post("/record-company-view/:companyId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const existing = user.companyViews.find(v => v.company.toString() === req.params.companyId);
    if (!existing) {
      user.companyViews.push({ company: req.params.companyId });
      await user.save();
    }
    res.json({ message: "Company view recorded" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET SAVED POSTS
router.get("/saved-posts", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({ path: "savedPosts", populate: { path: "author", select: "name profilePicture profilePicLocked" } });
    res.json(user.savedPosts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// SAVE POST
router.put("/save-post/:postId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const idx = user.savedPosts.indexOf(req.params.postId);
    if (idx > -1) user.savedPosts.splice(idx, 1); else user.savedPosts.push(req.params.postId);
    await user.save();
    res.json({ savedPosts: user.savedPosts, saved: idx === -1 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE PROFILE
router.put("/update", protect, async (req, res) => {
  try {
    const { name, headline, location, skills, about, companyName } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (headline !== undefined) updateData.headline = headline;
    if (location !== undefined) updateData.location = location;
    if (skills !== undefined) updateData.skills = skills;
    if (about !== undefined) updateData.about = about;
    if (companyName !== undefined) updateData.companyName = companyName;
    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true }).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// FOLLOW COMPANY
router.put("/follow-company/:companyId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const idx = user.following.indexOf(req.params.companyId);
    if (idx > -1) user.following.splice(idx, 1); else user.following.push(req.params.companyId);
    await user.save();
    res.json({ following: user.following, followed: idx === -1 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CONNECT (legacy - for backwards compatibility)
router.put("/connect/:userId", protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const idx = currentUser.connections.indexOf(req.params.userId);
    if (idx > -1) currentUser.connections.splice(idx, 1); else currentUser.connections.push(req.params.userId);
    await currentUser.save();
    res.json({ connections: currentUser.connections, connected: idx === -1 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
