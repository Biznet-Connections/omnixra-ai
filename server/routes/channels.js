import express from "express";
import Channel from "../models/Channel.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Slugify a name — "Zimbabwe Tech" -> "zimbabwe-tech"
function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

// Ensure unique slug
async function uniqueSlug(base) {
  let slug = base || "channel";
  let n = 1;
  while (await Channel.findOne({ slug })) {
    n++;
    slug = base + "-" + n;
    if (n > 999) { slug = base + "-" + Date.now(); break; }
  }
  return slug;
}

// ═══ CREATE CHANNEL ═══
router.post("/", protect, async (req, res) => {
  try {
    const { name, description, category, avatar } = req.body || {};
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: "Channel name required (min 2 chars)" });
    }
    const slug = await uniqueSlug(slugify(name));
    const channel = await Channel.create({
      name: name.trim(),
      slug,
      description: (description || "").trim(),
      category: (category || "General").trim(),
      avatar: avatar || null,
      creator: req.user._id,
      admins: [req.user._id],
      followers: [req.user._id],
      followerCount: 1,
      visibility: "public",
    });
    console.log("[CHANNEL] Created:", channel.slug, "by", String(req.user._id));
    res.status(201).json(channel);
  } catch (err) {
    console.error("[CHANNEL] create error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ═══ LIST CHANNELS (for Discover) ═══
router.get("/", protect, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;
    const query = { deleted: false, visibility: "public" };
    if (cursor) query._id = { $lt: cursor };
    const channels = await Channel.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate("creator", "name profilePicture headline")
      .lean();
    const hasMore = channels.length > limit;
    const items = hasMore ? channels.slice(0, limit) : channels;
    const nextCursor = items.length > 0 ? items[items.length - 1]._id.toString() : null;
    res.json({ channels: items, hasMore, nextCursor });
  } catch (err) {
    console.error("[CHANNEL] list error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ═══ MY CHANNELS (created + following) ═══
router.get("/me", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const [created, following] = await Promise.all([
      Channel.find({ creator: userId, deleted: false }).lean(),
      Channel.find({ followers: userId, deleted: false }).lean(),
    ]);
    res.json({ created, following });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══ GET CHANNEL BY SLUG ═══
router.get("/:slug", protect, async (req, res) => {
  try {
    const channel = await Channel.findOne({ slug: req.params.slug, deleted: false })
      .populate("creator", "name profilePicture headline")
      .lean();
    if (!channel) return res.status(404).json({ message: "Channel not found" });
    const userId = String(req.user._id);
    const isFollowing = (channel.followers || []).some((f) => String(f) === userId);
    const isAdmin =
      String(channel.creator?._id) === userId ||
      (channel.admins || []).some((a) => String(a) === userId);
    res.json({ ...channel, isFollowing, isAdmin });
  } catch (err) {
    console.error("[CHANNEL] get error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ═══ GET CHANNEL POSTS ═══
router.get("/:slug/posts", protect, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 15, 30);
    const cursor = req.query.cursor;
    const channel = await Channel.findOne({ slug: req.params.slug, deleted: false }).select("_id").lean();
    if (!channel) return res.status(404).json({ message: "Channel not found" });
    const query = { channelId: channel._id, deleted: false };
    if (cursor) query._id = { $lt: cursor };
    const posts = await Post.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate("author", "name profilePicture headline accountType")
      .lean();
    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = items.length > 0 ? items[items.length - 1]._id.toString() : null;

    // Aggregate reaction counts
    const enriched = items.map((p) => {
      const counts = {};
      let myReaction = null;
      for (const r of p.reactions || []) {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1;
        if (String(r.user) === String(req.user._id)) myReaction = r.emoji;
      }
      return {
        ...p,
        hasImage: !!p.image,
        hasVideo: !!p.video,
        totalComments: 0,
        comments: [],
        reactionCounts: counts,
        myReaction,
      };
    });

    res.json({ posts: enriched, hasMore, nextCursor });
  } catch (err) {
    console.error("[CHANNEL] posts error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ═══ FOLLOW / UNFOLLOW ═══
router.post("/:slug/follow", protect, async (req, res) => {
  try {
    const channel = await Channel.findOne({ slug: req.params.slug, deleted: false });
    if (!channel) return res.status(404).json({ message: "Channel not found" });
    const userId = req.user._id;
    if (!channel.followers.some((f) => String(f) === String(userId))) {
      channel.followers.push(userId);
      channel.followerCount = channel.followers.length;
      await channel.save();
    }
    res.json({ following: true, followerCount: channel.followerCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:slug/unfollow", protect, async (req, res) => {
  try {
    const channel = await Channel.findOne({ slug: req.params.slug, deleted: false });
    if (!channel) return res.status(404).json({ message: "Channel not found" });
    const userId = String(req.user._id);
    channel.followers = channel.followers.filter((f) => String(f) !== userId);
    channel.followerCount = channel.followers.length;
    await channel.save();
    res.json({ following: false, followerCount: channel.followerCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══ EDIT CHANNEL (admin only) ═══
router.put("/:slug", protect, async (req, res) => {
  try {
    const channel = await Channel.findOne({ slug: req.params.slug, deleted: false });
    if (!channel) return res.status(404).json({ message: "Channel not found" });
    if (!channel.isAdmin(req.user._id)) return res.status(403).json({ message: "Not authorized" });
    const { name, description, category, avatar, cover } = req.body || {};
    if (typeof name === "string" && name.trim().length >= 2) channel.name = name.trim();
    if (typeof description === "string") channel.description = description.trim().slice(0, 500);
    if (typeof category === "string") channel.category = category.trim();
    if (typeof avatar === "string") channel.avatar = avatar;
    if (typeof cover === "string") channel.cover = cover;
    await channel.save();
    res.json(channel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══ DELETE CHANNEL (admin only) ═══
router.delete("/:slug", protect, async (req, res) => {
  try {
    const channel = await Channel.findOne({ slug: req.params.slug, deleted: false });
    if (!channel) return res.status(404).json({ message: "Channel not found" });
    if (!channel.isAdmin(req.user._id)) return res.status(403).json({ message: "Not authorized" });
    channel.deleted = true;
    await channel.save();
    res.json({ message: "Channel deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
