import mongoose from "mongoose";
import dotenv from "dotenv";
import Post from "./models/Post.js";

dotenv.config({ path: "../.env" });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const posts = await Post.find({}).limit(10).lean();
  posts.forEach(p => {
    console.log(`Post: ${p._id} | likes type: ${typeof p.likes} | value:`, typeof p.likes === "object" ? "ARRAY len " + p.likes.length : p.likes);
  });

  await mongoose.disconnect();
  process.exit(0);
});
