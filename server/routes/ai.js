import express from "express";
import { protect } from "../middleware/auth.js";
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
    let category = detectCategory(query || "") || req.user.category || "General";
    console.log(`Job search: query="${query}", category="${category}"`);

    // Fetch existing jobs from DB (both AI-generated and posted)
    let jobs = await Job.find({ active: true, category }).sort({ createdAt: -1 }).limit(5);

    // If not enough, generate new ones from companies
    if (jobs.length === 0) {
      const companies = await Company.find().limit(10);
      const titles = getJobTitlesForCategory(category);
      // Shuffle companies and titles for variety
      const shuffledCompanies = companies.sort(() => Math.random() - 0.5);
      const shuffledTitles = [...titles].sort(() => Math.random() - 0.5);

      jobs = [];
      for (let i = 0; i < Math.min(5, shuffledCompanies.length); i++) {
        const company = shuffledCompanies[i];
        const title = shuffledTitles[i % shuffledTitles.length];
        const deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

        // Create job in DB
        const job = await Job.create({
          title,
          company: company.name,
          companyId: company._id,
          location: company.location,
          category,
          description: `${company.name} is seeking a ${title} to join their team in ${company.location}. Apply now!`,
          salary: null,
          type: "Full-time",
          deadline,
          email: company.email,
          source: "ai-generated",
          active: true
        });
        // Add slug
        job.slug = generateJobSlug(category, title, company.name, job._id);
        await job.save();
        jobs.push(job);
      }
    }

    const text = jobs.length > 0
      ? `I found ${jobs.length} opportunities for ${category}. Here they are:`
      : "I couldn't find exact matches. Try different keywords.";
    res.json({ jobs, text });
  } catch (error) {
    console.error("Find jobs error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/chat", protect, async (req, res) => {
  try {
    const { messages } = req.body;
    const systemPrompt = `You are Omnixra AI, a friendly employment assistant for Zimbabwe and Africa.
You can speak English, Shona, Ndebele, and any language the user prefers.
Your job is to help users find jobs, understand job requirements, improve CVs, and navigate employment.
Be warm, helpful, and professional. Always support the user regardless of education level.`;
    const formattedMessages = messages.map(m => ({
      role: m.role === "ai" || m.role === "assistant" ? "assistant" : m.role,
      content: m.content || m.text
    }));
    const aiResponse = await askAI([{ role: "system", content: systemPrompt }, ...formattedMessages]);
    
    // Save to chat history
    const chat = await Chat.create({
      user: req.user._id,
      message: messages[messages.length - 1]?.content || messages[messages.length - 1]?.text || "",
      response: aiResponse,
      shared: false
    });
    
    res.json({ text: aiResponse, chatId: chat._id });
  } catch (error) {
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
    const aiResponse = await askAI([
      { role: "system", content: "You are Omnixra AI. Analyse candidates honestly." },
      { role: "user", content: prompt }
    ]);
    res.json({ text: aiResponse });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
