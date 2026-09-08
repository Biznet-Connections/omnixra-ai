import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import { initSocket } from "./socket.js";
import authRoutes from "./routes/auth.js";
import jobRoutes from "./routes/jobs.js";
import companyRoutes from "./routes/companies.js";
import voucherRoutes from "./routes/vouchers.js";
import chatRoutes from "./routes/chats.js";
import aiRoutes from "./routes/ai.js";
import adminRoutes from "./routes/admin.js";
import postRoutes from "./routes/posts.js";
import profileRoutes from "./routes/profile.js";
import newsRoutes from "./routes/news.js";
import messageRoutes from "./routes/messages.js";
import boostRoutes from "./routes/boosts.js";
import scrapedJobRoutes from "./routes/scrapedJobs.js";
import videoRoutes from "./routes/video.js";
import shareRoutes from "./routes/share.js";
import connectionRoutes from "./routes/connections.js";
import Post from "./models/Post.js";
import User from "./models/User.js";
import { askAI } from "./utils/aiService.js";
import { runScraper } from "./scraper/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*", credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/boosts", boostRoutes);
app.use("/api/scraped-jobs", scrapedJobRoutes);
app.use("/api/video", videoRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/share", shareRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

async function ensureAIUser() {
  let aiUser = await User.findOne({ email: "ai@omnixra.ai" });
  if (!aiUser) {
    aiUser = await User.create({
      name: "Omnixra AI",
      email: "ai@omnixra.ai",
      password: "AIUserPassword123!",
      accountType: "admin",
      verified: true,
      headline: "AI Career Assistant"
    });
    console.log("Created AI user:", aiUser._id);
  }
  return aiUser._id;
}

async function generateDailyNewsIfNeeded() {
  console.log("Checking daily news...");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await Post.findOne({ authorType: "ai", createdAt: { $gte: today } });
  if (existing) {
    console.log("News already generated today.");
    return;
  }
  console.log("Generating AI news...");
  try {
    const aiUserId = await ensureAIUser();
    const systemPrompt = "You are Omnixra AI. Generate a comprehensive daily career news update with sections: Industry Trends, Skills in Demand, Career Tip, Industry News, Employment Advice. Use markdown headings.";
    const aiResponse = await askAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: "Create the daily news update." }
    ]);
    const post = await Post.create({
      author: aiUserId,
      authorType: "ai",
      text: aiResponse,
      visibility: "public"
    });
    console.log("AI news generated.");
  } catch (error) {
    console.error("News generation failed:", error);
  }
}

// Dynamic Open Graph for job pages
app.get("/jobs/:slug", async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const Job = (await import("./models/Job.js")).default;
    const job = await Job.findOne({ slug });
    if (job) {
      const title = `${job.title} at ${job.company}`;
      const description = `${job.location}${job.salary ? " · " + job.salary : ""} · Apply now on Omnixra`;
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="https://omnixra-ai.com/favicon.svg" />
  <meta property="og:url" content="https://omnixra-ai.com/jobs/${job.slug}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="https://omnixra-ai.com/favicon.svg" />
</head>
<body>
  <script>window.location.href="/job/${job.slug}";</script>
</body>
</html>`;
      return res.send(html);
    }
    next();
  } catch (e) {
    next();
  }
});

// Serve frontend in production
const frontendPath = path.join(__dirname, "..", "frontend", "dist");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(frontendPath));
  app.use((req, res, next) => {
    if (!req.path.startsWith("/api") && !req.path.startsWith("/share") && !req.path.startsWith("/jobs")) {
      res.sendFile(path.join(frontendPath, "index.html"));
    } else {
      next();
    }
  });
}

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    generateDailyNewsIfNeeded();
    setInterval(generateDailyNewsIfNeeded, 24 * 60 * 60 * 1000);
    runScraper().catch(err => console.error("Scraper error:", err.message));
    setInterval(() => runScraper().catch(err => console.error("Scraper error:", err.message)), 6 * 60 * 60 * 1000);
  });
});
