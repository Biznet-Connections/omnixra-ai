import mongoose from "mongoose";
import Chat from "./models/Chat.js";
import User from "./models/User.js";

await mongoose.connect(process.env.MONGODB_URI);

const chat = await Chat.findById("6aaff6f6bb356a7a067320c4").lean();
console.log("Chat found:", !!chat);
if (chat) {
  console.log("Chat user field:", chat.user, "| type:", typeof chat.user);
  console.log("Chat messages count:", (chat.messages || []).length);
  console.log("");
  const u = await User.findById(chat.user).select("email name");
  console.log("Owner user:", u);
}
console.log("");
const putin = await User.findOne({ email: "putin@gmail.com" }).select("_id email");
console.log("Putin ID:", putin._id.toString(), "| type:", typeof putin._id);

process.exit(0);
