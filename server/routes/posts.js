import express from "express";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { cacheShort } from "../middleware/cache.js";
import { uploadToR2, isBase64Image, parseBase64Image } from "../utils/r2.js";

const router = express.Router();

// DEBUG LOG ENDPOINT
router.post("/debug/log", (req, res) => {
  console.log("🔥 BROWSER LOG:", req.body.message || JSON.stringify(req.body));
  res.json({ ok: true });
});

// BATCH LOG ENDPOINT
router.post("/debug/log-batch", (req, res) => {
  const logs = req.body.logs || [];
  logs.forEach(line => console.log("📱", line));
  res.json({ ok: true, count: logs.length });
});

// GET ALL POSTS — Cursor pagination (scales to millions)
// Query: ?limit=10&cursor=<lastPostId>
router.get("/", cacheShort(30, 60), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);
    const cursor = req.query.cursor;

    const query = { deleted: false };
    if (cursor) query._id = { $lt: cursor };

    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .select("text image video mediaType authorType author likes comments shares createdAt visibility edited")
      .lean();

    const hasMore = posts.length > limit;
    const pageItems = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? pageItems[pageItems.length - 1]._id.toString() : null;

    const authorIds = [...new Set(pageItems.map(p => p.author?.toString()).filter(Boolean))];
    const authors = await User.find({ _id: { $in: authorIds } })
      .select("name headline category profilePicture profilePicLocked accountType")
      .lean();
    const authorMap = {};
    authors.forEach(a => { authorMap[a._id.toString()] = a; });

    const result = pageItems.map(post => {
      const author = authorMap[post.author?.toString()];
      return {
        _id: post._id,
        text: post.text,
        image: post.image || null,
        video: post.video || null,
        hasImage: !!post.image,
        hasVideo: !!post.video,
        mediaType: post.mediaType,
        authorType: post.authorType,
        author: author ? {
          _id: post.author,
          name: author.name,
          headline: author.headline,
          category: author.category,
          profilePicture: author.profilePicture || null,
          profilePicLocked: author.profilePicLocked || false,
          accountType: author.accountType
        } : {
          _id: post.author,
          name: "User",
          headline: "Professional",
          category: "General",
          profilePicture: null,
          profilePicLocked: false
        },
        likes: typeof post.likes === "number" ? post.likes : 0,
        totalComments: Array.isArray(post.comments) ? post.comments.length : 0,
        shares: post.shares || 0,
        comments: [],
        createdAt: post.createdAt,
        visibility: post.visibility,
        edited: post.edited || false
      };
    });

    res.json({
      posts: result,
      hasMore,
      nextCursor,
      count: result.length
    });
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET AI NEWS POSTS
router.get("/news", cacheShort(120, 240), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const posts = await Post.find({ authorType: "ai", deleted: false })
      .sort({ _id: -1 })
      .limit(limit)
      .populate("author", "name profilePicture profilePicLocked")
      .lean();
    res.json(posts);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// GET MY POSTS
router.get("/my-posts", protect, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;
    const query = { author: req.user._id, deleted: false };
    if (cursor) query._id = { $lt: cursor };

    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate("author", "name profilePicture profilePicLocked headline category companyName")
      .lean();

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? items[items.length - 1]._id.toString() : null;

    res.json({ posts: items, hasMore, nextCursor });
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

    // Upload image to R2 if it's base64
    let imageUrl = image;
    if (image && isBase64Image(image)) {
      const parsed = parseBase64Image(image);
      if (parsed) {
        console.log("📤 Uploading post image to R2...");
        imageUrl = await uploadToR2(parsed.buffer, parsed.mimetype, "posts");
      }
    }

    // Upload video to R2 if it's base64 (large)
    let videoUrl = video;
    // Videos are usually sent as URLs already from VideoTrimmer — keep as-is

    const post = await Post.create({
      author: req.user._id,
      authorType: req.user.accountType,
      text, image: imageUrl, video: videoUrl,
      visibility: visibility || "public",
      likes: 0,
      comments: []
    });

    // Return populated post so author shows correctly on frontend
    const populated = await Post.findById(post._id)
      .populate("author", "name profilePicture profilePicLocked headline category companyName accountType")
      .lean();

    res.status(201).json({
      ...populated,
      likes: typeof populated.likes === "number" ? populated.likes : 0,
      totalComments: populated.comments?.length || 0,
      shares: populated.shares || 0,
      comments: populated.comments || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// LIKE
router.put("/:id/like", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Handle legacy array format
    let currentLikes = Array.isArray(post.likes) ? post.likes.length : (Number(post.likes) || 0);

    // Check action - "unlike" decrements, otherwise increments
    const action = req.body?.action || "like";
    if (action === "unlike") {
      post.likes = Math.max(0, currentLikes - 1);
    } else {
      post.likes = currentLikes + 1;
    }

    await post.save();
    const populated = await Post.findById(post._id)
      .populate("author", "name profilePicture profilePicLocked headline category companyName accountType")
      .lean();
    res.json({
      ...populated,
      likes: typeof populated.likes === "number" ? populated.likes : 0,
      totalComments: populated.comments?.length || 0,
      shares: populated.shares || 0,
      action
    });
  } catch (error) {
    console.error("Like error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// ADD COMMENT
router.post("/:id/comment", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.comments.push({ user: req.user._id, text: req.body.text, likes: 0, replies: [] });
    // Ensure likes is a number in case legacy array snuck in
    if (Array.isArray(post.likes)) post.likes = post.likes.length;
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
