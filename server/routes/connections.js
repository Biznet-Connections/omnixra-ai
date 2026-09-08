import express from "express";
import ConnectionRequest from "../models/ConnectionRequest.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { emitConnectionRequest, emitConnectionAccepted } from "../socket.js";

const router = express.Router();

// SEND connection request
router.post("/request/:userId", protect, async (req, res) => {
  try {
    const recipientId = req.params.userId;
    
    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot connect with yourself" });
    }

    // Check if already connected
    const currentUser = await User.findById(req.user._id);
    if (currentUser.connections.includes(recipientId)) {
      return res.status(400).json({ message: "Already connected" });
    }

    // Check for existing pending request
    const existingRequest = await ConnectionRequest.findOne({
      sender: req.user._id,
      recipient: recipientId,
      status: "pending"
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Request already sent" });
    }

    // Check for reverse pending request
    const reverseRequest = await ConnectionRequest.findOne({
      sender: recipientId,
      recipient: req.user._id,
      status: "pending"
    });

    if (reverseRequest) {
      return res.status(400).json({ message: "This user has already sent you a request" });
    }

    const request = await ConnectionRequest.create({
      sender: req.user._id,
      recipient: recipientId
    });

    const populatedRequest = await ConnectionRequest.findById(request._id)
      .populate("sender", "name profilePicture headline profilePicLocked")
      .populate("recipient", "name profilePicture headline profilePicLocked");

    // Emit socket event
    emitConnectionRequest(recipientId, populatedRequest);

    res.status(201).json(populatedRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET pending requests (incoming)
router.get("/pending", protect, async (req, res) => {
  try {
    const requests = await ConnectionRequest.find({
      recipient: req.user._id,
      status: "pending"
    })
      .populate("sender", "name profilePicture headline profilePicLocked")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET sent requests (outgoing)
router.get("/sent", protect, async (req, res) => {
  try {
    const requests = await ConnectionRequest.find({
      sender: req.user._id,
      status: "pending"
    })
      .populate("recipient", "name profilePicture headline profilePicLocked")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ACCEPT connection request
router.put("/accept/:requestId", protect, async (req, res) => {
  try {
    const request = await ConnectionRequest.findById(req.params.requestId);
    
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    request.status = "accepted";
    await request.save();

    // Add to both users' connections
    await User.findByIdAndUpdate(request.sender, {
      $addToSet: { connections: request.recipient }
    });
    await User.findByIdAndUpdate(request.recipient, {
      $addToSet: { connections: request.sender }
    });

    const senderUser = await User.findById(request.sender).select("-password");

    // Emit socket event
    emitConnectionAccepted(request.sender.toString(), senderUser);

    res.json({ message: "Connection accepted", request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DECLINE connection request
router.put("/decline/:requestId", protect, async (req, res) => {
  try {
    const request = await ConnectionRequest.findById(req.params.requestId);
    
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    request.status = "declined";
    await request.save();

    res.json({ message: "Connection declined", request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CANCEL connection request (sender cancels)
router.delete("/cancel/:requestId", protect, async (req, res) => {
  try {
    const request = await ConnectionRequest.findById(req.params.requestId);
    
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await request.deleteOne();
    res.json({ message: "Request cancelled" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// REMOVE connection (disconnect from user)
router.delete("/remove/:userId", protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { connections: req.params.userId }
    });
    await User.findByIdAndUpdate(req.params.userId, {
      $pull: { connections: req.user._id }
    });

    res.json({ message: "Connection removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CHECK connection status with another user
router.get("/status/:userId", protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const isConnected = currentUser.connections.includes(req.params.userId);

    const pendingSent = await ConnectionRequest.findOne({
      sender: req.user._id,
      recipient: req.params.userId,
      status: "pending"
    });

    const pendingReceived = await ConnectionRequest.findOne({
      sender: req.params.userId,
      recipient: req.user._id,
      status: "pending"
    });

    res.json({
      isConnected,
      requestSent: !!pendingSent,
      requestReceived: !!pendingReceived,
      requestId: pendingReceived?._id || null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
