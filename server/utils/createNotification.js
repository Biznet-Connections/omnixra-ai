import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendPushToUser } from "./fcm.js";

// Which pref key controls which notification type
const TYPE_TO_PREF = {
  mention: "mentions",
  comment: "comments",
  reply: "comments",
  like: "likes",
  follow: "follows",
  message: "messages",
  application: "social",
  job_match: "jobAlerts",
  system: "social",
};

function buildPreview(text, max = 80) {
  if (!text) return "";
  const clean = String(text).replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

export async function createNotification({
  user,          // recipient userId
  actor,         // actor userId (optional for system)
  actorName,
  actorPicture,
  type,
  title,
  text,
  preview,
  post,
  comment,
  job,
  conversation,
  deepLink,
}) {
  try {
    if (!user) return null;
    // Don't notify yourself
    if (actor && String(actor) === String(user)) return null;

    // Respect prefs
    const recipient = await User.findById(user).select("notificationPrefs fcmTokens").lean();
    if (!recipient) return null;

    const prefKey = TYPE_TO_PREF[type];
    if (prefKey && recipient.notificationPrefs && recipient.notificationPrefs[prefKey] === false) {
      return null;
    }

    const notif = await Notification.create({
      user,
      actor,
      actorName,
      actorPicture,
      type,
      title: title || "New notification",
      text: text || "",
      preview: preview || buildPreview(text),
      post,
      comment,
      job,
      conversation,
      deepLink,
    });

    // Send push (best-effort)
    try {
      const pushPayload = {
        title: notif.title,
        body: notif.preview || notif.text || "Tap to view",
        data: {
          notificationId: String(notif._id),
          type,
          deepLink: deepLink || "/notifications",
          postId: post ? String(post) : "",
          commentId: comment ? String(comment) : "",
          jobId: job ? String(job) : "",
          conversationId: conversation ? String(conversation) : "",
        },
      };
      const result = await sendPushToUser(recipient, pushPayload);
      await Notification.findByIdAndUpdate(notif._id, {
        pushSent: !!(result && result.sent),
        pushError: result && result.error ? String(result.error) : null,
      });
    } catch (pushErr) {
      console.warn("[createNotification] push failed:", pushErr.message);
    }

    return notif;
  } catch (e) {
    console.error("[createNotification] error:", e.message);
    return null;
  }
}

// Convenience wrappers
export async function notifyMention({ recipientId, actorUser, post, commentId, preview }) {
  return createNotification({
    user: recipientId,
    actor: actorUser._id,
    actorName: actorUser.name,
    actorPicture: actorUser.profilePicture,
    type: "mention",
    title: `${actorUser.name} mentioned you`,
    text: preview,
    preview: `"${buildPreview(preview, 60)}"`,
    post,
    comment: commentId,
    deepLink: `/post/${post}?comment=${commentId}`,
  });
}

export async function notifyComment({ recipientId, actorUser, post, commentId, preview }) {
  return createNotification({
    user: recipientId,
    actor: actorUser._id,
    actorName: actorUser.name,
    actorPicture: actorUser.profilePicture,
    type: "comment",
    title: `${actorUser.name} commented on your post`,
    text: preview,
    preview: `"${buildPreview(preview, 60)}"`,
    post,
    comment: commentId,
    deepLink: `/post/${post}?comment=${commentId}`,
  });
}

export async function notifyLike({ recipientId, actorUser, post }) {
  return createNotification({
    user: recipientId,
    actor: actorUser._id,
    actorName: actorUser.name,
    actorPicture: actorUser.profilePicture,
    type: "like",
    title: `${actorUser.name} liked your post`,
    text: `${actorUser.name} liked your post`,
    post,
    deepLink: `/post/${post}`,
  });
}

export async function notifyFollow({ recipientId, actorUser }) {
  return createNotification({
    user: recipientId,
    actor: actorUser._id,
    actorName: actorUser.name,
    actorPicture: actorUser.profilePicture,
    type: "follow",
    title: `${actorUser.name} started following you`,
    text: `${actorUser.name} started following you`,
    deepLink: `/user/${actorUser._id}`,
  });
}
