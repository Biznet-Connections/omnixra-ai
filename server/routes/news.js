import express from "express";
import { protect } from "../middleware/auth.js";
import { askAI } from "../utils/aiService.js";

const router = express.Router();

// GET AI NEWS INSIGHTS
router.get("/", protect, async (req, res) => {
  console.log("=== GET AI NEWS ===");
  try {
    const systemPrompt = `You are Omnixra AI. Generate short career news insights for Zimbabwe professionals.
Topics: job market trends, skills in demand, career tips, industry news, employment advice.
Keep each insight under 100 words. Make them practical and useful.`;

    const aiResponse = await askAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: "Generate 5 career news insights for today. Format as a JSON array of objects with 'title' and 'content' fields." }
    ]);

    // Parse AI response or create fallback
    let newsItems = [];
    try {
      const parsed = JSON.parse(aiResponse);
      newsItems = Array.isArray(parsed) ? parsed : [];
    } catch {
      // Fallback if AI doesn't return JSON
      newsItems = [
        { title: "Job Market Update", content: "Networking and IT roles are in high demand across Zimbabwe. Companies are looking for CCNA-certified professionals." },
        { title: "Skills in Demand", content: "Digital skills, data analysis, and cybersecurity are the top 3 skills employers want this month." },
        { title: "Career Tip", content: "Update your CV with measurable achievements. Employers respond better to numbers than descriptions." },
        { title: "Industry News", content: "The logistics sector is growing. Transport and freight companies are expanding their workforce." },
        { title: "Employment Advice", content: "Even without a degree, practical experience and certifications can open doors. Focus on what you can do." }
      ];
    }

    console.log(`Returning ${newsItems.length} news items`);
    res.json(newsItems);
  } catch (error) {
    console.error("News error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
