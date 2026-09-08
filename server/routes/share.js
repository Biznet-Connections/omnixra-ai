import express from "express";
import Post from "../models/Post.js";
import Job from "../models/Job.js";
import Chat from "../models/Chat.js";

const router = express.Router();

// Share post OG page
router.get("/posts/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("author", "name");
    if (!post) return res.status(404).send("Post not found");
    
    const title = post.author?.name || "Omnixra AI";
    const description = post.text?.substring(0, 150) || "Check this post on Omnixra";
    
    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>${title} on Omnixra</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="https://omnixra-ai.com/favicon.svg" />
  <meta property="og:url" content="https://omnixra-ai.com/share/posts/${post._id}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
</head>
<body>
  <script>window.location.href="/post/${post._id}";</script>
</body>
</html>`);
  } catch (e) {
    res.status(500).send("Error");
  }
});

// Share job OG page
router.get("/jobs/:slug", async (req, res) => {
  try {
    const job = await Job.findOne({ slug: req.params.slug });
    if (!job) return res.status(404).send("Job not found");
    
    const title = `${job.title} at ${job.company}`;
    const description = `${job.location}${job.salary ? " · " + job.salary : ""} · Apply now on Omnixra`;
    
    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="https://omnixra-ai.com/favicon.svg" />
  <meta property="og:url" content="https://omnixra-ai.com/share/jobs/${job.slug}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
</head>
<body>
  <script>window.location.href="/job/${job.slug}";</script>
</body>
</html>`);
  } catch (e) {
    res.status(500).send("Error");
  }
});

// Share AI response OG page
router.get("/ai/:chatId", async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).send("Chat not found");
    
    const description = chat.response?.substring(0, 150) || "Check this AI response";
    
    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Omnixra AI Response</title>
  <meta property="og:title" content="Omnixra AI Response" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="https://omnixra-ai.com/favicon.svg" />
  <meta property="og:url" content="https://omnixra-ai.com/share/ai/${chat._id}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
</head>
<body>
  <script>window.location.href="/shared-ai/${chat._id}";</script>
</body>
</html>`);
  } catch (e) {
    res.status(500).send("Error");
  }
});

export default router;
