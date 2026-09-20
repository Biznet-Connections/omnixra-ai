import express from "express";
import { protect } from "../middleware/auth.js";
import { searchJobs, countJobs, searchUsers, countUsers, enrichJobsWithMatch } from "../utils/aiTools.js";
import { askChat, askOpenAIVision, transcribeAudio } from "../utils/aiProviders.js";
import { askAI } from "../utils/aiService.js";
import Job from "../models/Job.js";
import Company from "../models/Company.js";
import User from "../models/User.js";
import Application from "../models/Application.js";
import Chat from "../models/Chat.js";
import { slugify, generateJobSlug } from "../utils/slugify.js";

const router = express.Router();

const categoryMap = {
  "network": "Information Technology",
  "networking": "Information Technology",
  "it": "Information Technology",
  "software": "Information Technology",
  "developer": "Information Technology",
  "accounting": "Finance & Accounting",
  "accountant": "Finance & Accounting",
  "finance": "Finance & Accounting",
  "bookkeeper": "Finance & Accounting",
  "audit": "Finance & Accounting",
  "marketing": "Marketing & Sales",
  "sales": "Marketing & Sales",
  "healthcare": "Healthcare",
  "nurse": "Healthcare",
  "teacher": "Education",
  "education": "Education",
  "plumber": "Plumbing",
  "plumbing": "Plumbing",
  "electrician": "Electrical",
  "electrical": "Electrical",
  "welder": "Welding & Fabrication",
  "welding": "Welding & Fabrication",
  "mechanic": "Mechanics",
  "carpenter": "Carpentry",
  "housekeeper": "Housekeeping",
  "gardener": "Gardening",
  "gardening": "Gardening",
  "nanny": "Nanny / Childcare",
  "driver": "Driving",
  "security": "Security",
  "farm": "Farm Work",
  "construction": "Construction Labour"
};

function detectCategory(query) {
  const q = query.toLowerCase();
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (q.includes(keyword)) return category;
  }
  return null;
}

function getJobTitlesForCategory(category) {
  const titles = {
    "Information Technology": ["IT Support Specialist", "Software Developer", "Systems Administrator", "Network Technician"],
    "Finance & Accounting": ["Accountant", "Finance Officer", "Bookkeeper", "Auditor"],
    "Marketing & Sales": ["Sales Agent", "Marketing Officer", "Digital Marketing Specialist", "Brand Manager"],
    "Healthcare": ["Nurse", "Caregiver", "Pharmacist Assistant", "Clinic Assistant"],
    "Education": ["Teacher", "Teaching Assistant", "Tutor", "Education Officer"],
    "Plumbing": ["Plumber", "Plumbing Assistant", "Maintenance Plumber"],
    "Electrical": ["Electrician", "Electrical Assistant", "Maintenance Electrician"],
    "Welding & Fabrication": ["Welder", "Fabricator", "Metal Worker"],
    "Mechanics": ["Mechanic", "Auto Technician", "Diesel Mechanic"],
    "Carpentry": ["Carpenter", "Furniture Maker", "Construction Carpenter"],
    "Housekeeping": ["Housekeeper", "Cleaner", "Domestic Worker"],
    "Gardening": ["Gardener", "Grounds Keeper", "Landscape Assistant"],
    "Nanny / Childcare": ["Nanny", "Childminder", "Au Pair"],
    "Driving": ["Driver", "Truck Driver", "Delivery Driver"],
    "Security": ["Security Guard", "Security Officer", "CCTV Operator"],
    "Farm Work": ["Farm Worker", "Agricultural Assistant", "Field Worker"],
    "Construction Labour": ["Construction Worker", "Site Labourer", "Builder"],
    "General": ["General Worker", "Office Assistant", "Administrative Assistant", "Customer Service"]
  };
  return titles[category] || titles["General"];
}

