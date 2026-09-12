import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/User.js";

let io;
const onlineUsers = new Map(); // userId -> Set of socketIds

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "*",
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.userId}`);

    if (!onlineUsers.has(socket.userId)) {
      onlineUsers.set(socket.userId, new Set());
    }
    onlineUsers.get(socket.userId).add(socket.id);

    socket.join(`user:${socket.userId}`);

    // ── Feed room: everyone in the app joins this. Only posts broadcast here. ──
    socket.join("feed");

    // ── Post rooms: joined only when user opens a post's comments ──
    socket.on("join-post", (postId) => {
      if (postId) socket.join(`post:${postId}`);
    });
    socket.on("leave-post", (postId) => {
      if (postId) socket.leave(`post:${postId}`);
    });

    socket.broadcast.emit("user-online", socket.userId);

    socket.on("typing", ({ conversationId, recipientId, isTyping }) => {
      socket.to(`user:${recipientId}`).emit("typing", {
        conversationId,
        userId: socket.userId,
        isTyping
      });
    });

    socket.on("mark-read", ({ conversationId, senderId }) => {
      socket.to(`user:${senderId}`).emit("message-read", {
        conversationId,
        readerId: socket.userId
      });
    });

    socket.on("disconnect", async () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
      const userSockets = onlineUsers.get(socket.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(socket.userId);
          
          // Update lastSeen in database
          try {
            await User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() });
          } catch (err) {
            console.error("Failed to update lastSeen:", err.message);
          }
          
          socket.broadcast.emit("user-offline", { userId: socket.userId, lastSeen: new Date() });
        }
      }
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}

export function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

export function emitNewPost(post) {
  // Only users in the feed room (all logged-in users) — skip unconnected sockets
  if (io) io.to("feed").emit("new-post", post);
}

export function emitPostDeleted(postId) {
  if (io) io.to("feed").emit("post-deleted", { postId });
}

export function emitNewMessage(conversationId, recipientId, message) {
  if (io) io.to(`user:${recipientId}`).emit("new-message", { conversationId, message });
}

export function emitConnectionRequest(recipientId, request) {
  if (io) io.to(`user:${recipientId}`).emit("connection-request", request);
}

export function emitConnectionAccepted(senderId, user) {
  if (io) io.to(`user:${senderId}`).emit("connection-accepted", user);
}

export function emitFollowUpdate(targetUserId, followerId, isFollowing) {
  if (io) io.to(`user:${targetUserId}`).emit("follow-update", { followerId, isFollowing });
}

export function emitUnreadCount(userId, count) {
  if (io) io.to(`user:${userId}`).emit("unread-count", { count });
}

// ── Scoped post emits: to post's own room + feed room ──
export function emitPostLiked(postId, likes) {
  if (!io) return;
  io.to(`post:${postId}`).to("feed").emit("post-liked", { postId, likes });
}

export function emitPostCommented(postId, comments, totalComments) {
  if (!io) return;
  io.to(`post:${postId}`).to("feed").emit("post-commented", { postId, comments, totalComments });
}
