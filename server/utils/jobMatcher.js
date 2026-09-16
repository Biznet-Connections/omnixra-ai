// Job matching — scores how well a job fits a user's profile
// Returns a score. Higher = better match.

const CATEGORY_STOP_WORDS = new Set([
  "general", "other", "any", "all", "misc"
]);

function normalize(str) {
  return String(str || "").toLowerCase().trim();
}

// Main scorer — returns { score, reasons }
export function scoreJobForUser(job, user) {
  if (!job || !user) return { score: 0, reasons: [] };
  if (user.accountType !== "jobseeker") return { score: 0, reasons: [] };

  let score = 0;
  const reasons = [];

  const jobCategory = normalize(job.category);
  const userCategory = normalize(user.category);
  const jobLocation = normalize(job.location);
  const userLocation = normalize(user.location);
  const jobTitle = normalize(job.title);
  const jobDescription = normalize(job.description || job.text || "");

  // +3 category match (skip if either is empty or a stop word)
  if (jobCategory && userCategory
      && !CATEGORY_STOP_WORDS.has(jobCategory)
      && !CATEGORY_STOP_WORDS.has(userCategory)) {
    if (jobCategory === userCategory) {
      score += 3;
      reasons.push("category");
    } else if (jobCategory.includes(userCategory) || userCategory.includes(jobCategory)) {
      score += 2;
      reasons.push("category-partial");
    }
  }

  // +2 location match
  if (jobLocation && userLocation) {
    if (jobLocation.includes(userLocation) || userLocation.includes(jobLocation)) {
      score += 2;
      reasons.push("location");
    }
  }

  // +2 per skill found in title or description (max +4)
  if (Array.isArray(user.skills) && user.skills.length > 0) {
    let skillHits = 0;
    for (const raw of user.skills) {
      const skill = normalize(raw);
      if (!skill || skill.length < 2) continue;
      if (jobTitle.includes(skill) || jobDescription.includes(skill)) {
        skillHits++;
        reasons.push("skill:" + skill);
        if (skillHits >= 2) break;
      }
    }
    score += Math.min(skillHits * 2, 4);
  }

  return { score, reasons };
}

// Return true if this job should trigger a push for this user
export function isStrongMatch(job, user, minScore = 3) {
  const { score } = scoreJobForUser(job, user);
  return score >= minScore;
}

// Build a batch message from multiple matching jobs
export function buildJobBatchMessage(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) return null;
  const titles = jobs
    .slice(0, 3)
    .map((j) => j.title)
    .filter(Boolean);

  const count = jobs.length;
  const titleList = titles.join(", ");

  if (count === 1) {
    return {
      title: "New job matches your profile",
      body: titles[0] || "Check it out",
    };
  }

  return {
    title: `${count} new jobs match your profile`,
    body: titleList + (count > 3 ? ` + ${count - 3} more` : ""),
  };
}

// Convenience: filter an array of jobs to strong matches for a user
export function filterStrongMatches(jobs, user, minScore = 3) {
  if (!Array.isArray(jobs) || jobs.length === 0) return [];
  return jobs.filter((j) => isStrongMatch(j, user, minScore));
}

export default { scoreJobForUser, isStrongMatch, buildJobBatchMessage, filterStrongMatches };
