import Job from "../models/Job.js";
import User from "../models/User.js";
import Company from "../models/Company.js";

// ── Search jobs with real filters ──
export async function searchJobs({ category, location, salary, limit = 5 }) {
  const q = { active: true, status: { $ne: "paused" } };

  if (category && category !== "General") {
    q.category = new RegExp(category, "i");
  }
  if (location) {
    q.location = new RegExp(location, "i");
  }
  // Salary is stored as a string sometimes — match loosely if provided
  if (salary) {
    q.salary = new RegExp(salary, "i");
  }

  const jobs = await Job.find(q)
    .sort({ priorityUntil: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return jobs;
}

// ── Count jobs ──
export async function countJobs({ category, location }) {
  const q = { active: true, status: { $ne: "paused" } };
  if (category && category !== "General") q.category = new RegExp(category, "i");
  if (location) q.location = new RegExp(location, "i");
  return await Job.countDocuments(q);
}

// ── Search users (candidates) ──
export async function searchUsers({ category, location, skills, limit = 5 }) {
  const q = {
    accountType: "jobseeker",
    discoverable: true,
  };

  if (category && category !== "General") {
    q.category = new RegExp(category, "i");
  }
  if (location) {
    q.location = new RegExp(location, "i");
  }
  if (skills && Array.isArray(skills) && skills.length > 0) {
    q.skills = { $in: skills.map(s => new RegExp(s, "i")) };
  }

  const users = await User.find(q)
    .sort({ isPremium: -1, lastSeen: -1 })
    .limit(limit)
    .select("name profilePicture headline location skills category isPremium verifiedBadge")
    .lean();

  return users;
}

// ── Count users ──
export async function countUsers({ category, location, skills }) {
  const q = { accountType: "jobseeker", discoverable: true };
  if (category && category !== "General") q.category = new RegExp(category, "i");
  if (location) q.location = new RegExp(location, "i");
  if (skills && Array.isArray(skills) && skills.length > 0) {
    q.skills = { $in: skills.map(s => new RegExp(s, "i")) };
  }
  return await User.countDocuments(q);
}

// ── Count companies ──
export async function countCompanies({ category, location }) {
  const q = {};
  if (category) q.category = new RegExp(category, "i");
  if (location) q.location = new RegExp(location, "i");
  return await Company.countDocuments(q);
}

// ── Calculate real match score ──
export function calculateMatch({ user, job }) {
  if (!user || !job) return 30;
  let score = 40; // base

  // Category match
  if (user.category && job.category && user.category.toLowerCase() === job.category.toLowerCase()) {
    score += 30;
  }

  // Location match
  if (user.location && job.location) {
    const uLoc = user.location.toLowerCase();
    const jLoc = job.location.toLowerCase();
    if (uLoc.includes(jLoc) || jLoc.includes(uLoc)) score += 15;
  }

  // Skills match
  const userSkills = (user.skills || []).map(s => s.toLowerCase());
  const jobText = ((job.description || "") + " " + (job.title || "") + " " + (job.requirements || "")).toLowerCase();
  let skillHits = 0;
  for (const s of userSkills) {
    if (jobText.includes(s)) skillHits++;
  }
  score += Math.min(15, skillHits * 5);

  return Math.min(99, Math.max(30, score));
}

// ── Attach match scores to jobs ──
export function enrichJobsWithMatch(jobs, user) {
  return jobs.map(j => ({ ...j, matchScore: calculateMatch({ user, job: j }) }))
             .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}
