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
import remoteJobRoutes from "./routes/remoteJobs.js";
import videoRoutes from "./routes/video.js";
import shareRoutes from "./routes/share.js";
import seoRoutes from "./routes/seo.js";
import connectionRoutes from "./routes/connections.js";
import Post from "./models/Post.js";
import User from "./models/User.js";
import { askAI } from "./utils/aiService.js";
import { runScraper } from "./scraper/index.js";

let newsLock = false; // prevents parallel news generation
import { generateDailyAIJobs } from "./scraper/generateAIJobs.js";
import { enrichJobs } from "./scraper/enrichJobs.js";

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
app.use("/api/remote-jobs", remoteJobRoutes);
app.use("/api/video", videoRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/share", shareRoutes);
app.use("/", seoRoutes);

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
  console.log("═══════════════════════════════════════════");
  console.log("📰 NEWS CHECK STARTED at", new Date().toISOString());
  console.log("   newsLock:", newsLock);
  console.log("   DISABLE_AUTO_NEWS:", process.env.DISABLE_AUTO_NEWS);
  
  // Module-level lock
  if (newsLock) {
    console.log("   ❌ SKIPPING: newsLock is true (another call in progress)");
    console.log("═══════════════════════════════════════════");
    return;
  }
  newsLock = true;
  console.log("   🔒 newsLock acquired");

  try {
    const today = new Date();
    const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    console.log("   📅 Day key:", dayKey);

    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    console.log("   🕐 Range:", todayStart.toISOString(), "→", todayEnd.toISOString());

    // Count today's AI posts
    const todayCount = await Post.countDocuments({
      authorType: "ai",
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });
    console.log("   📊 AI posts created today:", todayCount);

    if (todayCount > 0) {
      console.log("   ✅ SKIPPING: news already exists for today");
      console.log("═══════════════════════════════════════════");
      return;
    }

    console.log("   ⚙️  Generating AI news...");

    const aiUserId = await ensureAIUser();
    console.log("   👤 AI user ID:", aiUserId);

    const now = new Date();
    const currentDate = now.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
    const currentYear = now.getFullYear();
    const systemPrompt = `You are Omnixra AI, an employment intelligence assistant. Today's date is ${currentDate}.

Generate a comprehensive daily career news update for Zimbabwe and Africa with these sections:
- Industry Trends
- Skills in Demand
- Career Tip
- Industry News
- Employment Advice

IMPORTANT: Always write as if it's ${currentYear}. Do NOT mention old dates. Use the current year ${currentYear}. Use markdown headings.`;

console.log(`📅 News prompt uses date: ${currentDate}`);
    const aiResponse = await askAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: "Create the daily news update." }
    ]);
    console.log("   🤖 AI response length:", aiResponse?.length || 0);

    if (!aiResponse || typeof aiResponse !== "string" || aiResponse.trim().length < 50) {
      console.log("   ❌ SKIPPING: AI response too short");
      console.log("═══════════════════════════════════════════");
      return;
    }

    // Re-check just before insert
    const recheck = await Post.countDocuments({
      authorType: "ai",
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });
    console.log("   🔍 Recheck before insert:", recheck, "posts");

    if (recheck > 0) {
      console.log("   ❌ SKIPPING: another instance created news");
      console.log("═══════════════════════════════════════════");
      return;
    }

    const created = await Post.create({
      author: aiUserId,
      authorType: "ai",
      text: aiResponse,
      visibility: "public"
    });
    console.log("   ✅✅✅ NEWS CREATED:", created._id);
    console.log("═══════════════════════════════════════════");
  } catch (error) {
    console.error("   ❌ ERROR:", error.message);
    console.log("═══════════════════════════════════════════");
  } finally {
    newsLock = false;
    console.log("   🔓 newsLock released");
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
    // Serve the React app for any non-API route that doesn't match a static file.
    // /share routes still need to serve OG pages, so we skip those.
    if (!req.path.startsWith("/api") && !req.path.startsWith("/share/")) {
      // Serve React app for all client-side routes including /shared-ai, /post, /job
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
    // Daily AI news — disable on secondary instances
    console.log("📅 [SCHEDULER] DISABLE_AUTO_NEWS =", process.env.DISABLE_AUTO_NEWS);
    if (process.env.DISABLE_AUTO_NEWS !== "true") {
      console.log("📅 [SCHEDULER] Calling generateDailyNewsIfNeeded() on startup...");
      generateDailyNewsIfNeeded();
      console.log("📅 [SCHEDULER] Setting up 24h interval for news");
      setInterval(() => {
        console.log("📅 [SCHEDULER] 24h interval fired");
        generateDailyNewsIfNeeded();
      }, 24 * 60 * 60 * 1000);
    } else {
      console.log("ℹ️  Auto news generation disabled (DISABLE_AUTO_NEWS=true)");
    }

    // 🕐 Job scraper runs 3 times per day: 8am, 12pm, 4pm
    console.log("📅 Scheduling scraper: 3x daily (8am, 12pm, 4pm)");
    runScraper().catch(err => console.error("Scraper error:", err.message));
    setInterval(() => {
      const hour = new Date().getHours();
      if (hour === 8 || hour === 12 || hour === 16) {
        console.log(`⏰ Scheduled scrape at ${hour}:00`);
        runScraper().catch(err => console.error("Scraper error:", err.message));
      }
    }, 60 * 60 * 1000);

    // 🔍 Enrich job details every 6 hours
    console.log("📅 Scheduling job enrichment: every 6 hours");
    setTimeout(() => {
      enrichJobs({ onlyMissing: true, limit_count: 30 }).catch(err => console.error("Enrich error:", err.message));
    }, 10000);
    setInterval(() => {
      console.log("⏰ Scheduled enrichment");
      enrichJobs({ onlyMissing: true, limit_count: 30 }).catch(err => console.error("Enrich error:", err.message));
    }, 6 * 60 * 60 * 1000); // check every hour

    // ✨ AI job generation runs daily at 6am
    console.log("📅 Scheduling AI job generation: daily at 6am");
    setTimeout(() => {
      generateDailyAIJobs().catch(err => console.error("AI jobs error:", err.message));
    }, 5000); // Run once 5s after startup

    setInterval(() => {
      const hour = new Date().getHours();
      if (hour === 6) {
        console.log(`⏰ Daily AI job generation at ${hour}:00`);
        generateDailyAIJobs().catch(err => console.error("AI jobs error:", err.message));
      }
    }, 60 * 60 * 1000);
  });
});
