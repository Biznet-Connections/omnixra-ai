import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const postsCol = db.collection("posts");
  const all = await postsCol.find({}).toArray();
  let fixed = 0;

  for (const post of all) {
    let update = {};

    // Fix post.likes
    if (Array.isArray(post.likes)) {
      update.likes = post.likes.length;
    }

    // Fix comment.likes
    if (Array.isArray(post.comments)) {
      let commentsChanged = false;
      const newComments = post.comments.map(c => {
        if (Array.isArray(c.likes)) {
          commentsChanged = true;
          return { ...c, likes: c.likes.length };
        }
        return c;
      });
      if (commentsChanged) update.comments = newComments;
    }

    if (Object.keys(update).length > 0) {
      await postsCol.updateOne({ _id: post._id }, { $set: update });
      fixed++;
    }
  }

  console.log("✅ Force-fixed", fixed, "posts");

  // Verify
  const after = await postsCol.find({}).limit(10).toArray();
  after.forEach(p => {
    const type = Array.isArray(p.likes) ? "ARRAY" : typeof p.likes;
    console.log(`${p._id} → ${type}: ${JSON.stringify(p.likes)}`);
  });

  await mongoose.disconnect();
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
