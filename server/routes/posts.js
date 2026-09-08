import express from "express";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { emitNewPost, emitFollowUpdate, getIO } from "../socket.js";

const router = express.Router();

// GET all posts
router.get("/", async (req, res) => {
  console.log("=== GET ALL POSTS ===");
  try {
    const posts = await Post.find({ deleted: false })
      .populate("author", "name companyName profilePicture accountType category profilePicLocked")
      .populate("comments.user", "name profilePicture profilePicLocked")
      .populate("comments.replies.user", "name profilePicture profilePicLocked")
      .sort({ createdAt: -1 });
    console.log(`Found ${posts.length} posts`);
    res.json(posts);
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET AI news posts
router.get("/news", async (req, res) => {
  try {
    const posts = await Post.find({ authorType: "ai", deleted: false })
      .populate("author", "name profilePicture")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// GET my posts
router.get("/my-posts", protect, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user._id, deleted: false })
      .populate("author", "name companyName profilePicture accountType category profilePicLocked")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// CREATE post
router.post("/", protect, async (req, res) => {
  console.log("=== CREATE POST ===");
  try {
    const { text, image, video, visibility } = req.body;
    const post = await Post.create({
      author: req.user._id,
      authorType: req.user.accountType,
      text, image, video,
      visibility: visibility || "public"
    });
    const populated = await Post.findById(post._id)
      .populate("author", "name companyName profilePicture accountType category profilePicLocked")
      .populate("comments.user", "name profilePicture profilePicLocked")
      .populate("comments.replies.user", "name profilePicture profilePicLocked");
    
    // Emit socket event for new post
    emitNewPost(populated);
    
    res.status(201).json(populated);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// DELETE post
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
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// EDIT post
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

    const populated = await Post.findById(post._id)
      .populate("author", "name companyName profilePicture accountType category profilePicLocked")
      .populate("comments.user", "name profilePicture profilePicLocked")
      .populate("comments.replies.user", "name profilePicture profilePicLocked");

    // Emit socket event
    const io = getIO();
    io.emit("post-edited", populated);

    res.json(populated);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// LIKE / UNLIKE
router.put("/:id/like", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const idx = post.likes.indexOf(req.user._id);
    if (idx > -1) post.likes.splice(idx, 1); else post.likes.push(req.user._id);
    await post.save();
    const populated = await Post.findById(post._id)
      .populate("author", "name companyName profilePicture accountType category profilePicLocked")
      .populate("comments.user", "name profilePicture profilePicLocked")
      .populate("comments.replies.user", "name profilePicture profilePicLocked");
    res.json(populated);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ADD COMMENT
router.post("/:id/comment", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.comments.push({ user: req.user._id, text: req.body.text });
    await post.save();
    const populated = await Post.findById(post._id)
      .populate("author", "name companyName profilePicture accountType category profilePicLocked")
      .populate("comments.user", "name profilePicture profilePicLocked")
      .populate("comments.replies.user", "name profilePicture profilePicLocked");
    res.json(populated);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// LIKE COMMENT
router.put("/:id/comment/:commentId/like", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const comment = post.comments.id(req.params.commentId);
    const idx = comment.likes.indexOf(req.user._id);
    if (idx > -1) comment.likes.splice(idx, 1); else comment.likes.push(req.user._id);
    await post.save();
    const populated = await Post.findById(post._id)
      .populate("author", "name companyName profilePicture accountType category profilePicLocked")
      .populate("comments.user", "name profilePicture profilePicLocked")
      .populate("comments.replies.user", "name profilePicture profilePicLocked");
    res.json(populated);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// REPLY
router.post("/:id/comment/:commentId/reply", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const comment = post.comments.id(req.params.commentId);
    comment.replies.push({ user: req.user._id, text: req.body.text });
    await post.save();
    const populated = await Post.findById(post._id)
      .populate("author", "name companyName profilePicture accountType category profilePicLocked")
      .populate("comments.user", "name profilePicture profilePicLocked")
      .populate("comments.replies.user", "name profilePicture profilePicLocked");
    res.json(populated);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// FOLLOW USER (now uses both connections and followingUsers)
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
    
    // Also update target's followers array
    const targetUser = await User.findById(targetId);
    if (targetUser) {
      if (isFollowing) {
        if (!targetUser.followers.includes(req.user._id)) {
          targetUser.followers.push(req.user._id);
        }
      } else {
        const followerIdx = targetUser.followers.indexOf(req.user._id);
        if (followerIdx > -1) {
          targetUser.followers.splice(followerIdx, 1);
        }
      }
      await targetUser.save();
    }
    
    // Emit socket event
    emitFollowUpdate(targetId, req.user._id, isFollowing);
    
    res.json({ following: currentUser.followingUsers, isFollowing });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

export default router;
