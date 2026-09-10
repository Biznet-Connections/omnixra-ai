import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Post from "./models/Post.js";
import Conversation from "./models/Conversation.js";
import Application from "./models/Application.js";

dotenv.config({ path: "../.env" });

const KEEP_NAMES = ["Joel Mutauri", "Leeroy Nemadziva", "Praise Chikwekwete"];
const KEEP_EMAILS = [
  "mutaurijoe@gmail.com",
  "leeroynemadziva00@gmail.com",
  "leeroynemadziva@gmail.com",
  "praisenokutendachikwekwete@gmail.com",
  "ai@omnixra.ai",
  "admin@omnixra.ai"
];

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log("═══════════════════════════════════════════");
  console.log("         🔍 DRY RUN — NO DELETIONS");
  console.log("═══════════════════════════════════════════\n");

  // ---- USERS ----
  const allUsers = await User.find({}).select("_id name email").lean();
  const keepUsers = allUsers.filter(u =>
    KEEP_EMAILS.includes(u.email?.toLowerCase()) ||
    KEEP_NAMES.some(n => u.name?.toLowerCase().includes(n.toLowerCase())) ||
    u.email === "ai@omnixra.ai" ||
    u.email === "admin@omnixra.ai"
  );
  const deleteUsers = allUsers.filter(u => !keepUsers.some(k => k._id.toString() === u._id.toString()));

  console.log("👥 USERS:");
  console.log(`  ✅ Will KEEP (${keepUsers.length}):`);
  keepUsers.forEach(u => console.log(`     • ${u.name} <${u.email}>`));
  console.log(`  ❌ Will DELETE (${deleteUsers.length}):`);
  deleteUsers.slice(0, 10).forEach(u => console.log(`     • ${u.name} <${u.email}>`));
  if (deleteUsers.length > 10) console.log(`     ... and ${deleteUsers.length - 10} more`);

  // ---- POSTS ----
  const keepUserIds = keepUsers.map(u => u._id.toString());
  const allPosts = await Post.find({}).select("_id author authorType").lean();
  const deletePosts = allPosts.filter(p => {
    // Delete ALL posts (all users, including AI news)
    return true;
  });

  console.log(`\n📝 POSTS:`);
  console.log(`  Total in DB: ${allPosts.length}`);
  console.log(`  ❌ Will DELETE ALL ${allPosts.length} posts`);

  // ---- CONVERSATIONS ----
  const allConvs = await Conversation.find({}).select("_id").lean();
  console.log(`\n💬 CONVERSATIONS:`);
  console.log(`  Total in DB: ${allConvs.length}`);
  console.log(`  ❌ Will DELETE ALL ${allConvs.length} conversations`);

  // ---- APPLICATIONS ----
  const allApps = await Application.find({}).select("_id").lean();
  console.log(`\n📋 APPLICATIONS:`);
  console.log(`  Total in DB: ${allApps.length}`);
  console.log(`  ❌ Will DELETE ALL ${allApps.length} applications`);

  console.log("\n═══════════════════════════════════════════");
  console.log("SUMMARY:");
  console.log(`  Users kept:      ${keepUsers.length}`);
  console.log(`  Users deleted:   ${deleteUsers.length}`);
  console.log(`  Posts deleted:   ${allPosts.length}`);
  console.log(`  Convos deleted:  ${allConvs.length}`);
  console.log(`  Apps deleted:    ${allApps.length}`);
  console.log("\n  Companies:       ✅ KEPT");
  console.log("  Jobs:            ✅ KEPT");
  console.log("  ScrapedJobs:     ✅ KEPT");
  console.log("  Vouchers:        ✅ KEPT");
  console.log("═══════════════════════════════════════════");
  console.log("\n⚠️  This is a DRY RUN. Nothing was deleted.");
  console.log("   To actually delete, run the file with --confirm\n");

  await mongoose.disconnect();
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
