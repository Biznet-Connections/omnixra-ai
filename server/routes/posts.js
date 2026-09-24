import express from "express";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { cacheShort, invalidateFeedCache, invalidatePostCache } from "../middleware/cache.js";
import { uploadToR2, isBase64Image, parseBase64Image, buildPublicUrl } from "../utils/r2.js";
import { emitPostLiked, emitPostCommented } from "../socket.js";
import { notifyPostAuthor, notifyNewFollower } from "../utils/notify.js";
import { notifyComment, notifyMention } from "../utils/createNotification.js";
import Channel from "../models/Channel.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// DEBUG LOG ENDPOINT
router.post("/debug/log", (req, res) => {
  console.log("ðŸ”¥ BROWSER LOG:", req.body.message || JSON.stringify(req.body));
  res.json({ ok: true });
});

// BATCH LOG ENDPOINT
router.post("/debug/log-batch", (req, res) => {
  const logs = req.body.logs || [];
  logs.forEach(line => console.log("ðŸ“±", line));
  res.json({ ok: true, count: logs.length });
});


// â”€â”€ Feed diversity: prevent same author appearing twice in a row â”€â”€
// Keeps order mostly stable but spreads posts by the same author.
// Uses a greedy pass: for each position, pick the first post whose
// author differs from the previous one. If stuck, fall back to original.
function diversifyPosts(posts) {
  if (!Array.isArray(posts) || posts.length < 2) return posts;

  // Group posts by author (chronological within each group)
  const byAuthor = new Map();
  for (const p of posts) {
    const a = (p.author && p.author._id) ? String(p.author._id) : (p.author ? String(p.author) : "__anon__");
    if (!byAuthor.has(a)) byAuthor.set(a, []);
    byAuthor.get(a).push(p);
  }

  // Greedy max-spread: at each step, pick the author with the MOST
  // remaining posts, but skip if they match the last emitted author.
  // If forced to repeat, we take the next-best author.
  const result = [];
  let lastAuthor = null;

  while (true) {
    // Build a list of candidates sorted by remaining count desc
    const candidates = [];
    for (const [author, list] of byAuthor.entries()) {
      if (list.length > 0) candidates.push({ author, list, count: list.length });
    }
    if (candidates.length === 0) break;

    candidates.sort((a, b) => b.count - a.count);

    // Prefer an author that differs from lastAuthor
    let chosen = candidates.find(c => c.author !== lastAuthor);
    // If none differs (all remaining are same author), take the top
    if (!chosen) chosen = candidates[0];

    const post = chosen.list.shift();
    result.push(post);
    lastAuthor = chosen.author;
  }

  return result;
}