router.post("/jobs", protect, async (req, res) => {
  try {
    const { query } = req.body;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let category = detectCategory(query || "") || req.user.category || "General";
    console.log(`Job search: query="${query}", category="${category}", page=${page}`);

    let totalInCategory = await Job.countDocuments({ active: true, category });

    if (totalInCategory < 30) {
      const companies = await Company.find().limit(50);
      const titles = getJobTitlesForCategory(category);
      const shuffledCompanies = companies.sort(() => Math.random() - 0.5);
      const shuffledTitles = [...titles].sort(() => Math.random() - 0.5);
      const needed = 30 - totalInCategory;

      for (let i = 0; i < Math.min(needed, shuffledCompanies.length); i++) {
        const company = shuffledCompanies[i];
        const title = shuffledTitles[i % shuffledTitles.length];
        const deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

        try {
          const job = await Job.create({
            title,
            company: company.name,
            companyId: company._id,
            location: company.location || "Zimbabwe",
            category,
            description: `${company.name} is seeking a ${title} to join their team in ${company.location || "Zimbabwe"}. Apply now!`,
            salary: null,
            type: "Full-time",
            deadline,
            email: company.email,
            source: "ai-generated",
            active: true
          });
          job.slug = generateJobSlug(category, title, company.name, job._id);
          await job.save();
        } catch (err) {
          if (err.code !== 11000) console.error(err.message);
        }
      }
      totalInCategory = await Job.countDocuments({ active: true, category });
    }

    const jobs = await Job.find({ active: true, category })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const hasMore = page * limit < totalInCategory;

    const text = jobs.length > 0
      ? `Found ${jobs.length} opportunities for ${category}.`
      : "No jobs found for this category.";

    res.json({ jobs, hasMore, total: totalInCategory, page, text });
  } catch (error) {
    console.error("Find jobs error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/chat", protect, async (req, res) => {
  try {
    const { messages, chatId } = req.body;
    const now = new Date();
    const currentDate = now.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
    const currentYear = now.getFullYear();

    const lastMsg = messages[messages.length - 1];
    const lastUserMsg = String(lastMsg?.content || lastMsg?.text || "");
    const lower = lastUserMsg.toLowerCase();

    // ── Tone detection ──
    const hasEmoji = /[🌀-🧿☀-⛿✀-➿]/u.test(lastUserMsg);
    const isCasual = /(yo|bro|man|hey|hi there|😂|😄|🤣|lol|haha|sup|whats up|what's up)/i.test(lower);
    const isFormal = /(good morning|good afternoon|good evening|kindly|please may|i would like to|i am seeking)/i.test(lower);
    const isUrgent = /(urgent|urgently|really need|desperate|asap|now please|any job|quick)/i.test(lower);
    const hasShona = /(ndinoda|ndikubatsire|mhoroi|ndapota|zvakanaka|basa|unoda|ndiri|kutsvaira|mudzimba)/i.test(lower);
    const hasNdebele = /(ngicela|ngiyabonga|ngifuna|sawubona|umsebenzi|ngiyafuna)/i.test(lower);

    // ── Language hint ──
    const languageHint = hasShona ? "User speaks Shona. Reply in Shona."
                        : hasNdebele ? "User speaks Ndebele. Reply in Ndebele."
                        : "Reply in the user's language (usually English with Zimbabwe context).";

    // ── Tone hint ──
    const toneHint = isUrgent ? "URGENT: user needs fast results. Skip questions, show jobs now."
                   : isCasual ? "CASUAL: match the user's energy. Be friendly, use emoji if they did."
                   : isFormal ? "FORMAL: reply professionally, no slang."
                   : "Neutral: match user's tone naturally.";

    const isCompany = req.user.accountType === "company";
    const userCategory = req.user.category || "General";
    const userLocation = req.user.location || "Zimbabwe";
    const userSkills = (req.user.skills || []).join(", ") || "none set";

    // ── Real DB stats to give the AI context ──
    let dbContext = "";
    try {
      if (isCompany) {
        const userCount = await countUsers({});
        dbContext = `\nPlatform database: ${userCount} jobseekers available platform-wide.`;
      } else {
        const jobCount = await countJobs({});
        dbContext = `\nPlatform database: ${jobCount} active jobs platform-wide.`;
      }
    } catch (e) {
      dbContext = "";
    }

    const systemPrompt = isCompany
      ? `You are Omnixra AI — a warm, adaptive hiring assistant for Zimbabwe and Africa.
Today is ${currentDate}, year ${currentYear}.

MISSION: Help companies find qualified candidates and draft job posts.
Be a friend, not a form. Match the user's tone.

TONE: ${toneHint}
LANGUAGE: ${languageHint}

CORE RULES:
1. READ THE ROOM. Casual user = casual reply. Formal user = formal reply.
2. DON'T PUSH A SCRIPT. Every turn is a decision.
3. ASK CHIPS when there are clear options (use JSON format below).
4. SKIP QUESTIONS you already have answers to.
5. When user is ready for candidates, return a "tool_call" to fetch them.
6. NEVER FABRICATE. If user asks "how many", return a tool_call to count.
7. BE BRIEF. Zimbabwe users may have limited data.
8. CRITICAL: You MUST return valid JSON. No prose before or after.
9. CRITICAL: When user asks for candidates, you MUST include a "tool_call" field.
   Do NOT just say "let me find them" — actually return:
   { "tool_call": { "name": "search_users", "args": { "category": "...", "location": "..." } } }

RESPONSE FORMAT (return valid JSON only):
{
  "message": "your text reply (can be casual, can have emoji)",
  "chips": ["option1", "option2"] or null,
  "tool_call": { "name": "search_users", "args": { "category": "...", "location": "..." } } or null,
  "tone": "casual" | "formal" | "empathetic" | "neutral",
  "profileSaveOffer": null
}

TOOLS AVAILABLE:
- search_users({ category, location, skills }) → fetch candidates
- count_users({ category, location, skills }) → count candidates
- count_jobs({ category, location }) → count jobs
- count_companies({ category, location }) → count companies
${dbContext}`
      : `You are Omnixra AI — a warm, adaptive employment assistant for Zimbabwe and Africa.
Today is ${currentDate}, year ${currentYear}.

MISSION: Help jobseekers find jobs, improve CVs, and grow careers.
Be a friend, not a form. Match the user's tone.

USER PROFILE:
- Category: ${userCategory}
- Location: ${userLocation}
- Skills: ${userSkills}

TONE: ${toneHint}
LANGUAGE: ${languageHint}

CORE RULES:
1. READ THE ROOM. Casual user = casual reply. Formal user = formal reply.
2. DON'T PUSH A SCRIPT. Every turn is a decision.
3. ASK CHIPS when there are clear options.
4. SKIP QUESTIONS you already have answers to.
5. When user is ready for jobs, return a "tool_call" to search them.
6. NEVER FABRICATE. If user asks "how many", return a tool_call to count.
7. BE BRIEF. Short responses > long ones.
8. NEVER dump 10+ jobs at once. Max 5 at a time.
9. CRITICAL: You MUST return valid JSON. No prose before or after.
10. CRITICAL: When user asks for jobs/candidates, you MUST include a "tool_call" field.
    Do NOT just say "let me find them" — actually return:
    { "tool_call": { "name": "search_jobs", "args": { "category": "...", "location": "..." } } }
11. Use the user's real category from their profile when searching. If unknown, ask first.

RESPONSE FORMAT (return valid JSON only):
{
  "message": "your text reply (can be casual, can have emoji)",
  "chips": ["Harare", "Bulawayo", "Anywhere"] or null,
  "tool_call": { "name": "search_jobs", "args": { "category": "General Worker", "location": "Harare" } } or null,
  "tone": "casual" | "formal" | "empathetic" | "neutral",
  "profileSaveOffer": null
}

TOOLS AVAILABLE:
- search_jobs({ category, location }) → fetch jobs
- count_jobs({ category, location }) → count jobs
- count_users({ category, location }) → count candidates
- count_companies({ category, location }) → count companies
${dbContext}`;

    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({
        role: m.role === "ai" || m.role === "assistant" ? "assistant" : m.role,
        content: m.content || m.text || ""
      }))
    ];

    let aiRaw;
    try {
      aiRaw = await askChat(formattedMessages, { temperature: 0.8, maxTokens: 1000, jsonMode: true });
    } catch (aiErr) {
      console.error("AI call failed:", aiErr.message);
      return res.status(503).json({ message: "AI is having trouble right now. Please try again." });
    }

    let aiText = aiRaw.text || "";
    // Strip code fences if present
    aiText = aiText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    // Parse the JSON response
    let parsed = null;
    try {
      parsed = JSON.parse(aiText);
    } catch (e) {
      // AI didn't return JSON — treat the whole thing as the message
      parsed = { message: aiText, chips: null, tool_call: null, tone: "neutral", profileSaveOffer: null };
    }

    const out = {
      text: parsed.message || aiText,
      chips: parsed.chips || null,
      tone: parsed.tone || "neutral",
      jobs: null,
      talent: null,
      profileSaveOffer: parsed.profileSaveOffer || null,
    };

    // ── Execute tool call if present ──
    if (parsed.tool_call) {
      try {
        const { name, args = {} } = parsed.tool_call;
        if (name === "search_jobs") {
          const jobs = await searchJobs({ ...args, limit: 5 });
          out.jobs = enrichJobsWithMatch(jobs, req.user);
          out.text = out.text || `Found ${out.jobs.length} jobs matching your search.`;
        } else if (name === "search_users") {
          const users = await searchUsers({ ...args, limit: 5 });
          out.talent = users;
          out.text = out.text || `Found ${out.talent.length} candidates matching your search.`;
        } else if (name === "count_jobs") {
          const n = await countJobs(args);
          out.text = `We have **${n}** jobs matching that` + (args.location ? ` in ${args.location}` : "") + ". Want to see the top matches?";
        } else if (name === "count_users") {
          const n = await countUsers(args);
          out.text = `We have **${n}** candidates matching that` + (args.location ? ` in ${args.location}` : "") + ". Want to see them?";
        } else if (name === "count_companies") {
          const n = await countCompanies(args);
          out.text = `We have **${n}** companies` + (args.location ? ` in ${args.location}` : "") + ".";
        }
      } catch (toolErr) {
        console.error("[ai/chat] tool error:", toolErr.message);
      }
    }

    // ── Save chat ──
    const lastUserText = lastUserMsg;
    const newMsgs = messages.map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content || m.text || "",
    }));
    newMsgs.push({
      role: "assistant",
      content: out.text,
      meta: { chips: out.chips, tone: out.tone },
    });

    let chat;
    if (chatId) chat = await Chat.findOne({ _id: chatId, user: req.user._id });
    if (chat) {
      chat.messages = newMsgs;
      if (!chat.title || chat.title === "New chat") chat.title = lastUserText.slice(0, 60) || "New chat";
      await chat.save();
    } else {
      chat = await Chat.create({
        user: req.user._id,
        title: lastUserText.slice(0, 60) || "New chat",
        messages: newMsgs,
        shared: false,
      });
    }

    res.json({ ...out, chatId: chat._id });
  } catch (error) {
    console.error("[ai/chat] error:", error);
    res.status(500).json({ message: error.message });
  }
});

