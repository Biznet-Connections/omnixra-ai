import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String },
    actorPicture: { type: String },
    type: {
      type: String,
      required: true,
      enum: ["mention", "comment", "reply", "like", "follow", "message", "application", "job_match", "system"],
      index: true,
    },
    // Context references
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    comment: { type: mongoose.Schema.Types.ObjectId },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    // Display
    title: { type: String },
    text: { type: String },
    preview: { type: String, maxlength: 200 },
    // Deep link
    deepLink: { type: String },
    // State
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    // Push state
    pushSent: { type: Boolean, default: false },
    pushError: { type: String },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // auto-expire after 90 days

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
