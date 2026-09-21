import User from "../models/User.js";
import Chat from "../models/Chat.js";
import { generateFollowUp } from "./generateFollowUp.js";
import { sendPushToUser } from "./fcm.js";

const SCHEDULER_INTERVAL_MS = 60 * 1000;    // run every 60s
const MAX_NUDGES_PER_THREAD = 2;
const NUDGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days between nudges
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;  // if active in last 5 min, skip
const IGNORED_NUDGE_LIMIT = 3;               // after 3 ignored, back off 30 days

let running = false;

function isZimWakingHours() {
  // UTC+2 = Zimbabwe
  const now = new Date();
  const zimHour = (now.getUTCHours() + 2) % 24;
  return zimHour >= 7 && zimHour < 21;
}

async function processUser(user) {
  const state = user.aiFollowUpState || {};

  // Skip if disabled
  if (state.disabled) return "disabled";

  // Skip if already sent too many this thread
  if ((state.nudgesSentThisThread || 0) >= MAX_NUDGES_PER_THREAD) return "thread-limit";

  // Skip if nudge sent in last 7 days
  if (state.lastNudgeAt) {
    const sinceLast = Date.now() - new Date(state.lastNudgeAt).getTime();
    if (sinceLast < NUDGE_COOLDOWN_MS) return "cooldown";
  }

  // Skip if user is online right now
  if (user.lastActiveAt) {
    const online = Date.now() - new Date(user.lastActiveAt).getTime();
    if (online < ONLINE_THRESHOLD_MS) return "online";
  }

  // Skip if we don't have a chatId to append to
  if (!state.lastChatId) return "no-chat";

  // Generate the nudge
  const result = await generateFollowUp(user, state);
  if (!result) return "no-nudge-type";

  const { nudgeType, text, chips, freshJobs } = result;

  // Append the assistant message to the chat
  try {
    const chat = await Chat.findOne({ _id: state.lastChatId, user: user._id });
    if (!chat) return "chat-not-found";
    chat.messages.push({
      role: "assistant",
      content: text,
      createdAt: new Date(),
    });
    await chat.save();
  } catch (e) {
    console.error("[followup] chat append failed:", e.message);
    return "append-error";
  }

  // Send push notification
  try {
    await sendPushToUser(user, {
      title: "Omnixra AI",
      body: text,
      data: {
        type: "ai_followup",
        chatId: String(state.lastChatId),
        deepLink: `/myai?chatId=${state.lastChatId}`,
      },
    });
  } catch (e) {
    console.warn("[followup] push failed:", e.message);
  }

  // Update user state
  try {
    const ignoredCount = (state.ignoredNudgesCount || 0) + 1;
    await User.findByIdAndUpdate(user._id, {
      $set: {
        "aiFollowUpState.lastNudgeAt": new Date(),
        "aiFollowUpState.lastNudgeType": nudgeType,
        "aiFollowUpState.nextNudgeAt": null,
        "aiFollowUpState.ignoredNudgesCount": ignoredCount >= IGNORED_NUDGE_LIMIT ? 0 : ignoredCount,
      },
      $inc: { "aiFollowUpState.nudgesSentThisThread": 1 },
    });
    console.log(`[followup] sent ${nudgeType} to ${user._id}`);
  } catch (e) {
    console.error("[followup] state update failed:", e.message);
  }

  return "sent";
}

export async function runFollowUpCycle() {
  if (running) return;
  running = true;
  try {
    // Skip entirely outside waking hours (with periodic retry)
    if (!isZimWakingHours()) {
      running = false;
      return;
    }

    const now = new Date();
    const dueUsers = await User.find({
      "aiFollowUpState.nextNudgeAt": { $lte: now, $ne: null },
      "aiFollowUpState.disabled": { $ne: true },
    })
      .select("name _id lastActiveAt aiFollowUpState fcmTokens notificationPrefs")
      .limit(50);

    if (dueUsers.length === 0) {
      running = false;
      return;
    }

    console.log(`[followup] cycle: ${dueUsers.length} eligible user(s)`);
    for (const u of dueUsers) {
      try {
        const res = await processUser(u);
        console.log(`[followup] user ${u._id}: ${res}`);
      } catch (e) {
        console.error(`[followup] user ${u._id} error:`, e.message);
      }
    }
  } catch (e) {
    console.error("[followup] cycle error:", e.message);
  } finally {
    running = false;
  }
}

export function startFollowUpScheduler() {
  console.log("[followup] scheduler started — every 60s");
  setInterval(runFollowUpCycle, SCHEDULER_INTERVAL_MS);
  // Fire once shortly after boot
  setTimeout(runFollowUpCycle, 15 * 1000);
}
