// One-shot script: mark all existing users as emailVerified
// Run from server folder: node verify-old-users.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function run() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log("✅ Connected\n");

  const col = mongoose.connection.db.collection("users");

  const total = await col.countDocuments();
  const unverified = await col.countDocuments({ emailVerified: { $ne: true } });
  console.log(`📊 Total users: ${total}`);
  console.log(`📊 Unverified: ${unverified}\n`);

  if (unverified === 0) {
    console.log("✅ All users already verified. Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  const result = await col.updateMany(
    { emailVerified: { $ne: true } },
    {
      $set: {
        emailVerified: true,
        signupMethod: "email",
      },
      $unset: {
        verificationCodeHash: "",
        verificationCodeExpires: "",
        resetCodeHash: "",
        resetCodeExpires: "",
      },
    }
  );

  console.log(`✅ Verified ${result.modifiedCount} users\n`);

  await mongoose.disconnect();
  console.log("🎉 Done");
}

run().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
