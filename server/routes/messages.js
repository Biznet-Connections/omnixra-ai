import express from "express";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { emitNewMessage, getIO } from "../socket.js";

const router = express.Router();

// GET all conversations (exclude blocked)
router.get("/", protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const blockedIds = currentUser.blockedUsers || [];
    const blockedByIds = await User.find({ blockedUsers: req.user._id }).select("_id");
    const blockedByList = blockedByIds.map(u => u._id);
    const allBlocked = [...blockedIds, ...blockedByList];

    const conversations = await Conversation.find({
      participants: req.user._id,
      $and: [
        { participants: { $nin: allBlocked } }
      ]
    })
      .populate("participants", "name profilePicture profilePicLocked")
      .populate("messages.sender", "name profilePicture")
      .sort({ lastMessageAt: -1 });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET unread messages count (BEFORE /:id routes)
router.get("/unread/count", protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const blockedIds = currentUser.blockedUsers || [];
    const blockedByIds = await User.find({ blockedUsers: req.user._id }).select("_id");
    const blockedByList = blockedByIds.map(u => u._id);
    const allBlocked = [...blockedIds, ...blockedByList];

    const conversations = await Conversation.find({
      participants: req.user._id,
      $and: [
        { participants: { $nin: allBlocked } }
      ]
    });

    let unreadCount = 0;
    conversations.forEach(conv => {
      conv.messages.forEach(msg => {
        if (msg.sender.toString() !== req.user._id.toString() && !msg.readBy.includes(req.user._id)) {
          unreadCount++;
        }
      });
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single conversation
router.get("/:id", protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate("participants", "name profilePicture profilePicLocked")
      .populate("messages.sender", "name profilePicture");
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    let updated = false;
    conversation.messages.forEach(msg => {
      if (msg.sender.toString() !== req.user._id.toString() && !msg.readBy.includes(req.user._id)) {
        msg.readBy.push(req.user._id);
        if (!msg.readAt) msg.readAt = new Date();
        updated = true;
      }
    });
    if (updated) await conversation.save();

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE or GET conversation
router.post("/", protect, async (req, res) => {
  try {
    const { otherUserId } = req.body;
    if (!otherUserId) return res.status(400).json({ message: "Other user ID required" });
    if (otherUserId === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot message yourself" });
    }

    const otherUserIdObj = new mongoose.Types.ObjectId(otherUserId);
    const currentUserIdObj = new mongoose.Types.ObjectId(req.user._id);

    const currentUser = await User.findById(currentUserIdObj);
    if (currentUser.blockedUsers?.some(id => id.toString() === otherUserId)) {
      return res.status(403).json({ message: "You have blocked this user" });
    }

    const otherUser = await User.findById(otherUserIdObj);
    if (otherUser?.blockedUsers?.some(id => id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "You cannot message this user" });
    }

    // Find existing conversation - try BOTH ObjectId and string matching
    let conversation = await Conversation.findOne({
      $or: [
        { participants: { $all: [currentUserIdObj, otherUserIdObj], $size: 2 } },
        { participants: { $all: [req.user._id.toString(), otherUserId.toString()], $size: 2 } },
        { participants: { $all: [currentUserIdObj.toString(), otherUserIdObj.toString()], $size: 2 } }
      ]
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, otherUserId],
        messages: [],
        lastMessage: "",
        lastMessageAt: new Date()
      });
    }

    const populated = await Conversation.findById(conversation._id)
      .populate("participants", "name profilePicture profilePicLocked")
      .populate("messages.sender", "name profilePicture");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// SEND message with reply
router.post("/:id/message", protect, async (req, res) => {
  try {
    const { text, replyTo } = req.body;
    if (!text) return res.status(400).json({ message: "Message text required" });

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: "Not a participant" });
    }

    const otherParticipantId = conversation.participants.find(p => p.toString() !== req.user._id.toString());
    const currentUser = await User.findById(req.user._id);
    if (currentUser.blockedUsers?.includes(otherParticipantId)) {
      return res.status(403).json({ message: "You have blocked this user" });
    }

    const otherUser = await User.findById(otherParticipantId);
    if (otherUser?.blockedUsers?.includes(req.user._id)) {
      return res.status(403).json({ message: "You cannot message this user" });
    }

    const newMessage = {
      sender: req.user._id,
      text,
      readBy: [req.user._id],
      deliveredAt: new Date()
    };

    if (replyTo && replyTo.messageId) {
      const repliedMsg = conversation.messages.id(replyTo.messageId);
      if (repliedMsg) {
        newMessage.replyTo = {
          messageId: repliedMsg._id,
          text: repliedMsg.text?.substring(0, 100),
          senderName: replyTo.senderName || ""
        };
      }
    }

    conversation.messages.push(newMessage);
    conversation.lastMessage = text;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populated = await Conversation.findById(conversation._id)
      .populate("participants", "name profilePicture profilePicLocked")
      .populate("messages.sender", "name profilePicture");

    const recipientId = conversation.participants.find(p => p._id.toString() !== req.user._id.toString());
    if (recipientId) {
      const lastMsg = populated.messages[populated.messages.length - 1];
      emitNewMessage(conversation._id, recipientId._id, lastMsg);
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE conversation — "Delete for Me"
router.put("/:id/delete-for-me", protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    conversation.participants = conversation.participants.filter(
      p => p.toString() !== req.user._id.toString()
    );
    await conversation.save();

    res.json({ message: "Conversation deleted for you" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE conversation — "Delete for Everyone"
router.delete("/:id", protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await conversation.deleteOne();

    const io = getIO();
    io.emit("conversation-deleted", { conversationId: req.params.id });

    res.json({ message: "Conversation deleted for everyone" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// BLOCK user
router.put("/block/:userId", protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    if (!currentUser.blockedUsers.includes(req.params.userId)) {
      currentUser.blockedUsers.push(req.params.userId);
      await currentUser.save();
    }
    res.json({ message: "User blocked", blockedUsers: currentUser.blockedUsers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UNBLOCK user
router.put("/unblock/:userId", protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const idx = currentUser.blockedUsers.indexOf(req.params.userId);
    if (idx > -1) {
      currentUser.blockedUsers.splice(idx, 1);
      await currentUser.save();
    }
    res.json({ message: "User unblocked", blockedUsers: currentUser.blockedUsers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// MARK messages as read
router.put("/:id/read", protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    let updated = false;
    conversation.messages.forEach(msg => {
      if (msg.sender.toString() !== req.user._id.toString() && !msg.readBy.includes(req.user._id)) {
        msg.readBy.push(req.user._id);
        if (!msg.readAt) msg.readAt = new Date();
        updated = true;
      }
    });

    if (updated) {
      await conversation.save();
    }

    res.json({ message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET user for chat
router.get("/user/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
