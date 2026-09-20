import mongoose from "mongoose";
import Chat from "./models/Chat.js";

await mongoose.connect(process.env.MONGODB_URI);

const chats = await Chat.find({}).sort({ updatedAt: -1 }).limit(10).lean();
console.log("Total chats:", chats.length);
console.log("");

chats.forEach(c => {
  console.log("---");
  console.log("ID:", c._id.toString());
  console.log("Title:", c.title);
  console.log("Has messages[]:", Array.isArray(c.messages), "| Length:", (c.messages || []).length);
  console.log("Has legacy message:", !!c.message);
  console.log("Has legacy response:", !!c.response);
});

process.exit(0);
