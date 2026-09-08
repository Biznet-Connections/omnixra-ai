import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  deliveredAt: { type: Date },
  readAt: { type: Date },
  replyTo: {
    messageId: { type: mongoose.Schema.Types.ObjectId },
    text: { type: String },
    senderName: { type: String }
  },
  createdAt: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    messages: [messageSchema],
    lastMessage: { type: String },
    lastMessageAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
