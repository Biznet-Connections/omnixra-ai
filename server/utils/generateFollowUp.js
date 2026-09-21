import User from "../models/User.js";
import Job from "../models/Job.js";
import { askChat } from "./aiProviders.js";

// Decide what kind of nudge this should be
function pickNudgeType(state, hasFreshJobs) {
  const intent = state.lastIntent || "unknown";
  if (hasFreshJobs && intent === "search_jobs") return "new_jobs";
  if (intent === "search_jobs") return "job_checkin";
  if (intent === "cv_help") return "cv_checkin";
  if (intent === "venting") return "gentle_checkin";
  return null; // chitchat / unknown → no nudge
}

// Find fresh jobs for the user's category, excluding ones already shown
async function findFreshJobs(state) {
  try {
    if (!state.lastCategory) return [];
    const excluded = new Set((state.lastJobsShown || []).map(String));
    const jobs = await Job.find({
      active: true,
      category: new RegExp(state.lastCategory, "i"),
      _id: { $nin: [...excluded] },
      createdAt: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // last week
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();
    return jobs;
  } catch (e) {
    console.warn("[followup] findFreshJobs failed:", e.message);
    return [];
  }
}

export async function generateFollowUp(user, state) {
  const freshJobs = await findFreshJobs(state);
  const nudgeType = pickNudgeType(state, freshJobs.length > 0);
  if (!nudgeType) return null;

  const firstName = (user.name || "there").split(" ")[0];
  const category = state.lastCategory || "work";
  const location = state.lastLocation || "Zimbabwe";

  const prompts = {
    new_jobs: `Write a warm 1-2 sentence WhatsApp-style message to ${firstName} (Zimbabwean jobseeker) telling them you found ${freshJobs.length} new ${category} job${freshJobs.length > 1 ? "s" : ""} that just came in. Casual, friendly, with 1 emoji. Do NOT use quotes or greetings like "Dear". Example style: "Hey ${firstName}, I found another ${category} job for you 🔥"`,

    job_checkin: `Write a warm 1-2 sentence WhatsApp-style message to ${firstName} (Zimbabwean jobseeker) following up on their ${category} job search in ${location}. Ask casually if they got a chance to apply. Casual, friendly, 1 emoji. Do NOT use quotes or greetings like "Dear". Example style: "Hey ${firstName}, did you get a chance to apply to those ${category} roles? 👀"`,

    cv_checkin: `Write a warm 1-2 sentence WhatsApp-style message to ${firstName} (Zimbabwean jobseeker) checking in on their CV improvement. Ask casually how it's going and offer help. Casual, friendly, 1 emoji. Example style: "Hey ${firstName}, how's the CV coming along? 📄 Want me to review it?"`,

    gentle_checkin: `Write a warm, gentle 1-2 sentence WhatsApp-style message to ${firstName} (Zimbabwean jobseeker) who seemed stressed last time. Do NOT mention jobs. Just check in on how they're doing. Empathetic, warm, 1 emoji. Example style: "Hey ${firstName}, just checking in — how are you holding up? 💙"`,
  };

  const prompt = prompts[nudgeType];
  const chips = {
    new_jobs: ["Show me these jobs", "Not now"],
    job_checkin: ["Show me more jobs", "Yes, I applied", "Not yet"],
    cv_checkin: ["Review my CV", "Show me jobs", "Later"],
    gentle_checkin: ["I'm okay", "Show me jobs", "Just want to talk"],
  };

  let text;
  try {
    const result = await askChat(
      [
        { role: "system", content: "You are a warm Zimbabwean employment assistant AI. Reply with only the message text — no quotes, no JSON, no labels." },
        { role: "user", content: prompt },
      ],
      { temperature: 0.85, maxTokens: 80 }
    );
    text = (result?.text || "").trim();
  } catch (e) {
    console.warn("[followup] generate text failed:", e.message);
    text = null;
  }

  // Fallback text if AI failed
  if (!text) {
    const fallbacks = {
      new_jobs: `Hey ${firstName}, I found ${freshJobs.length} new ${category} job${freshJobs.length > 1 ? "s" : ""} for you 🔥`,
      job_checkin: `Hey ${firstName}, did you get a chance to apply to those ${category} roles? 👀`,
      cv_checkin: `Hey ${firstName}, how's the CV coming along? 📄`,
      gentle_checkin: `Hey ${firstName}, just checking in — how are you holding up? 💙`,
    };
    text = fallbacks[nudgeType];
  }

  // Clean any stray quotes/prefixes the AI might add
  text = text.replace(/^["'`]|["'`]$/g, "").trim();

  return { nudgeType, text, chips: chips[nudgeType], freshJobs };
}
