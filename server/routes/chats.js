import express from "express";
import Chat from "../models/Chat.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// GET USER'S CHATS
router.get("/", protect, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET SINGLE CHAT
router.get("/:id", protect, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE CHAT
router.post("/", protect, async (req, res) => {
  try {
    const chat = await Chat.create({
      userId: req.user._id,
      title: req.body.title || "New Chat",
      messages: []
    });
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ADD MESSAGE TO CHAT
router.post("/:id/message", protect, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    chat.messages.push({
      role: req.body.role,
      text: req.body.text,
      jobs: req.body.jobs,
      talent: req.body.talent
    });

    await chat.save();
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// SAVE CHAT
router.put("/:id/save", protect, async (req, res) => {
  try {
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { saved: true, title: req.body.title || "Saved Chat" },
      { new: true }
    );
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
