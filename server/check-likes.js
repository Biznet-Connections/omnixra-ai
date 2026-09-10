import mongoose from "mongoose";
import dotenv from "dotenv";
import Post from "./models/Post.js";

dotenv.config({ path: "../.env" });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const raw = await Post.collection.find({}).limit(10).toArray();
  console.log("=== RAW DB DATA (bypassing Mongoose) ===");
  raw.forEach(p => {
    console.log(`Post ${p._id} | likes: ${JSON.stringify(p.likes)} | type: ${Array.isArray(p.likes) ? "ARRAY" : typeof p.likes}`);
  });
  await mongoose.disconnect();
  process.exit(0);
});
