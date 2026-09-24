import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: { type: String, required: true },
  likes: { type: Number, default: 0 },
  replies: [
    { user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, text: { type: String }, createdAt: { type: Date, default: Date.now } }
  ],
  createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorType: { type: String, enum: ["jobseeker", "company", "admin", "ai"], required: true, default: "jobseeker" },
    text: { type: String },
    image: { type: String },        // legacy — single image
    images: [{ type: String }],      // multi-image post (max 10)
    video: { type: String },
    thumbnailUrl: { type: String },
    trimStart: { type: Number, default: 0 },
    trimEnd: { type: Number, default: 0 },
    mediaType: { type: String, enum: ["text", "image", "video"], default: "text" },
    visibility: { type: String, enum: ["public", "connections", "onlyme"], default: "public" },
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", default: null },
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    likes: { type: Number, default: 0 },
    comments: [commentSchema],
    shares: { type: Number, default: 0 },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deleted: { type: Boolean, default: false },
    newsHash: { type: String, default: null },

    // Phase 3 — media fields
    attachmentUrl: { type: String, default: null },
    attachmentName: { type: String, default: null },
    attachmentSize: { type: Number, default: null },
    attachmentType: { type: String, default: null },
    location: {
      name: { type: String, default: null },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

postSchema.index({ deleted: 1, createdAt: -1 });
postSchema.index({ author: 1, deleted: 1, createdAt: -1 });

postSchema.index({ channelId: 1, deleted: 1, createdAt: -1 });
const Post = mongoose.model("Post", postSchema);
export default Post;
