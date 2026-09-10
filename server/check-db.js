import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Post from "./models/Post.js";

dotenv.config({ path: "../.env" });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log("=== USERS ===");
  const users = await User.find({}).select("name email profilePicture accountType").lean();
  users.forEach(u => {
    console.log(`User: ${u.name} | email: ${u.email} | profilePic: ${u.profilePicture ? "YES (" + u.profilePicture.length + " chars)" : "NO"}`);
  });

  console.log("\n=== AI NEWS POSTS ===");
  const aiPosts = await Post.find({ authorType: "ai", deleted: false }).select("author text createdAt").lean();
  console.log("AI posts count:", aiPosts.length);
  aiPosts.forEach(p => {
    console.log(`AI post author: ${p.author}, createdAt: ${p.createdAt}, text preview: ${p.text?.substring(0, 80)}`);
  });

  console.log("\n=== YOUR POSTS ===");
  const userPosts = await Post.find({ authorType: { $ne: "ai" }, deleted: false }).select("author authorType text createdAt").lean();
  console.log("User posts count:", userPosts.length);
  userPosts.forEach(p => {
    console.log(`Author ID: ${p.author}, authorType: ${p.authorType}, text preview: ${p.text?.substring(0, 80)}`);
  });

  await mongoose.disconnect();
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
