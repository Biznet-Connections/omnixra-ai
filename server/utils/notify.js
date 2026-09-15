// Push notification helpers — call these from route handlers
import User from "../models/User.js";
import { sendPushToUser } from "./fcm.js";

// Send push to a user by ID, with safe fallback
export async function notifyUser(userId, payload) {
  try {
    if (!userId) return { sent: false, reason: "no_user_id" };
    const user = await User.findById(userId);
    if (!user) return { sent: false, reason: "user_not_found" };
    if (!user.fcmTokens || user.fcmTokens.length === 0) return { sent: false, reason: "no_tokens" };
    const result = await sendPushToUser(user, payload);
    console.log("[PUSH TRIGGER]", payload.data?.type || "generic", "→", String(userId).slice(-6), result?.success ? "ok" : "fail");
    return result;
  } catch (e) {
    console.warn("[PUSH TRIGGER] error:", e.message);
    return { sent: false, reason: e.message };
  }
}

// Notify post author of an action (like / comment)
export async function notifyPostAuthor(postAuthorId, actorName, action, extra = {}) {
  if (!postAuthorId) return;
  const titles = {
    like: "New like",
    comment: "New comment",
    reply: "New reply",
    share: "Someone shared your post",
  };
  const bodies = {
    like: `${actorName} liked your post`,
    comment: `${actorName} commented on your post`,
    reply: `${actorName} replied to your comment`,
    share: `${actorName} shared your post`,
  };
  return notifyUser(postAuthorId, {
    title: titles[action] || "New activity",
    body: bodies[action] || `${actorName} interacted with your post`,
    data: { type: action, ...extra },
  });
}

// Notify message recipient
export async function notifyNewMessage(recipientId, senderName, preview, conversationId) {
  if (!recipientId) return;
  return notifyUser(recipientId, {
    title: senderName || "New message",
    body: preview ? preview.slice(0, 100) : "Sent you a message",
    data: { type: "message", chatId: String(conversationId || "") },
  });
}

// Notify followee
export async function notifyNewFollower(userId, followerName) {
  if (!userId) return;
  return notifyUser(userId, {
    title: "New follower",
    body: `${followerName} started following you`,
    data: { type: "follow" },
  });
}

export default { notifyUser, notifyPostAuthor, notifyNewMessage, notifyNewFollower };
