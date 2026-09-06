import mongoose from "mongoose";

try {
  await mongoose.connect("mongodb+srv://omnixraai_db_user:we5YSuJBhSKopNQq@cluster0.ngtjkwj.mongodb.net/omnixra_ai?retryWrites=true&w=majority&appName=Cluster0");
  console.log("Connected");

  const db = mongoose.connection.db;

  const allPosts = await db.collection("posts").countDocuments();
  console.log("All posts in DB:", allPosts);

  const activePosts = await db.collection("posts").countDocuments({ deleted: false });
  console.log("Active posts (deleted: false):", activePosts);

  const deletedPosts = await db.collection("posts").countDocuments({ deleted: true });
  console.log("Deleted posts:", deletedPosts);

  try {
    await db.collection("posts").dropIndex("expiresAt_1");
    console.log("Dropped TTL index");
  } catch (e) {
    console.log("No TTL index found");
  }

  const result = await db.collection("posts").updateMany({}, { $set: { deleted: false } });
  console.log("Reset posts:", result.modifiedCount);

  const samples = await db.collection("posts").find().limit(3).toArray();
  console.log("Sample:", samples.map(p => ({ text: p.text?.substring(0, 20), deleted: p.deleted })));

  await mongoose.disconnect();
  console.log("Done!");
  process.exit(0);
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
