import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "ai"], required: true },
  text: { type: String, required: true },
  jobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
  talent: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  timestamp: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "New Chat" },
    messages: [messageSchema],
    saved: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
