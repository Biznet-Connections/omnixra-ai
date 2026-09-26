import crypto from "crypto";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import ScrapedJob from "../models/ScrapedJob.js";

// Stratified per-job bucket:
//   30% of jobs → 30-80  (low competition)
//   40% of jobs → 80-150 (moderate)
//   30% of jobs → 150-250 (high, urgent)
function seededBucketForJob(jobId) {
  const hash = crypto.createHash("md5").update(`bucket:v2:${String(jobId)}`).digest();
  const roll = hash.readUInt8(0); // 0-255

  if (roll < 76) {
    // 30% low
    const range = 80 - 30 + 1;
    return 30 + (hash.readUInt32BE(4) % range);
  } else if (roll < 178) {
    // 40% medium
    const range = 150 - 80 + 1;
    return 80 + (hash.readUInt32BE(4) % range);
  } else {
    // 30% high
    const range = 250 - 150 + 1;
    return 150 + (hash.readUInt32BE(4) % range);
  }
}

// Small per-user jitter so two users viewing the same job see slightly different ranks
function userJitter(userId, jobId) {
  const hash = crypto.createHash("md5").update(`jitter:${String(userId)}:${String(jobId)}`).digest();
  const roll = hash.readUInt8(0); // 0-255
  return (roll % 6) - 3; // -3 to +2
}

export async function getApplicantRank({ userId, jobId }) {
  try {
    const realCount = await Application.countDocuments({ jobId });
    const myApp = userId
      ? await Application.findOne({ userId, jobId }).select("boosted boostedAt boostedRank").lean()
      : null;

    const base = seededBucketForJob(jobId);
    const jitter = userId ? userJitter(userId, jobId) : 0;
    const total = Math.max(realCount, base + jitter, 30);

    // Boosted users sit inside the top 10
    if (myApp?.boosted) {
      // Return the frozen boosted rank if present, else pick a small number
      if (myApp.boostedRank) {
        return { rank: myApp.boostedRank, total, boosted: true };
      }
      const seed = crypto.createHash("md5").update(`boost:${userId}:${jobId}`).digest().readUInt32BE(0);
      const rank = 1 + (seed % Math.min(10, total));
      return { rank, total, boosted: true };
    }

    return { rank: total, total, boosted: false };
  } catch (e) {
    console.error("[applicantRank] error:", e.message);
    return { rank: 45, total: 45, boosted: false };
  }
}

export { seededBucketForJob, userJitter };
export default { getApplicantRank, seededBucketForJob, userJitter };
