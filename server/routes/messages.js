import express from "express";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// GET all conversations for current user
router.get("/", protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate("participants", "name profilePicture profilePicLocked")
      .populate("messages.sender", "name profilePicture")
      .sort({ lastMessageAt: -1 });
    res.json(conversations);
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
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE or GET conversation with another user
router.post("/", protect, async (req, res) => {
  try {
    const { otherUserId, initialMessage } = req.body;
    if (!otherUserId) return res.status(400).json({ message: "Other user ID required" });

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, otherUserId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, otherUserId],
        messages: initialMessage ? [{ sender: req.user._id, text: initialMessage }] : [],
        lastMessage: initialMessage || "",
        lastMessageAt: new Date()
      });
    } else if (initialMessage) {
      conversation.messages.push({ sender: req.user._id, text: initialMessage });
      conversation.lastMessage = initialMessage;
      conversation.lastMessageAt = new Date();
      await conversation.save();
    }

    const populated = await Conversation.findById(conversation._id)
      .populate("participants", "name profilePicture profilePicLocked")
      .populate("messages.sender", "name profilePicture");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// SEND message in existing conversation
router.post("/:id/message", protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Message text required" });

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: "Not a participant" });
    }

    conversation.messages.push({ sender: req.user._id, text });
    conversation.lastMessage = text;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populated = await Conversation.findById(conversation._id)
      .populate("participants", "name profilePicture profilePicLocked")
      .populate("messages.sender", "name profilePicture");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET user by ID for starting a chat
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
