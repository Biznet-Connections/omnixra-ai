import express from "express";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// DEBUG LOG ENDPOINT
router.post("/debug/log", (req, res) => {
  console.log("🔥 BROWSER LOG:", req.body.message || JSON.stringify(req.body));
  res.json({ ok: true });
});

// GET ALL POSTS - Paginated, with full author data (including profile pics)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 7;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ deleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get authors WITH profilePicture
    const authorIds = [...new Set(posts.map(p => p.author?.toString()).filter(Boolean))];
    const authors = await User.find({ _id: { $in: authorIds } })
      .select("-password -skills -about")
      .lean();
    const authorMap = {};
    authors.forEach(a => { authorMap[a._id.toString()] = a; });

    const result = posts.map(post => ({
      _id: post._id,
      text: post.text,
      image: post.image || null,
      video: post.video || null,
      hasImage: !!post.image,
      hasVideo: !!post.video,
      mediaType: post.mediaType,
      authorType: post.authorType,
      author: authorMap[post.author?.toString()] ? {
        _id: post.author,
        name: authorMap[post.author.toString()].name,
        headline: authorMap[post.author.toString()].headline,
        category: authorMap[post.author.toString()].category,
        profilePicture: authorMap[post.author.toString()].profilePicture || null,
        profilePicLocked: authorMap[post.author.toString()].profilePicLocked || false,
        accountType: authorMap[post.author.toString()].accountType
      } : {
        _id: post.author,
        name: "User",
        headline: "Professional",
        category: "General",
        profilePicture: null,
        profilePicLocked: false
      },
      likes: typeof post.likes === "number" ? post.likes : 0,
      totalComments: post.comments?.length || 0,
      shares: post.shares || 0,
      comments: [],
      createdAt: post.createdAt,
      visibility: post.visibility,
      edited: post.edited || false
    }));

    const totalPosts = await Post.countDocuments({ deleted: false });
    const hasMore = page * limit < totalPosts;

    res.json({ posts: result, hasMore, nextPage: page + 1, totalPosts });
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET AI NEWS POSTS
router.get("/news", async (req, res) => {
  try {
    const posts = await Post.find({ authorType: "ai", deleted: false })
      .sort({ createdAt: -1 })
      .populate("author", "name profilePicture profilePicLocked")
      .lean();
    res.json(posts);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// GET MY POSTS
router.get("/my-posts", protect, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user._id, deleted: false })
      .sort({ createdAt: -1 })
      .populate("author", "name profilePicture profilePicLocked headline category companyName")
      .lean();
    res.json(posts);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// GET COMMENTS for a post
router.get("/:id/comments", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("comments.user", "name profilePicture profilePicLocked")
      .populate("comments.replies.user", "name profilePicture profilePicLocked")
      .lean();
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ comments: post.comments || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET SINGLE POST
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "name profilePicture profilePicLocked headline category companyName")
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
    
    const populated = await Post.findById(post._id)
      .populate("comments.user", "name profilePicture profilePicLocked")
      .populate("comments.replies.user", "name profilePicture profilePicLocked")
      .lean();
    res.json({ comments: populated.comments || [], totalComments: post.comments.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// REPLY TO COMMENT
router.post("/:id/comment/:commentId/reply", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    comment.replies.push({ user: req.user._id, text: req.body.text });
    await post.save();

    const populated = await Post.findById(post._id)
      .populate("comments.user", "name profilePicture profilePicLocked")
      .populate("comments.replies.user", "name profilePicture profilePicLocked")
      .lean();
    res.json({ comments: populated.comments || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// LIKE COMMENT
router.put("/:id/comment/:commentId/like", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    comment.likes = (comment.likes || 0) + 1;
    await post.save();

    const populated = await Post.findById(post._id)
      .populate("comments.user", "name profilePicture profilePicLocked")
      .populate("comments.replies.user", "name profilePicture profilePicLocked")
      .lean();
    res.json({ comments: populated.comments || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// SHARE
router.post("/:id/share", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.shares = (post.shares || 0) + 1;
    await post.save();
    res.json({ shares: post.shares });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// EDIT POST
router.put("/:id/edit", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    post.text = req.body.text || post.text;
    post.edited = true;
    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE POST
router.delete("/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const isAuthor = post.author.toString() === req.user._id.toString();
    const isAdmin = req.user.accountType === "admin";
    if (!isAuthor && !isAdmin) return res.status(403).json({ message: "Not authorized" });
    post.deleted = true;
    await post.save();
    res.json({ message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// FOLLOW USER
router.put("/follow-user/:userId", protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const targetId = req.params.userId;
    const idx = currentUser.followingUsers.indexOf(targetId);
    let isFollowing;
    if (idx > -1) {
      currentUser.followingUsers.splice(idx, 1);
      isFollowing = false;
    } else {
      currentUser.followingUsers.push(targetId);
      isFollowing = true;
    }
    await currentUser.save();

    const targetUser = await User.findById(targetId);
    if (targetUser) {
      if (isFollowing) {
        if (!targetUser.followers.includes(req.user._id)) targetUser.followers.push(req.user._id);
      } else {
        const fidx = targetUser.followers.indexOf(req.user._id);
        if (fidx > -1) targetUser.followers.splice(fidx, 1);
      }
      await targetUser.save();
    }
    res.json({ following: currentUser.followingUsers, isFollowing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
