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
    const { messages } = req.body;
    const systemPrompt = `You are Omnixra AI, a friendly employment assistant for Zimbabwe and Africa.
You can speak English, Shona, Ndebele, and any language the user prefers.
Your job is to help users find jobs, understand job requirements, improve CVs, and navigate employment.
Be warm, helpful, and professional. Always support the user regardless of education level.`;
    const formattedMessages = messages.map(m => ({
      role: m.role === "ai" || m.role === "assistant" ? "assistant" : m.role,
      content: m.content || m.text
    }));
    let aiResponse;
    try {
      aiResponse = await askAI([{ role: "system", content: systemPrompt }, ...formattedMessages]);
    } catch (aiErr) {
      console.error("AI call failed:", aiErr.message);
      return res.status(503).json({ message: "AI is having trouble right now. Please try again in a moment." });
    }

    if (!aiResponse || typeof aiResponse !== "string" || !aiResponse.trim()) {
      return res.status(503).json({ message: "AI returned an empty response. Please try again." });
    }
    
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
    let aiResponse;
    try {
      aiResponse = await askAI([
        { role: "system", content: "You are Omnixra AI. Analyse candidates honestly." },
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
      { name: "Information Technology", emoji: "💻" },
      { name: "Software Development", emoji: "📱" },
      { name: "Networking", emoji: "🌐" },
      { name: "Cybersecurity", emoji: "🔒" },
      { name: "Finance & Accounting", emoji: "💰" },
      { name: "Banking", emoji: "🏦" },
      { name: "Insurance", emoji: "🛡️" },
      { name: "Marketing & Sales", emoji: "📈" },
      { name: "Digital Marketing", emoji: "📣" },
      { name: "Healthcare", emoji: "🏥" },
      { name: "Nursing", emoji: "👩‍⚕️" },
      { name: "Pharmacy", emoji: "💊" },
      { name: "Education", emoji: "📚" },
      { name: "Teaching", emoji: "👨‍🏫" },
      { name: "Engineering", emoji: "⚙️" },
      { name: "Construction", emoji: "🏗️" },
      { name: "Plumbing", emoji: "🔧" },
      { name: "Electrical", emoji: "⚡" },
      { name: "Welding & Fabrication", emoji: "🔥" },
      { name: "Mechanics", emoji: "🔩" },
      { name: "Carpentry", emoji: "🪚" },
      { name: "Housekeeping", emoji: "🧹" },
      { name: "Gardening", emoji: "🌱" },
      { name: "Nanny / Childcare", emoji: "👶" },
      { name: "Driving", emoji: "🚗" },
      { name: "Logistics", emoji: "🚚" },
      { name: "Security", emoji: "🛡️" },
      { name: "Farm Work", emoji: "🌾" },
      { name: "Agriculture", emoji: "🚜" },
      { name: "Retail", emoji: "🛍️" },
      { name: "Hospitality", emoji: "🏨" },
      { name: "Tourism", emoji: "✈️" },
      { name: "Media & Communications", emoji: "📰" },
      { name: "Legal", emoji: "⚖️" },
      { name: "Human Resources", emoji: "👥" },
      { name: "General", emoji: "💼" }
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
            emoji: ["🚜", "🌾", "💼", "🔧", "🏗️", "💻"][i % 6] 
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
          { role: "system", content: "You are a career industry assistant. Given a user's search term, suggest up to 5 relevant industries or job categories. Return ONLY a JSON array of strings, no explanation. Example: [\"Agriculture\", \"Farm Work\", \"Crop Farming\"]" },
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
          matches = parsed.slice(0, 6).map(name => ({ name: String(name).trim(), emoji: "💼" }));
        }
      } catch (aiError) {
        console.error("AI industry suggestion failed:", aiError.message);
      }
    }
    
    // If STILL no matches, suggest based on keywords
    if (matches.length === 0 && q.length >= 2) {
      const keywordMap = {
        "farm": [{ name: "Agriculture", emoji: "🚜" }, { name: "Farm Work", emoji: "🌾" }],
        "agric": [{ name: "Agriculture", emoji: "🚜" }, { name: "Farm Work", emoji: "🌾" }],
        "potato": [{ name: "Agriculture", emoji: "🚜" }, { name: "Farm Work", emoji: "🌾" }],
        "crop": [{ name: "Agriculture", emoji: "🚜" }, { name: "Farm Work", emoji: "🌾" }],
        "cook": [{ name: "Hospitality", emoji: "🏨" }, { name: "Food Service", emoji: "🍳" }],
        "food": [{ name: "Hospitality", emoji: "🏨" }, { name: "Food Service", emoji: "🍳" }],
        "tech": [{ name: "Information Technology", emoji: "💻" }, { name: "Software Development", emoji: "📱" }],
        "soft": [{ name: "Software Development", emoji: "📱" }, { name: "Information Technology", emoji: "💻" }],
        "build": [{ name: "Construction", emoji: "🏗️" }, { name: "Engineering", emoji: "⚙️" }],
        "drive": [{ name: "Driving", emoji: "🚗" }, { name: "Logistics", emoji: "🚚" }],
        "teach": [{ name: "Education", emoji: "📚" }, { name: "Teaching", emoji: "👨‍🏫" }],
        "health": [{ name: "Healthcare", emoji: "🏥" }, { name: "Nursing", emoji: "👩‍⚕️" }],
        "nurse": [{ name: "Nursing", emoji: "👩‍⚕️" }, { name: "Healthcare", emoji: "🏥" }],
        "sell": [{ name: "Marketing & Sales", emoji: "📈" }, { name: "Retail", emoji: "🛍️" }],
        "market": [{ name: "Marketing & Sales", emoji: "📈" }, { name: "Digital Marketing", emoji: "📣" }],
        "clean": [{ name: "Housekeeping", emoji: "🧹" }, { name: "Cleaning Services", emoji: "🧽" }],
        "garden": [{ name: "Gardening", emoji: "🌱" }, { name: "Agriculture", emoji: "🚜" }],
        "electric": [{ name: "Electrical", emoji: "⚡" }, { name: "Engineering", emoji: "⚙️" }],
        "plumb": [{ name: "Plumbing", emoji: "🔧" }, { name: "Construction", emoji: "🏗️" }],
        "weld": [{ name: "Welding & Fabrication", emoji: "🔥" }, { name: "Construction", emoji: "🏗️" }],
        "mechanic": [{ name: "Mechanics", emoji: "🔩" }, { name: "Automotive", emoji: "🚗" }],
        "carpent": [{ name: "Carpentry", emoji: "🪚" }, { name: "Construction", emoji: "🏗️" }],
        "security": [{ name: "Security", emoji: "🛡️" }, { name: "Safety", emoji: "🔒" }],
        "account": [{ name: "Finance & Accounting", emoji: "💰" }, { name: "Accounting", emoji: "📊" }],
        "finance": [{ name: "Finance & Accounting", emoji: "💰" }, { name: "Banking", emoji: "🏦" }],
        "bank": [{ name: "Banking", emoji: "🏦" }, { name: "Finance & Accounting", emoji: "💰" }]
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

export default router;
