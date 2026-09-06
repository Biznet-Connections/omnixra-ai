import express from "express";
import { protect } from "../middleware/auth.js";
import { askAI } from "../utils/aiService.js";
import Job from "../models/Job.js";
import Company from "../models/Company.js";
import User from "../models/User.js";
import Application from "../models/Application.js";

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

// MAIN AI CHAT
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
    res.json({ text: aiResponse });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// FIND JOBS
router.post("/jobs", protect, async (req, res) => {
  try {
    const { query } = req.body;
    let category = detectCategory(query || "");
    if (!category) category = req.user.category || "General";
    console.log(`Job search: query="${query}", category="${category}"`);

    let jobs = await Job.find({ active: true, category }).sort({ createdAt: -1 }).limit(5);

    if (jobs.length === 0) {
      const matchingCompanies = await Company.find().limit(10);
      const titles = getJobTitlesForCategory(category);
      jobs = matchingCompanies.map((company, index) => ({
        _id: `generated-${company._id}-${index}`,
        title: titles[index % titles.length],
        category: category,
        company: company.name,
        location: company.location,
        category: category,
        email: company.email,
        description: `${company.name} is seeking a ${titles[index % titles.length]} to join their team in ${company.location}.`,
        source: "ai-generated",
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        isGenerated: true,
        noDegreeRequired: category !== "Information Technology" && category !== "Finance & Accounting"
      }));
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

// FIND TALENT (company)
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

// AI AUTO-SELECT BEST CANDIDATES (company paid)
router.post("/auto-select", protect, async (req, res) => {
  console.log(`=== AI AUTO-SELECT ===`);
  try {
    if (req.user.accountType !== "company" && req.user.accountType !== "admin") {
      return res.status(403).json({ message: "Company account required" });
    }

    const { jobId } = req.body;
    const applications = await Application.find({ jobId })
      .populate("userId", "name headline skills category isPremium")
      .sort({ matchPercentage: -1 });

    if (applications.length === 0) {
      return res.json({ text: "No applicants yet for this job." });
    }

    const candidates = applications.map(a => ({
      name: a.userId?.name,
      headline: a.userId?.headline,
      skills: a.userId?.skills?.join(", "),
      category: a.userId?.category,
      match: a.matchPercentage,
      message: a.message,
      premium: a.userId?.isPremium
    }));

    const prompt = `Analyse these ${candidates.length} candidates for a job. Rank them and recommend the top 3. Provide reasoning. Candidates:\n${JSON.stringify(candidates, null, 2)}`;
    const aiResponse = await askAI([
      { role: "system", content: "You are an AI hiring assistant. Analyse candidates and recommend the best fits." },
      { role: "user", content: prompt }
    ]);

    res.json({ text: aiResponse, candidates });
  } catch (error) {
    console.error("Auto-select error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ANALYZE PERSON
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
