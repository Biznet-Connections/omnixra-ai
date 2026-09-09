import express from "express";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// GET ALL POSTS — SUPER FAST, NO PROFILE PICS, NO IMAGES, NO COMMENTS
router.get("/", async (req, res) => {
  console.log("=== GET ALL POSTS (ULTRA LIGHT) ===");
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ deleted: false })
      .select("-image -video -thumbnailUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get authors WITHOUT profilePicture
    const authorIds = [...new Set(posts.map(p => p.author?.toString()).filter(Boolean))];
    const authors = await User.find({ _id: { $in: authorIds } })
      .select("-password -profilePicture -skills -about")
      .lean();
    const authorMap = {};
    authors.forEach(a => { authorMap[a._id.toString()] = a; });

    const result = posts.map(post => ({
      _id: post._id,
      text: post.text,
      hasImage: !!post.image,
      hasVideo: !!post.video,
      mediaType: post.mediaType,
      authorType: post.authorType,
      author: {
        _id: post.author,
        name: authorMap[post.author?.toString()]?.name || "User",
        headline: authorMap[post.author?.toString()]?.headline || "Professional",
        category: authorMap[post.author?.toString()]?.category || "General",
        hasProfilePic: !!authorMap[post.author?.toString()]?.profilePicture,
        profilePicLocked: authorMap[post.author?.toString()]?.profilePicLocked || false
      },
      likes: typeof post.likes === "number" ? post.likes : 0,
      createdAt: post.createdAt,
      visibility: post.visibility,
      totalComments: post.comments?.length || 0,
      comments: []
    }));

    console.log(`Serving ${result.length} ULTRA LIGHT posts`);
    res.json(result);
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET SINGLE POST — full details
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "name profilePicture profilePicLocked headline category companyName")
      .populate("comments.user", "name profilePicture profilePicLocked")
      .populate("comments.replies.user", "name profilePicture profilePicLocked")
      .lean();
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.likes = typeof post.likes === "number" ? post.likes : 0;
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE POST
router.post("/", protect, async (req, res) => {
  try {
    const { text, image, video, visibility } = req.body;
    const post = await Post.create({
      author: req.user._id,
      authorType: req.user.accountType,
      text, image, video,
      visibility: visibility || "public",
      likes: 0,
      comments: []
    });
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// LIKE
router.put("/:id/like", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.likes = (post.likes || 0) + 1;
    await post.save();
    res.json({ likes: post.likes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ADD COMMENT
router.post("/:id/comment", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.comments.push({ user: req.user._id, text: req.body.text, likes: 0, replies: [] });
    await post.save();
    res.json({ success: true, totalComments: post.comments.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// FOLLOW USER
router.put("/follow-user/:userId", protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const idx = currentUser.connections.indexOf(req.params.userId);
    if (idx > -1) currentUser.connections.splice(idx, 1);
    else currentUser.connections.push(req.params.userId);
    await currentUser.save();
    res.json({ connections: currentUser.connections, following: idx === -1 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
