import mongoose from "mongoose";
import dotenv from "dotenv";
import Post from "./models/Post.js";
import Chat from "./models/Chat.js";

dotenv.config({ path: "../.env" });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const postsResult = await Post.deleteMany({
    authorType: "ai",
    text: { $regex: "I'm having trouble connecting", $options: "i" }
  });
  console.log("✅ Deleted", postsResult.deletedCount, "broken AI posts");

  const chatsResult = await Chat.deleteMany({
    response: { $regex: "I'm having trouble connecting", $options: "i" }
  });
  console.log("✅ Deleted", chatsResult.deletedCount, "broken AI chats");

  await mongoose.disconnect();
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