// SHARE AI message
router.post("/share/:chatId", protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    
    chat.shared = true;
    await chat.save();
    
    res.json({ 
      shareUrl: `/share/ai/${chat._id}`,
      chatId: chat._id 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET shared AI message (public)
router.get("/shared/:chatId", async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId).populate("user", "name profilePicture");
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    
    res.json({
      message: chat.message,
      response: chat.response,
      user: chat.user,
      createdAt: chat.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/talent", protect, async (req, res) => {
  try {
    if (req.user.accountType !== "company" && req.user.accountType !== "admin") {
      return res.status(403).json({ message: "Company account required" });
    }
    const { query } = req.body;
    const regex = new RegExp(query || "", "i");
    let talent = await User.find({
      accountType: "jobseeker",
      discoverable: true,
      $or: [{ headline: regex }, { skills: regex }, { name: regex }, { location: regex }, { category: regex }]
    })
      .sort({ isPremium: -1, createdAt: -1 })
      .limit(10)
      .select("-password");
    res.json({ talent, text: `I found ${talent.length} matching candidates:` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/analyze-person", protect, async (req, res) => {
  try {
    const { personId, question } = req.body;
    const person = await User.findById(personId).select("-password");
    if (!person) return res.status(404).json({ message: "Person not found" });
    const prompt = `Candidate: ${person.name}\nCategory: ${person.category}\nHeadline: ${person.headline || "N/A"}\nSkills: ${person.skills?.join(", ") || "N/A"}\nLocation: ${person.location || "N/A"}\nPremium: ${person.isPremium ? "Yes" : "No"}\nQuestion: ${question}`;
    let aiResponse;
    try {
      aiResponse = await askAI([
        { role: "system", content: `You are Omnixra AI, an employment intelligence assistant. Today's date is ${new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}. Analyse candidates honestly and professionally.` },
        { role: "user", content: prompt }
      ]);
    } catch (aiErr) {
      return res.status(503).json({ message: "AI is having trouble. Please try again." });
    }
    if (!aiResponse || typeof aiResponse !== "string" || !aiResponse.trim()) {
      return res.status(503).json({ message: "AI returned an empty response." });
    }
    res.json({ text: aiResponse });
  } catch (error) {
    console.error("Analyze error:", error.message);
    res.status(500).json({ message: error.message });
  }
});


// SEARCH INDUSTRIES (AI-powered with smart hints)
router.post("/industries", async (req, res) => {
  try {
    const { query } = req.body;
    const q = (query || "").toLowerCase().trim();
    console.log(`Industry search: "${query}"`);
    
    // Local industry list with emojis
    const localIndustries = [
      { name: "Information Technology", emoji: "ðŸ’»" },
      { name: "Software Development", emoji: "ðŸ“±" },
      { name: "Networking", emoji: "ðŸŒ" },
      { name: "Cybersecurity", emoji: "ðŸ”’" },
      { name: "Finance & Accounting", emoji: "ðŸ’°" },
      { name: "Banking", emoji: "ðŸ¦" },
      { name: "Insurance", emoji: "ðŸ›¡ï¸" },
      { name: "Marketing & Sales", emoji: "ðŸ“ˆ" },
      { name: "Digital Marketing", emoji: "ðŸ“£" },
      { name: "Healthcare", emoji: "ðŸ¥" },
      { name: "Nursing", emoji: "ðŸ‘©â€âš•ï¸" },
      { name: "Pharmacy", emoji: "ðŸ’Š" },
      { name: "Education", emoji: "ðŸ“š" },
      { name: "Teaching", emoji: "ðŸ‘¨â€ðŸ«" },
      { name: "Engineering", emoji: "âš™ï¸" },
      { name: "Construction", emoji: "ðŸ—ï¸" },
      { name: "Plumbing", emoji: "ðŸ”§" },
      { name: "Electrical", emoji: "âš¡" },
      { name: "Welding & Fabrication", emoji: "ðŸ”¥" },
      { name: "Mechanics", emoji: "ðŸ”©" },
      { name: "Carpentry", emoji: "ðŸªš" },
      { name: "Housekeeping", emoji: "ðŸ§¹" },
      { name: "Gardening", emoji: "ðŸŒ±" },
      { name: "Nanny / Childcare", emoji: "ðŸ‘¶" },
      { name: "Driving", emoji: "ðŸš—" },
      { name: "Logistics", emoji: "ðŸšš" },
      { name: "Security", emoji: "ðŸ›¡ï¸" },
      { name: "Farm Work", emoji: "ðŸŒ¾" },
      { name: "Agriculture", emoji: "ðŸšœ" },
      { name: "Retail", emoji: "ðŸ›ï¸" },
      { name: "Hospitality", emoji: "ðŸ¨" },
      { name: "Tourism", emoji: "âœˆï¸" },
      { name: "Media & Communications", emoji: "ðŸ“°" },
      { name: "Legal", emoji: "âš–ï¸" },
      { name: "Human Resources", emoji: "ðŸ‘¥" },
      { name: "General", emoji: "ðŸ’¼" }
    ];
    
    // Filter local list
    let matches = localIndustries.filter(ind => 
      ind.name.toLowerCase().includes(q)
    );
    
    // SMART KEYWORD MATCHING - always suggest something
    const keywordMap = {
      "farm": ["Agriculture", "Farm Work", "Crop Farming"],
      "agric": ["Agriculture", "Farm Work", "Crop Farming"],
      "plant": ["Agriculture", "Farm Work", "Gardening"],
      "potato": ["Agriculture", "Farm Work", "Crop Farming"],
      "crop": ["Agriculture", "Farm Work", "Crop Farming"],
      "garden": ["Gardening", "Agriculture", "Landscaping"],
      "cook": ["Hospitality", "Food Service", "Culinary"],
      "food": ["Hospitality", "Food Service", "Culinary"],
      "chef": ["Hospitality", "Food Service", "Culinary"],
      "restaurant": ["Hospitality", "Food Service"],
      "hotel": ["Hospitality", "Tourism"],
      "tech": ["Information Technology", "Software Development"],
      "soft": ["Software Development", "Information Technology"],
      "program": ["Software Development", "Information Technology"],
      "code": ["Software Development", "Information Technology"],
      "computer": ["Information Technology", "Software Development"],
      "network": ["Networking", "Information Technology"],
      "cyber": ["Cybersecurity", "Information Technology"],
      "hack": ["Cybersecurity", "Information Technology"],
      "build": ["Construction", "Engineering"],
      "construct": ["Construction", "Engineering"],
      "drive": ["Driving", "Logistics", "Transport"],
      "car": ["Mechanics", "Automotive", "Driving"],
      "fix": ["Mechanics", "Maintenance", "Repair Services"],
      "repair": ["Mechanics", "Maintenance", "Repair Services"],
      "teach": ["Education", "Teaching"],
      "school": ["Education", "Teaching"],
      "tutor": ["Education", "Teaching"],
      "health": ["Healthcare", "Nursing"],
      "nurse": ["Nursing", "Healthcare"],
      "doctor": ["Healthcare", "Medical"],
      "medicine": ["Healthcare", "Pharmacy"],
      "sell": ["Marketing & Sales", "Retail"],
      "market": ["Marketing & Sales", "Digital Marketing"],
      "shop": ["Retail", "Sales"],
      "store": ["Retail", "Sales"],
      "clean": ["Housekeeping", "Cleaning Services"],
      "housekeep": ["Housekeeping", "Cleaning Services"],
      "child": ["Nanny / Childcare", "Education"],
      "baby": ["Nanny / Childcare"],
      "care": ["Nanny / Childcare", "Healthcare"],
      "electric": ["Electrical", "Engineering"],
      "wire": ["Electrical", "Engineering"],
      "plumb": ["Plumbing", "Construction"],
      "pipe": ["Plumbing", "Construction"],
      "weld": ["Welding & Fabrication", "Construction"],
      "metal": ["Welding & Fabrication", "Construction"],
      "mechanic": ["Mechanics", "Automotive"],
      "engine": ["Mechanics", "Engineering"],
      "carpent": ["Carpentry", "Construction"],
      "wood": ["Carpentry", "Construction"],
      "furniture": ["Carpentry", "Construction"],
      "security": ["Security", "Safety"],
      "guard": ["Security", "Safety"],
      "account": ["Finance & Accounting", "Accounting"],
      "finance": ["Finance & Accounting", "Banking"],
      "bank": ["Banking", "Finance & Accounting"],
      "money": ["Finance & Accounting", "Banking"],
      "audit": ["Finance & Accounting", "Accounting"],
      "tax": ["Finance & Accounting", "Accounting"],
      "law": ["Legal"],
      "legal": ["Legal"],
      "hr": ["Human Resources"],
      "recruit": ["Human Resources"],
      "people": ["Human Resources"],
      "media": ["Media & Communications"],
      "news": ["Media & Communications"],
      "write": ["Media & Communications", "Content Writing"],
      "design": ["Design", "Digital Marketing"],
      "art": ["Design", "Creative"],
      "photo": ["Media & Communications", "Photography"],
      "video": ["Media & Communications", "Video Production"],
      "music": ["Music", "Entertainment"],
      "entertain": ["Entertainment", "Hospitality"],
      "sport": ["Sports", "Fitness"],
      "fit": ["Fitness", "Sports"],
      "gym": ["Fitness", "Sports"],
      "beauty": ["Beauty", "Cosmetics"],
      "hair": ["Beauty", "Cosmetics"],
      "makeup": ["Beauty", "Cosmetics"],
      "fashion": ["Fashion Design", "Retail"],
      "cloth": ["Fashion Design", "Retail"],
      "tailor": ["Tailoring", "Fashion Design"],
      "sew": ["Tailoring", "Fashion Design"]
    };
    
    // Check keyword map FIRST
    if (matches.length === 0 && q.length >= 2) {
      for (const [keyword, suggestions] of Object.entries(keywordMap)) {
        if (q.includes(keyword)) {
          matches = suggestions.map((name, i) => ({ 
            name, 
            emoji: ["ðŸšœ", "ðŸŒ¾", "ðŸ’¼", "ðŸ”§", "ðŸ—ï¸", "ðŸ’»"][i % 6] 
          }));
          console.log(`Keyword match for "${keyword}":`, matches);
          break;
        }
      }
    }
    
    // If still no matches, ask AI
    if (matches.length === 0 && q.length >= 2) {
      try {
        const aiResponse = await askAI([
          { role: "system", content: `You are a career industry assistant in ${new Date().getFullYear()}. Given a user's search term, suggest up to 5 relevant industries or job categories. Return ONLY a JSON array of strings, no explanation. Example: ["Agriculture", "Farm Work", "Crop Farming"]` },
          { role: "user", content: `Suggest industries for: "${query}"` }
        ]);
        
        console.log("AI response for industries:", aiResponse);
        
        // Try multiple parsing approaches
        let parsed = null;
        try {
          parsed = JSON.parse(aiResponse);
        } catch {
          // Try to extract array from text
          const match = aiResponse.match(/\[.*\]/s);
          if (match) {
            try {
              parsed = JSON.parse(match[0]);
            } catch {}
          }
          if (!parsed) {
            // Split by newlines or commas
            parsed = aiResponse
              .replace(/[\[\]\"\']/g, '')
              .split(/[,\n]+/)
              .map(s => s.trim())
              .filter(s => s.length > 1);
          }
        }
        
        if (Array.isArray(parsed) && parsed.length > 0) {
          matches = parsed.slice(0, 6).map(name => ({ name: String(name).trim(), emoji: "ðŸ’¼" }));
        }
      } catch (aiError) {
        console.error("AI industry suggestion failed:", aiError.message);
      }
    }
    
    // If STILL no matches, suggest based on keywords
    if (matches.length === 0 && q.length >= 2) {
      const keywordMap = {
        "farm": [{ name: "Agriculture", emoji: "ðŸšœ" }, { name: "Farm Work", emoji: "ðŸŒ¾" }],
        "agric": [{ name: "Agriculture", emoji: "ðŸšœ" }, { name: "Farm Work", emoji: "ðŸŒ¾" }],
        "potato": [{ name: "Agriculture", emoji: "ðŸšœ" }, { name: "Farm Work", emoji: "ðŸŒ¾" }],
        "crop": [{ name: "Agriculture", emoji: "ðŸšœ" }, { name: "Farm Work", emoji: "ðŸŒ¾" }],
        "cook": [{ name: "Hospitality", emoji: "ðŸ¨" }, { name: "Food Service", emoji: "ðŸ³" }],
        "food": [{ name: "Hospitality", emoji: "ðŸ¨" }, { name: "Food Service", emoji: "ðŸ³" }],
        "tech": [{ name: "Information Technology", emoji: "ðŸ’»" }, { name: "Software Development", emoji: "ðŸ“±" }],
        "soft": [{ name: "Software Development", emoji: "ðŸ“±" }, { name: "Information Technology", emoji: "ðŸ’»" }],
        "build": [{ name: "Construction", emoji: "ðŸ—ï¸" }, { name: "Engineering", emoji: "âš™ï¸" }],
        "drive": [{ name: "Driving", emoji: "ðŸš—" }, { name: "Logistics", emoji: "ðŸšš" }],
        "teach": [{ name: "Education", emoji: "ðŸ“š" }, { name: "Teaching", emoji: "ðŸ‘¨â€ðŸ«" }],
        "health": [{ name: "Healthcare", emoji: "ðŸ¥" }, { name: "Nursing", emoji: "ðŸ‘©â€âš•ï¸" }],
        "nurse": [{ name: "Nursing", emoji: "ðŸ‘©â€âš•ï¸" }, { name: "Healthcare", emoji: "ðŸ¥" }],
        "sell": [{ name: "Marketing & Sales", emoji: "ðŸ“ˆ" }, { name: "Retail", emoji: "ðŸ›ï¸" }],
        "market": [{ name: "Marketing & Sales", emoji: "ðŸ“ˆ" }, { name: "Digital Marketing", emoji: "ðŸ“£" }],
        "clean": [{ name: "Housekeeping", emoji: "ðŸ§¹" }, { name: "Cleaning Services", emoji: "ðŸ§½" }],
        "garden": [{ name: "Gardening", emoji: "ðŸŒ±" }, { name: "Agriculture", emoji: "ðŸšœ" }],
        "electric": [{ name: "Electrical", emoji: "âš¡" }, { name: "Engineering", emoji: "âš™ï¸" }],
        "plumb": [{ name: "Plumbing", emoji: "ðŸ”§" }, { name: "Construction", emoji: "ðŸ—ï¸" }],
        "weld": [{ name: "Welding & Fabrication", emoji: "ðŸ”¥" }, { name: "Construction", emoji: "ðŸ—ï¸" }],
        "mechanic": [{ name: "Mechanics", emoji: "ðŸ”©" }, { name: "Automotive", emoji: "ðŸš—" }],
        "carpent": [{ name: "Carpentry", emoji: "ðŸªš" }, { name: "Construction", emoji: "ðŸ—ï¸" }],
        "security": [{ name: "Security", emoji: "ðŸ›¡ï¸" }, { name: "Safety", emoji: "ðŸ”’" }],
        "account": [{ name: "Finance & Accounting", emoji: "ðŸ’°" }, { name: "Accounting", emoji: "ðŸ“Š" }],
        "finance": [{ name: "Finance & Accounting", emoji: "ðŸ’°" }, { name: "Banking", emoji: "ðŸ¦" }],
        "bank": [{ name: "Banking", emoji: "ðŸ¦" }, { name: "Finance & Accounting", emoji: "ðŸ’°" }]
      };
      
      for (const [keyword, suggestions] of Object.entries(keywordMap)) {
        if (q.includes(keyword)) {
          matches = suggestions;
          break;
        }
      }
    }
    
    res.json({ industries: matches });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPLOAD ATTACHMENT FOR CHAT
router.post("/upload", protect, async (req, res) => {
  try {
    const { fileData, fileName, fileType, fileSize, category } = req.body;
    if (!fileData) return res.status(400).json({ message: "fileData required" });

    const maxSize = category === "audio" ? 15 * 1024 * 1024 : 25 * 1024 * 1024;
    if (fileSize > maxSize) return res.status(400).json({ message: "File too large" });

    const base64 = fileData.includes(",") ? fileData.split(",")[1] : fileData;
    const buffer = Buffer.from(base64, "base64");

    const { uploadToR2 } = await import("../utils/r2.js");
    const folder = category === "audio" ? "audio" : category === "image" ? "images" : "files";
    const safeName = (fileName || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${folder}/${Date.now()}-${safeName}`;
    const url = await uploadToR2(buffer, fileType || "application/octet-stream", folder);

    res.json({ url, name: fileName, size: fileSize, type: fileType, category: category || "file" });
  } catch (error) {
    console.error("AI upload error:", error);
    res.status(500).json({ message: error.message });
  }
});

// LIST user's chat history
router.get("/chats", protect, async (req, res) => {
  try {
    const Chat = (await import("../models/Chat.js")).default;
    const chats = await Chat.find({ user: req.user._id, shared: { $ne: true } })
      .select("title messages updatedAt createdAt")
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    // Summary per chat — handles legacy (message/response) AND new (messages[]) shape
    // Filter out empty chats (no messages and no legacy content)
    const validChats = chats.filter(ch => {
      const hasNew = Array.isArray(ch.messages) && ch.messages.length > 0;
      const hasLegacy = !!(ch.message || ch.response);
      return hasNew || hasLegacy;
    });

    const list = validChats.map(ch => {
      const hasNew = Array.isArray(ch.messages) && ch.messages.length > 0;
      const firstUserMsg = hasNew
        ? (ch.messages.find(m => m.role === "user")?.content || ch.messages[0]?.content || "")
        : (ch.message || "");
      const lastAssistant = hasNew
        ? (ch.messages[ch.messages.length - 1]?.content || "")
        : (ch.response || "");
      const total = hasNew ? ch.messages.length : (ch.message ? 2 : 0);

      const title = (ch.title && ch.title !== "New chat")
        ? ch.title
        : (firstUserMsg ? firstUserMsg.slice(0, 50) : "New chat");

      return {
        _id: ch._id,
        title,
        messageCount: total,
        updatedAt: ch.updatedAt,
        createdAt: ch.createdAt,
        preview: lastAssistant.slice(0, 80),
      };
    });

    res.json({ chats: list, count: list.length });
  } catch (e) {
    console.error("[ai/chats] error:", e);
    res.status(500).json({ message: e.message });
  }
});

// LOAD specific chat
router.get("/chats/:id", protect, async (req, res) => {
  try {
    const Chat = (await import("../models/Chat.js")).default;
    const chat = await Chat.findOne({ _id: req.params.id, user: req.user._id }).lean();
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    // Normalize legacy chats (message/response) → messages[]
    if (!Array.isArray(chat.messages) || chat.messages.length === 0) {
      const normalized = [];
      if (chat.message) normalized.push({ role: "user", content: chat.message, attachments: [] });
      if (chat.response) normalized.push({ role: "assistant", content: chat.response, attachments: [] });
      chat.messages = normalized;
    }

    res.json({ chat });
  } catch (e) {
    console.error("[ai/chats/:id] error:", e);
    res.status(500).json({ message: e.message });
  }
});

// DELETE a chat
router.delete("/chats/:id", protect, async (req, res) => {
  try {
    const Chat = (await import("../models/Chat.js")).default;
    const r = await Chat.deleteOne({ _id: req.params.id, user: req.user._id });
    res.json({ deleted: r.deletedCount });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// AI VISION — read an image URL and respond to it
router.post("/vision", protect, async (req, res) => {
  try {
    const { imageUrl, prompt, chatId } = req.body;
    if (!imageUrl) return res.status(400).json({ message: "imageUrl required" });
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ message: "Vision not configured" });
    }

    const userPrompt = prompt || "Describe this image and give concrete next steps related to jobs or hiring.";
    const text = await askOpenAIVision({ imageUrl, prompt: userPrompt, model: process.env.OPENAI_MODEL || "gpt-4o" });

    const Chat = (await import("../models/Chat.js")).default;
    let chat;
    if (chatId) chat = await Chat.findOne({ _id: chatId, user: req.user._id });
    if (!chat) chat = await Chat.create({ user: req.user._id, title: "Image analysis", messages: [] });
    chat.messages.push({ role: "user", content: userPrompt, attachments: [{ url: imageUrl, type: "image" }] });
    chat.messages.push({ role: "assistant", content: text });
    await chat.save();

    res.json({ text, chatId: chat._id, provider: "openai" });
  } catch (error) {
    console.error("[ai/vision] error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// AUTO-COLLECT profile info from a conversation
router.post("/collect-profile", protect, async (req, res) => {
  try {
    const { conversation } = req.body;
    if (!conversation || !Array.isArray(conversation)) {
      return res.status(400).json({ message: "conversation array required" });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ message: "AI not configured" });
    }

    const text = conversation.map(m => (m.role || "user") + ": " + (m.content || m.text || "")).join("\n");

    const prompt = `Extract any of the following from this conversation. Only include fields that are clearly mentioned. Return ONLY valid JSON.

Fields:
- name: string (person's full name)
- phone: string (phone number, any format)
- location: string (city/area)
- skills: array of strings (job skills mentioned)
- category: string (job category/industry, single word or short phrase)
- expectedSalary: string (amount if mentioned)

Conversation:
${text}

Return ONLY the JSON object. If no fields found, return {}.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-1.5-flash"}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const aiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!aiRes.ok) return res.status(503).json({ message: "AI extraction failed" });

    const data = await aiRes.json();
    let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    let extracted = {};
    try { extracted = JSON.parse(raw); } catch (e) { extracted = {}; }

    res.json({ extracted });
  } catch (error) {
    console.error("[ai/collect-profile] error:", error);
    res.status(500).json({ message: error.message });
  }
});

// SAVE collected profile data
router.post("/save-profile-info", protect, async (req, res) => {
  try {
    const { name, phone, location, skills, category, expectedSalary } = req.body;
    const User = (await import("../models/User.js")).default;

    const update = {};
    if (name && !req.user.name) update.name = name;
    if (phone && !req.user.phone) update.phone = phone;
    if (location && !req.user.location) update.location = location;
    if (skills && Array.isArray(skills) && skills.length > 0) update.skills = skills;
    if (category && (!req.user.category || req.user.category === "General")) update.category = category;

    if (Object.keys(update).length === 0) {
      return res.json({ message: "Nothing to update", updated: {} });
    }

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select("-password");
    res.json({ message: "Profile updated", updated: update, user });
  } catch (error) {
    console.error("[ai/save-profile-info] error:", error);
    res.status(500).json({ message: error.message });
  }
});

// AI TRANSCRIBE — voice note → text via Deepgram
router.post("/transcribe", protect, async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) return res.status(400).json({ message: "audioBase64 required" });
    const buffer = Buffer.from(audioBase64, "base64");
    const result = await transcribeAudio({ buffer, mimeType });
    res.json(result);
  } catch (error) {
    console.error("[ai/transcribe] error:", error.message);
    res.status(503).json({ message: error.message });
  }
});

export default router;

// ── Generate cover letter for a job application ──



router.post("/apply-cover-letter", protect, async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ message: "jobId required" });

    let job = null;
    if (!jobId.startsWith("generated-")) {
      job = await Job.findById(jobId).lean();
    }
    const jobTitle = job?.title || "the advertised role";
    const company = job?.company || "your company";
    const category = job?.category || req.user.category || "General";

    const { askAI } = await import("../utils/aiService.js");
    const prompt = `Write a professional cover letter for a job application.
Applicant: ${req.user.name}
Location: ${req.user.location || "Zimbabwe"}
Category: ${req.user.category || "General"}
Skills: ${(req.user.skills || []).join(", ") || "General"}
Headline: ${req.user.headline || "Job seeker"}
Position: ${jobTitle}
Company: ${company}

Rules:
- Keep it under 200 words
- Start with "Dear Hiring Manager,"
- End with "Yours faithfully,\n${req.user.name}"
- Be confident but not arrogant
- Reference the position and company
- No emojis
- Plain text only`;

    const message = await askAI([
      { role: "system", content: "You are a professional cover letter writer." },
      { role: "user", content: prompt },
    ]);

    res.json({ message: message || "" });
  } catch (e) {
    console.error("[ai/cover-letter] error:", e.message);
    res.status(500).json({ message: e.message });
  }
});
