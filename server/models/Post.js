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
    image: { type: String },
    video: { type: String },
    thumbnailUrl: { type: String },
    mediaType: { type: String, enum: ["text", "image", "video"], default: "text" },
    visibility: { type: String, enum: ["public", "connections", "onlyme"], default: "public" },
    likes: { type: Number, default: 0 },
    comments: [commentSchema],
    shares: { type: Number, default: 0 },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Indexes for fast feed queries
postSchema.index({ deleted: 1, createdAt: -1 });
postSchema.index({ author: 1, deleted: 1, createdAt: -1 });

const Post = mongoose.model("Post", postSchema);
export default Post;
