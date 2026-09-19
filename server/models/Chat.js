import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, default: "" },
  attachments: [{
    url: { type: String },
    type: { type: String },
    name: { type: String },
    size: { type: Number },
  }],
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const chatSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    title: { type: String, default: "New chat" },
    messages: [messageSchema],
    message: { type: String },
    response: { type: String },
    shared: { type: Boolean, default: false },
    shareCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

chatSchema.index({ user: 1, updatedAt: -1 });

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
