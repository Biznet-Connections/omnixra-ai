import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Post from "./models/Post.js";
import Conversation from "./models/Conversation.js";
import Application from "./models/Application.js";
import Chat from "./models/Chat.js";

dotenv.config({ path: "../.env" });

const CONFIRM = process.argv.includes("--confirm");

const KEEP_NAMES = ["Joel Mutauri", "Leeroy Nemadziva", "Praise Chikwekwete", "Chikwekwete  Praise"];
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
  console.log(CONFIRM ? "         🗑️  EXECUTING DELETION" : "         🔍 DRY RUN");
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
  const deleteUserIds = deleteUsers.map(u => u._id);

  console.log(`👥 Users:`);
  console.log(`  ✅ KEEP: ${keepUsers.length}`);
  keepUsers.forEach(u => console.log(`     • ${u.name} <${u.email}>`));
  console.log(`  ❌ DELETE: ${deleteUsers.length}`);

  // ---- POSTS (ALL) ----
  const postCount = await Post.countDocuments({});
  console.log(`\n📝 Posts to delete: ${postCount}`);

  // ---- CONVERSATIONS ----
  const convCount = await Conversation.countDocuments({});
  console.log(`💬 Conversations to delete: ${convCount}`);

  // ---- APPLICATIONS ----
  const appCount = await Application.countDocuments({});
  console.log(`📋 Applications to delete: ${appCount}`);

  // ---- CHATS (AI chat history) ----
  const chatCount = await Chat.countDocuments({});
  console.log(`🤖 AI Chats to delete: ${chatCount}`);

  if (!CONFIRM) {
    console.log("\n⚠️  DRY RUN — nothing was deleted.");
    console.log("   Run with --confirm to actually delete.");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log("\n🗑️  Deleting...");

  // Delete posts
  const postsResult = await Post.deleteMany({});
  console.log(`  ✅ Deleted ${postsResult.deletedCount} posts`);

  // Delete conversations
  const convResult = await Conversation.deleteMany({});
  console.log(`  ✅ Deleted ${convResult.deletedCount} conversations`);

  // Delete applications
  const appResult = await Application.deleteMany({});
  console.log(`  ✅ Deleted ${appResult.deletedCount} applications`);

  // Delete AI chats
  const chatResult = await Chat.deleteMany({});
  console.log(`  ✅ Deleted ${chatResult.deletedCount} AI chats`);

  // Delete users
  const userResult = await User.deleteMany({ _id: { $in: deleteUserIds } });
  console.log(`  ✅ Deleted ${userResult.deletedCount} users`);

  // Clean up references in kept users
  await User.updateMany({}, {
    $set: {
      connections: [],
      followers: [],
      followingUsers: [],
      following: [],
      savedPosts: [],
      profileViews: [],
      companyViews: [],
      blockedUsers: []
    }
  });
  console.log(`  ✅ Cleared connections/follows/views for kept users`);

  // Final count
  const finalUsers = await User.countDocuments({});
  const finalPosts = await Post.countDocuments({});
  const finalConvs = await Conversation.countDocuments({});

  console.log("\n═══════════════════════════════════════════");
  console.log("✅ CLEANUP COMPLETE");
  console.log("═══════════════════════════════════════════");
  console.log(`  Users remaining:         ${finalUsers}`);
  console.log(`  Posts remaining:         ${finalPosts}`);
  console.log(`  Conversations remaining: ${finalConvs}`);
  console.log(`  Companies:               ✅ Kept (untouched)`);
  console.log(`  Jobs:                    ✅ Kept (untouched)`);
  console.log(`  Scraped Jobs:            ✅ Kept (untouched)`);
  console.log(`  Vouchers:                ✅ Kept (untouched)`);
  console.log("═══════════════════════════════════════════\n");

  await mongoose.disconnect();
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
