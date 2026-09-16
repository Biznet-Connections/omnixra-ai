import mongoose from "mongoose";

const channelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "", maxlength: 500 },
    category: { type: String, default: "General", trim: true },
    avatar: { type: String, default: null },
    cover: { type: String, default: null },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    followerCount: { type: Number, default: 0 },
    postCount: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    visibility: { type: String, enum: ["public", "private"], default: "public" },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

channelSchema.index({ deleted: 1, createdAt: -1 });
channelSchema.index({ name: "text", description: "text" });

// Helper: is user an admin of this channel?
channelSchema.methods.isAdmin = function (userId) {
  const id = String(userId || "");
  return (
    String(this.creator) === id ||
    (this.admins || []).some((a) => String(a) === id)
  );
};

const Channel = mongoose.model("Channel", channelSchema);
export default Channel;
