// Batching + throttling for smart notifications
import User from "../models/User.js";
import Job from "../models/Job.js";
import { notifyUser } from "./notify.js";
import { buildJobBatchMessage, isStrongMatch } from "./jobMatcher.js";

const BATCH_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const MAX_QUEUE_JOBS = 30;

function isSameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return da.toDateString() === db.toDateString();
}

export async function queueJobMatch(userId, jobId) {
  try {
    const user = await User.findById(userId).select("notificationQueue notificationPrefs");
    if (!user) return false;
    if (user.notificationPrefs && user.notificationPrefs.jobAlerts === false) return false;
    const queue = user.notificationQueue || [];
    const already = queue.some(function (q) { return String(q.jobId) === String(jobId); });
    if (already) return false;
    queue.push({ jobId: jobId, matchedAt: new Date() });
    if (queue.length > MAX_QUEUE_JOBS) queue.shift();
    user.notificationQueue = queue;
    await user.save();
    return true;
  } catch (e) {
    console.warn("[JOB QUEUE] error:", e.message);
    return false;
  }
}

export async function matchJobsToUsers(newJobs) {
  if (!Array.isArray(newJobs) || newJobs.length === 0) return { queued: 0 };
  try {
    const users = await User.find({
      accountType: "jobseeker",
      "notificationPrefs.jobAlerts": { $ne: false },
    }).select("_id category location skills notificationPrefs");

    let queued = 0;
    for (const user of users) {
      for (const job of newJobs) {
        if (isStrongMatch(job, user, 3)) {
          const ok = await queueJobMatch(user._id, job._id);
          if (ok) queued++;
        }
      }
    }
    console.log("[JOB MATCH] Queued " + queued + " matches for " + newJobs.length + " new jobs across " + users.length + " users");
    return { queued: queued };
  } catch (e) {
    console.warn("[JOB MATCH] error:", e.message);
    return { queued: 0 };
  }
}

export async function flushJobBatches(options) {
  const force = options && options.force === true;
  try {
    const now = Date.now();
    const users = await User.find({
      "notificationQueue.0": { $exists: true },
      "notificationPrefs.jobAlerts": { $ne: false },
    }).select("_id notificationQueue notificationLog notificationPrefs fcmTokens");

    let sent = 0;
    for (const user of users) {
      const queue = user.notificationQueue || [];
      if (queue.length === 0) continue;

      const lastSentAt = user.notificationLog && user.notificationLog.jobs;
      const lastSentMs = lastSentAt ? new Date(lastSentAt).getTime() : 0;
      const msSinceLast = now - lastSentMs;
      const neverSent = !lastSentAt;

      if (!force && !neverSent && msSinceLast < BATCH_COOLDOWN_MS) continue;
      if (!force && !neverSent && isSameDay(lastSentAt, now)) continue;

      const jobIds = queue.map(function (q) { return q.jobId; }).filter(Boolean);
      if (jobIds.length === 0) continue;
      const jobs = await Job.find({ _id: { $in: jobIds } })
        .select("title company location")
        .lean();
      if (jobs.length === 0) continue;

      const msg = buildJobBatchMessage(jobs);
      if (!msg) continue;

      const result = await notifyUser(user._id, {
        title: msg.title,
        body: msg.body,
        data: {
          type: "job_matches",
          count: String(jobs.length),
          jobIds: jobIds.map(String).slice(0, 5).join(","),
        },
      });

      if (result && result.success) {
        user.notificationQueue = [];
        const prevLog = user.notificationLog || {};
        user.notificationLog = {
          news: prevLog.news,
          jobs: new Date(),
          jobsFirstSentAt: prevLog.jobsFirstSentAt || new Date(),
        };
        await user.save();
        sent++;
      }
    }
    console.log("[JOB BATCH] Sent " + sent + " batched job notifications");
    return { sent: sent };
  } catch (e) {
    console.warn("[JOB BATCH] error:", e.message);
    return { sent: 0 };
  }
}

export default { queueJobMatch: queueJobMatch, matchJobsToUsers: matchJobsToUsers, flushJobBatches: flushJobBatches };