// GET ALL POSTS â€” Cursor pagination (scales to millions)
// Query: ?limit=10&cursor=<lastPostId>
router.get("/", cacheShort(30, 60), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);
    const cursor = req.query.cursor;

    // Compound cursor (createdAt + _id) so ordering is stable even when
    // many docs share the same createdAt millisecond.
    const query = { deleted: false, channelId: null };
    if (cursor) {
      // Look up the cursor's createdAt so we can do a stable (createdAt, _id) pagination
      const last = await Post.findById(cursor).select("createdAt _id").lean();
      if (last) {
        query.$or = [
          { createdAt: { $lt: last.createdAt } },
          { createdAt: last.createdAt, _id: { $lt: last._id } }
        ];
      } else {
        // Cursor doc no longer exists â€” just fall back to plain _id pagination
        query._id = { $lt: cursor };
      }
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .select("text image images video mediaType authorType author likes comments shares createdAt visibility edited")
      .lean();

    const hasMore = posts.length > limit;
    const pageItems = hasMore ? posts.slice(0, limit) : posts;
    // Only set nextCursor if there is at least one item to point at
    const nextCursor = pageItems.length > 0
      ? pageItems[pageItems.length - 1]._id.toString()
      : null;

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
        images: Array.isArray(post.images) ? post.images : [],
        video: post.video || null,
        thumbnailUrl: post.thumbnailUrl || null,
        trimStart: post.trimStart || 0,
        trimEnd: post.trimEnd || 0,
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

// GET /random â€” 30 posts from a random position (Facebook-style refresh)
router.get("/random", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 50);
    const total = await Post.countDocuments({ deleted: false });

    if (total === 0) return res.json({ posts: [] });

    const maxSkip = Math.max(0, total - limit);
    const randomSkip = Math.floor(Math.random() * (maxSkip + 1));

    const posts = await Post.find({ deleted: false, channelId: null })
      .sort({ createdAt: -1 })
      .skip(randomSkip)
      .limit(limit)
      .select("text image images video mediaType authorType author likes comments shares createdAt visibility edited")
      .lean();

    // Hydrate authors
    const authorIds = [...new Set(posts.map(p => p.author?.toString()).filter(Boolean))];
    const authors = await User.find({ _id: { $in: authorIds } })
      .select("name headline category profilePicture profilePicLocked accountType")
      .lean();
    const authorMap = {};
    authors.forEach(a => { authorMap[a._id.toString()] = a; });

    const result = posts.map(post => {
      const author = authorMap[post.author?.toString()];
      return {
        _id: post._id,
        text: post.text,
        image: post.image || null,
        images: Array.isArray(post.images) ? post.images : [],
        video: post.video || null,
        thumbnailUrl: post.thumbnailUrl || null,
        trimStart: post.trimStart || 0,
        trimEnd: post.trimEnd || 0,
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

    const diversified = diversifyPosts(result);
    res.json({ posts: diversified, skip: randomSkip, total });
  } catch (error) {
    console.error("Random posts error:", error);
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
    if (cursor) {
      const last = await Post.findById(cursor).select("createdAt _id").lean();
      if (last) {
        query.$or = [
          { createdAt: { $lt: last.createdAt } },
          { createdAt: last.createdAt, _id: { $lt: last._id } }
        ];
      } else {
        query._id = { $lt: cursor };
      }
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate("author", "name profilePicture profilePicLocked headline category companyName")
      .lean();

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = items.length > 0 ? items[items.length - 1]._id.toString() : null;

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
    const { text, image, images, video, videoKey, thumbnailUrl, trimStart, trimEnd, visibility, channelId } = req.body;

    // ðŸ” DEBUG â€” confirm what actually arrives from PostComposer
    console.log("ðŸ“ [POST /posts] body received:", {
      textLen: typeof text === "string" ? text.length : 0,
      textPreview: typeof text === "string" ? text.slice(0, 60) : null,
      hasImage: !!image,
      imageIsBase64: typeof image === "string" && image.startsWith("data:"),
      hasVideo: !!video,
      hasVideoKey: !!videoKey,
      hasThumbnail: !!thumbnailUrl,
      trimStart: trimStart || 0,
      trimEnd: trimEnd || 0,
      visibility: visibility || "public",
    });

    // Upload image to R2 if it's base64
    let imageUrl = image;
    let imageUrls = [];

    // Multi-image upload (parallel with concurrency 3)
    if (Array.isArray(images) && images.length > 0) {
      console.log(`[multi-image] START — count: ${images.length}`);
      const limited = images.slice(0, 10);
      const CONCURRENCY = 3;
      const queue = [...limited];
      const results = new Array(limited.length);

      async function uploadOne(idx, data) {
        try {
          // Already a URL
          if (typeof data === "string" && data.startsWith("http")) {
            results[idx] = data;
            console.log(`[multi-image ${idx}] already URL`);
            return;
          }
          // Base64 data URL — parse and upload buffer like single-image path does
          if (typeof data === "string" && data.startsWith("data:")) {
            const parsed = parseBase64Image(data);
            if (!parsed) {
              console.warn(`[multi-image ${idx}] parseBase64Image failed`);
              results[idx] = null;
              return;
            }
            const up = await uploadToR2(parsed.buffer, parsed.mimetype, "posts");
            results[idx] = (typeof up === "string") ? up : (up?.url || null);
            console.log(`[multi-image ${idx}] uploaded →`, results[idx]?.slice(0, 80));
            return;
          }
          console.warn(`[multi-image ${idx}] unknown format — skipping`);
          results[idx] = null;
        } catch (e) {
          console.warn(`[multi-image ${idx}] failed:`, e.message);
          results[idx] = null;
        }
      }

      // Worker pool
      const workers = Array.from({ length: CONCURRENCY }).map(async () => {
        while (queue.length) {
          const item = queue.shift();
          if (!item) continue;
          await uploadOne(item.idx, item.data);
        }
      });

      limited.forEach((data, idx) => queue.push({ idx, data }));
      await Promise.all(workers);
      imageUrls = results.filter(Boolean);
      console.log(`[multi-image] DONE — uploaded ${imageUrls.length}/${limited.length}`);
    } else {
      if (images !== undefined) {
        console.log(`[multi-image] SKIP — images is not array or empty. typeof: ${typeof images}, isArray: ${Array.isArray(images)}`);
      }
    }
    if (image && isBase64Image(image)) {
      const parsed = parseBase64Image(image);
      if (parsed) {
        console.log("ðŸ“¤ Uploading post image to R2...");
        imageUrl = await uploadToR2(parsed.buffer, parsed.mimetype, "posts");
      }
    }

    // Upload video to R2 if it's base64 (large)
    let videoUrl = video;
    // Videos are usually sent as URLs already from VideoTrimmer â€” keep as-is

    // Phase 7A: resolve videoKey to public R2 URL before saving
    if (videoKey) {
      const { buildPublicUrl } = await import("../utils/r2.js");
      videoUrl = buildPublicUrl(videoKey);
      console.log("[POST] videoKey resolved to:", videoUrl);
    }

    // If posting to a channel, verify user is admin
    let targetChannel = null;
    if (channelId) {
      targetChannel = await Channel.findById(channelId);
      if (!targetChannel || targetChannel.deleted) {
        return res.status(404).json({ message: "Channel not found" });
      }
      if (!targetChannel.isAdmin(req.user._id)) {
        return res.status(403).json({ message: "Only channel admins can post" });
      }
    }

    const post = await Post.create({
      author: req.user._id,
      authorType: req.user.accountType,
      text, image: imageUrl,
      images: imageUrls, video: videoUrl, thumbnailUrl: thumbnailUrl || null, channelId: channelId || null,
      trimStart: Number(trimStart) || 0,
      trimEnd: Number(trimEnd) || 0,
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

    // â”€â”€ Scoped real-time emit (post room + feed only) â”€â”€
    try {
      const likeCount = typeof populated.likes === "number" ? populated.likes : 0;
      emitPostLiked(post._id.toString(), likeCount);
    } catch (e) { console.warn("emitPostLiked failed:", e.message); }

    // Push notification to post author (if liked, not unlike, and not self)
    try {
      const authorId = post.author?.toString();
      const actorId = req.user._id?.toString();
      if (action !== "unlike" && authorId && authorId !== actorId) {
        notifyPostAuthor(authorId, req.user.name || "Someone", "like", {
          postId: post._id.toString(),
        }).catch(() => {});
      }
    } catch (e) {}

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

    const text = String(req.body.text || "").slice(0, 2000);
    const mentions = Array.isArray(req.body.mentions) ? req.body.mentions.map(String) : [];

    const newComment = {
      user: req.user._id,
      text,
      likes: 0,
      replies: [],
      mentions: mentions,  // structured — survives username changes
    };
    post.comments.push(newComment);
    if (Array.isArray(post.likes)) post.likes = post.likes.length;
    await post.save();

    // Get the just-created comment's _id (last item)
    const createdComment = post.comments[post.comments.length - 1];

    const populated = await Post.findById(post._id)
      .populate("comments.user", "name profilePicture profilePicLocked")
      .populate("comments.replies.user", "name profilePicture profilePicLocked")
      .lean();

    // ── Scoped real-time emit ──
    try {
      emitPostCommented(post._id.toString(), populated.comments || [], post.comments.length);
    } catch (e) { console.warn("emitPostCommented failed:", e.message); }

    const actor = { _id: req.user._id, name: req.user.name, profilePicture: req.user.profilePicture };
    const postAuthorId = post.author?.toString();
    const actorId = req.user._id?.toString();
    const preview = text.slice(0, 80);

    // ── Notify post author (if not self) ──
    if (postAuthorId && postAuthorId !== actorId) {
      notifyComment({
        recipientId: postAuthorId,
        actorUser: actor,
        post: post._id,
        commentId: createdComment._id,
        preview,
      }).catch((e) => console.warn("notifyComment failed:", e.message));
    }

    // ── Notify each mentioned user (deduped, skip self + skip post author — they got comment notif already) ──
    const uniqueMentions = [...new Set(mentions.map(String))];
    for (const mentionedId of uniqueMentions) {
      if (mentionedId === actorId) continue;               // don't notify self
      if (mentionedId === postAuthorId) continue;          // author already got comment notif
      notifyMention({
        recipientId: mentionedId,
        actorUser: actor,
        post: post._id,
        commentId: createdComment._id,
        preview: text,
      }).catch((e) => console.warn("notifyMention failed:", e.message));
    }

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

    // Push notification to original commenter
    try {
      const originalCommenterId = comment.user?.toString();
      const actorId = req.user._id?.toString();
      if (originalCommenterId && originalCommenterId !== actorId) {
        notifyPostAuthor(originalCommenterId, req.user.name || "Someone", "reply", {
          postId: post._id.toString(),
          preview: (req.body.text || "").slice(0, 80),
        }).catch(() => {});
      }
    } catch (e) {}

    const populated = await Post.findById(post._id)
      .populate("comments.user", "name profilePicture profilePicLocked")
      .populate("comments.replies.user", "name profilePicture profilePicLocked")
      .lean();
    res.json({ comments: populated.comments || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE A COMMENT
router.delete("/:id/comment/:commentId", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const actorId = req.user._id?.toString();
    const commentOwnerId = comment.user?.toString();
    const postOwnerId = post.author?.toString();

    // Authorization: comment author OR post author
    if (actorId !== commentOwnerId && actorId !== postOwnerId) {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    comment.deleteOne();
    await post.save();

    // Clean up related notifications (comment + any mentions that referenced this comment)
    try {
      await Notification.deleteMany({ comment: comment._id });
    } catch (e) { console.warn("notif cleanup failed:", e.message); }

    // Real-time emit
    try {
      const populated = await Post.findById(post._id)
        .populate("comments.user", "name profilePicture profilePicLocked")
        .populate("comments.replies.user", "name profilePicture profilePicLocked")
        .lean();
      emitPostCommented(post._id.toString(), populated.comments || [], post.comments.length);
    } catch (e) { console.warn("emit failed:", e.message); }

    res.json({ ok: true, commentId: comment._id, totalComments: post.comments.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE A REPLY
router.delete("/:id/comment/:commentId/reply/:replyId", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    const actorId = req.user._id?.toString();
    const replyOwnerId = reply.user?.toString();
    const commentOwnerId = comment.user?.toString();
    const postOwnerId = post.author?.toString();

    if (actorId !== replyOwnerId && actorId !== commentOwnerId && actorId !== postOwnerId) {
      return res.status(403).json({ message: "Not authorized to delete this reply" });
    }

    reply.deleteOne();
    await post.save();

    const populated = await Post.findById(post._id)
      .populate("comments.user", "name profilePicture profilePicLocked")
      .populate("comments.replies.user", "name profilePicture profilePicLocked")
      .lean();

    res.json({ ok: true, replyId: req.params.replyId, comments: populated.comments || [] });
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
    const targetId = req.params.userId;
    // â”€â”€ Prevent self-follow â”€â”€
    if (req.user._id.toString() === targetId.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself." });
    }
    const currentUser = await User.findById(req.user._id);
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

    // Push notification on new follow
    try {
      if (isFollowing) {
        notifyNewFollower(targetId, req.user.name || "Someone").catch(() => {});
      }
    } catch (e) {}

    res.json({ following: currentUser.followingUsers, isFollowing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// REACT to a post (channel posts primarily)
// Body: { emoji }   Toggle: same emoji removes, different replaces
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET current user's following list
router.get("/following/list", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("followingUsers").lean();
    const following = user?.followingUsers || [];
    res.json({ following });
  } catch (e) {
    console.error("[following/list]", e.message);
    res.status(500).json({ message: e.message });
  }
});

router.put("/:id/react", protect, async (req, res) => {
  try {
    const { emoji } = req.body || {};
    const allowed = ["â¤ï¸", "ðŸ”¥", "ðŸ‘", "ðŸ˜®"];
    if (!allowed.includes(emoji)) {
      return res.status(400).json({ message: "Invalid emoji" });
    }
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = String(req.user._id);
    const existing = (post.reactions || []).find((r) => String(r.user) === userId);

    if (existing && existing.emoji === emoji) {
      // Remove reaction
      post.reactions = post.reactions.filter((r) => String(r.user) !== userId);
    } else if (existing) {
      // Change emoji
      post.reactions = post.reactions.map((r) =>
        String(r.user) === userId ? { ...r.toObject(), emoji } : r
      );
    } else {
      // Add new reaction
      post.reactions.push({ user: req.user._id, emoji });
    }

    await post.save();

    // Aggregate counts
    const counts = {};
    for (const r of post.reactions) {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    }
    const myReaction = post.reactions.find((r) => String(r.user) === userId)?.emoji || null;

    res.json({ reactionCounts: counts, myReaction });
  } catch (err) {
    console.error("[REACT] error:", err.message);
    res.status(500).json({ message: err.message });
  }
});
// UPLOAD ATTACHMENT for posts (File icon)
router.post("/upload-attachment", protect, async (req, res) => {
  try {
    const { fileData, fileName, fileType, fileSize } = req.body;
    if (!fileData) return res.status(400).json({ message: "fileData required" });
    if (fileSize > 25 * 1024 * 1024) return res.status(400).json({ message: "File too large (max 25MB)" });

    const base64 = fileData.includes(",") ? fileData.split(",")[1] : fileData;
    const buffer = Buffer.from(base64, "base64");

    const { uploadToR2 } = await import("../utils/r2.js");
    const safeName = (fileName || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `attachments/${Date.now()}-${safeName}`;
    const url = await uploadToR2(buffer, fileType || "application/octet-stream", "attachments");

    res.json({ url, name: fileName, size: fileSize, type: fileType });
  } catch (error) {
    console.error("Attachment upload error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
