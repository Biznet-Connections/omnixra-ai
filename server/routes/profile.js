import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";
import { protect } from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";

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

// GET followed companies for current user
router.get("/following-companies", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("following").lean();
    res.json({ following: (user?.following || []).map(String) });
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


// ═══════════════════════════════════════════════════════════
// SUGGESTED CONNECTIONS
// Algorithm: same category OR same location, excluding existing
// connections, pending requests, and self.
// ═══════════════════════════════════════════════════════════
router.get("/suggested-connections", protect, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 12, 30);
    const me = await User.findById(req.user._id)
      .select("connections followingUsers category location");
    if (!me) return res.status(404).json({ message: "User not found" });

    const excludeIds = [
      me._id,
      ...(me.connections || []),
      ...(me.followingUsers || []),
    ].map((id) => id.toString());

    const or = [];
    if (me.category) or.push({ category: me.category });
    if (me.location) or.push({ location: me.location });

    const query = {
      _id: { $nin: excludeIds },
      accountType: { $in: ["jobseeker", "company"] },
    };
    if (or.length > 0) query.$or = or;

    // Prioritize: same category + same location first
    let list = await User.find(query)
      .select("name companyName profilePicture profilePicLocked headline category location accountType")
      .limit(limit * 2)
      .lean();

    // Score for sorting
    const myCategory = String(me.category || "").toLowerCase();
    const myLocation = String(me.location || "").toLowerCase();
    list = list
      .map((u) => {
        let score = 0;
        if (myCategory && String(u.category || "").toLowerCase() === myCategory) score += 3;
        if (myLocation && String(u.location || "").toLowerCase() === myLocation) score += 2;
        if (u.accountType === "company") score += 1;
        return { user: u, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.user);

    // If still too few results, add random users from the platform
    if (list.length < limit) {
      const filler = await User.find({
        _id: { $nin: [...excludeIds, ...list.map((u) => u._id.toString())] },
        accountType: { $in: ["jobseeker", "company"] },
      })
        .select("name companyName profilePicture profilePicLocked headline category location accountType")
        .limit(limit - list.length)
        .lean();
      list = [...list, ...filler];
    }

    const normalized = list.map((u) => ({
      ...u,
      name: u.accountType === "company" ? (u.companyName || u.name) : u.name,
    }));

    res.json(normalized);
  } catch (err) {
    console.error("[SUGGESTED] error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;

// ═══════════════════════════════════════════════════════════════════
// BUSINESS SETUP — save business profile details
// ═══════════════════════════════════════════════════════════════════

router.put("/business/setup", protect, async (req, res) => {
  try {
    const { businessName, businessCategory, businessLocation, businessPhone, businessWhatsApp, businessHours, businessAbout, businessLogo, businessSlug } = req.body;
    if (req.user.accountType !== "business") {
      return res.status(403).json({ message: "Business accounts only" });
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          ...(businessName !== undefined && { businessName }),
          ...(businessCategory !== undefined && { businessCategory }),
          ...(businessLocation !== undefined && { businessLocation }),
          ...(businessPhone !== undefined && { businessPhone }),
          ...(businessWhatsApp !== undefined && { businessWhatsApp }),
          ...(businessHours !== undefined && { businessHours }),
          ...(businessAbout !== undefined && { businessAbout }),
          ...(businessLogo !== undefined && { businessLogo }),
          ...(businessSlug !== undefined && { businessSlug }),
        },
      },
      { new: true }
    ).select("-password");

    res.json({ user: updated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PUBLIC SHOP — no auth required, returns shop info + products
// ═══════════════════════════════════════════════════════════════════
router.get("/public/shop/:slug", async (req, res) => {
  try {
    const user = await User.findOne({
      businessSlug: req.params.slug,
      accountType: "business",
    }).select("businessName businessSlug businessCategory businessLocation businessAbout businessLogo businessPhone businessWhatsApp businessHours businessVerified businessRating businessReviewCount").lean();

    if (!user) return res.status(404).json({ message: "Shop not found" });

    // Products will come from a future "Product" model — return empty for now
    let products = [];
    try {
      const Product = (await import("../models/Product.js")).default;
      products = await Product.find({ sellerId: user._id, status: "active" }).select("name price images").limit(50).lean();
    } catch {}

    res.json({ user, products });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});


// ═══════════════════════════════════════════════════════════════════
// CREATE A PRODUCT — business owners only
// ═══════════════════════════════════════════════════════════════════
router.post("/business/product", protect, async (req, res) => {
  try {
    if (req.user.accountType !== "business") {
      return res.status(403).json({ message: "Business accounts only" });
    }

    const { name, price, description, images, category } = req.body;
    if (!name?.trim() || !price) {
      return res.status(400).json({ message: "Name and price are required" });
    }

    const Product = (await import("../models/Product.js")).default;

    const product = await Product.create({
      sellerId: req.user._id,
      name: name.trim(),
      price: Number(price),
      description: description?.trim() || "",
      images: Array.isArray(images) ? images.slice(0, 5) : [],
      category: category || req.user.businessCategory || "Other",
      status: "active",
    });

    console.log("[product] created:", product._id, "by", req.user._id);
    res.json({ ok: true, product });
  } catch (e) {
    console.error("[product/create] error:", e.message);
    res.status(500).json({ message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET MY PRODUCTS — business owners only
// ═══════════════════════════════════════════════════════════════════
router.get("/business/products", protect, async (req, res) => {
  try {
    if (req.user.accountType !== "business") {
      return res.status(403).json({ message: "Business accounts only" });
    }
    const Product = (await import("../models/Product.js")).default;
    const products = await Product.find({ sellerId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ products });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PUBLIC PRODUCT DETAIL — no auth, for guest browsing
// ═══════════════════════════════════════════════════════════════════
router.get("/public/shop/:slug/product/:productId", async (req, res) => {
  try {
    const User = (await import("../models/User.js")).default;
    const Product = (await import("../models/Product.js")).default;

    const shop = await User.findOne({
      businessSlug: req.params.slug,
      accountType: "business",
    }).select("_id businessName businessSlug businessLocation businessVerified businessPhone businessWhatsApp businessLogo").lean();

    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const product = await Product.findOne({
      _id: req.params.productId,
      sellerId: shop._id,
      status: "active",
    }).lean();

    if (!product) return res.status(404).json({ message: "Product not found" });

    // Increment views
    await Product.updateOne({ _id: product._id }, { $inc: { views: 1 } });

    res.json({ product, shop });
  } catch (e) {
    console.error("[public/product] error:", e.message);
    res.status(500).json({ message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// UPDATE PRODUCT — business owners only
// ═══════════════════════════════════════════════════════════════════
router.put("/business/product/:id", protect, async (req, res) => {
  try {
    if (req.user.accountType !== "business") {
      return res.status(403).json({ message: "Business accounts only" });
    }
    const Product = (await import("../models/Product.js")).default;
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user._id });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const { name, price, description, images, status } = req.body;
    if (name !== undefined) product.name = name.trim();
    if (price !== undefined) product.price = Number(price);
    if (description !== undefined) product.description = description.trim();
    if (images !== undefined) product.images = Array.isArray(images) ? images.slice(0, 5) : product.images;
    if (status !== undefined && ["active", "sold", "draft", "archived"].includes(status)) {
      product.status = status;
    }

    await product.save();
    res.json({ ok: true, product });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// DELETE PRODUCT — business owners only
// ═══════════════════════════════════════════════════════════════════
router.delete("/business/product/:id", protect, async (req, res) => {
  try {
    if (req.user.accountType !== "business") {
      return res.status(403).json({ message: "Business accounts only" });
    }
    const Product = (await import("../models/Product.js")).default;
    const result = await Product.deleteOne({ _id: req.params.id, sellerId: req.user._id });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Product not found" });
    res.json({ ok: true, deleted: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PUBLIC MESSAGE — send without requiring contact (soft-ask later)
// ═══════════════════════════════════════════════════════════════════
router.post("/public/shop/:slug/message", optionalAuth, async (req, res) => {
  try {
    const User = (await import("../models/User.js")).default;
    const Product = (await import("../models/Product.js")).default;
    const Notification = (await import("../models/Notification.js")).default;

    const { productId, text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: "Message required" });

    const shop = await User.findOne({
      businessSlug: req.params.slug,
      accountType: "business",
    }).select("_id businessName fcmTokens").lean();
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    let product = null;
    if (productId) {
      product = await Product.findOne({ _id: productId, sellerId: shop._id }).lean();
      if (product) await Product.updateOne({ _id: product._id }, { $inc: { inquiries: 1 } });
    }

    const senderId = req.user?._id || null;
    const senderName = req.user?.name || "Anonymous";
    const senderEmail = req.user?.email || null;

    // Create the notification (message goes through immediately)
    const preview = product
      ? `Re: ${product.name} — ${text.slice(0, 80)}`
      : text.slice(0, 80);

    const notif = await Notification.create({
      user: shop._id,
      type: "message",
      title: senderId 
        ? `New inquiry from ${senderName}`
        : `New inquiry from Guest (no contact yet)`,
      text: text.trim(),
      preview,
      deepLink: "/inbox",
      metadata: {
        // null until buyer attaches contact info
        replyEmail: senderEmail,
        replyWhatsApp: null,
        replyPhone: null,
        senderId,
        productId: product?._id || null,
        productName: product?.name || null,
        source: "public-shop",
        hasReplyContact: !!senderEmail,
      },
    });

    // If logged in → also create/reuse a Conversation
    if (senderId) {
      try {
        const Conversation = (await import("../models/Conversation.js")).default;
        let conv = await Conversation.findOne({ participants: { $all: [senderId, shop._id] } });
        if (!conv) {
          conv = await Conversation.create({
            participants: [senderId, shop._id],
            messages: [],
            lastMessageAt: new Date(),
          });
        }
        conv.messages.push({
          sender: senderId,
          text: text.trim(),
          readBy: [senderId],
          createdAt: new Date(),
        });
        conv.lastMessageAt = new Date();
        await conv.save();

        try {
          const { emitNewMessage } = await import("../socket.js");
          emitNewMessage(String(shop._id), {
            conversationId: String(conv._id),
            message: conv.messages[conv.messages.length - 1],
          });
        } catch {}
      } catch (e) {}
    }

    // Push notification (best effort)
    try {
      const shopFull = await User.findById(shop._id).select("fcmTokens").lean();
      if (shopFull?.fcmTokens?.length) {
        const { sendPushToUser } = await import("../utils/fcm.js");
        await sendPushToUser(shopFull, {
          title: `New inquiry from ${senderName}`,
          body: text.slice(0, 100),
          data: { type: "message", deepLink: "/inbox" },
        });
      }
    } catch {}

    res.json({
      ok: true,
      messageId: String(notif._id),
      hasReplyContact: !!senderEmail,
      message: "Message sent!",
    });
  } catch (e) {
    console.error("[public message] error:", e.message);
    res.status(500).json({ message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ATTACH CONTACT TO MESSAGE — buyer says how they want to be reached
// ═══════════════════════════════════════════════════════════════════
router.put("/public/message/:messageId/contact", async (req, res) => {
  try {
    const Notification = (await import("../models/Notification.js")).default;
    const User = (await import("../models/User.js")).default;

    const { replyVia, value } = req.body;
    if (!replyVia || !value) return res.status(400).json({ message: "replyVia + value required" });
    if (!["email", "whatsapp", "call"].includes(replyVia)) {
      return res.status(400).json({ message: "Invalid replyVia" });
    }

    const notif = await Notification.findById(req.params.messageId);
    if (!notif) return res.status(404).json({ message: "Message not found" });

    const metadata = { ...(notif.metadata || {}), hasReplyContact: true };
    if (replyVia === "email") metadata.replyEmail = value;
    if (replyVia === "whatsapp") metadata.replyWhatsApp = value;
    if (replyVia === "call") metadata.replyPhone = value;

    notif.metadata = metadata;
    notif.markModified("metadata");

    // Update the display title to include the contact — so seller sees who it's from
    // If they were "Anonymous", show the email/phone now
    const senderDisplay =
      notif.metadata?.guestName && notif.metadata.guestName !== "Anonymous"
        ? notif.metadata.guestName
        : replyVia === "email"
          ? value
          : replyVia === "whatsapp"
            ? "WhatsApp: " + value
            : "Call: " + value;

    notif.title = `New inquiry from ${senderDisplay}`;

    // Append contact info to the preview so seller sees it in the list
    const productContext = notif.metadata?.productName
      ? `Re: ${notif.metadata.productName}`
      : "";
    const replyLabel =
      replyVia === "email" ? "📧 " + value :
      replyVia === "whatsapp" ? "💬 " + value :
      "📞 " + value;
    notif.preview = productContext
      ? `${productContext} — ${notif.text?.slice(0, 40) || ""} — Reply: ${replyLabel}`
      : `${replyLabel} — ${notif.text?.slice(0, 60) || ""}`;

    await notif.save();

    // Push the seller again to let them know they can now reply
    try {
      const shop = await User.findById(notif.user).select("fcmTokens").lean();
      if (shop?.fcmTokens?.length) {
        const { sendPushToUser } = await import("../utils/fcm.js");
        const channel = replyVia === "email" ? "email" : replyVia === "whatsapp" ? "WhatsApp" : "phone";
        await sendPushToUser(shop, {
          title: "Buyer added contact info",
          body: `Reply via ${channel}: ${value}`,
          data: { type: "message", deepLink: "/inbox" },
        });
      }
    } catch {}

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
