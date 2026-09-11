import mongoose from "mongoose";
import dotenv from "dotenv";
import sharp from "sharp";

dotenv.config({ path: "../.env" });

const CONFIRM = process.argv.includes("--confirm");

async function compressImage(buffer, mimetype) {
  try {
    // Only compress images
    if (!mimetype.startsWith("image/")) return { buffer, mimetype };

    // Skip if it's already small or SVG/GIF (keep animated)
    if (mimetype.includes("gif") || mimetype.includes("svg")) {
      return { buffer, mimetype };
    }

    // Compress with sharp: max 1200px wide, JPEG 85%
    const compressed = await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    // Only use compressed if it's actually smaller
    if (compressed.length < buffer.length) {
      return { buffer: compressed, mimetype: "image/jpeg" };
    }
    return { buffer, mimetype };
  } catch (err) {
    console.warn("  ⚠️  Compression failed, using original:", err.message);
    return { buffer, mimetype };
  }
}

async function migrate() {
  const { uploadToR2, isBase64Image, parseBase64Image } = await import("./utils/r2.js");
  const Post = (await import("./models/Post.js")).default;
  const User = (await import("./models/User.js")).default;

  console.log("═══════════════════════════════════════════");
  console.log(CONFIRM ? "🚀 MIGRATING TO R2" : "🔍 DRY RUN — NO CHANGES");
  console.log("═══════════════════════════════════════════\n");

  // ---- POSTS ----
  const posts = await Post.find({ image: /^data:image/ });
  console.log(`📝 Found ${posts.length} posts with base64 images\n`);

  let postSuccess = 0;
  let postFailed = 0;
  let originalBytes = 0;
  let newBytes = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const parsed = parseBase64Image(post.image);
    if (!parsed) {
      console.log(`  ❌ [${i+1}/${posts.length}] Invalid base64`);
      postFailed++;
      continue;
    }

    const originalSize = parsed.buffer.length;
    originalBytes += originalSize;

    // Compress
    const { buffer: compressed, mimetype } = await compressImage(parsed.buffer, parsed.mimetype);
    newBytes += compressed.length;

    const savedKB = Math.round((originalSize - compressed.length) / 1024);
    const savings = Math.round((1 - compressed.length / originalSize) * 100);

    if (!CONFIRM) {
      console.log(`  🔍 [${i+1}/${posts.length}] "${post.text?.substring(0, 30) || "(no text)"}"`);
      console.log(`     Original: ${Math.round(originalSize/1024)} KB → Compressed: ${Math.round(compressed.length/1024)} KB (saved ${savings}%)`);
      continue;
    }

    try {
      const url = await uploadToR2(compressed, mimetype, "posts");
      post.image = url;
      await post.save();
      postSuccess++;
      console.log(`  ✅ [${i+1}/${posts.length}] Uploaded (saved ${savings}%) → ${url.split("/").pop()}`);
    } catch (err) {
      console.error(`  ❌ [${i+1}/${posts.length}] Failed:`, err.message);
      postFailed++;
    }
  }

  // ---- USERS ----
  const users = await User.find({ profilePicture: /^data:image/ });
  console.log(`\n👤 Found ${users.length} users with base64 avatars\n`);

  let userSuccess = 0;
  let userFailed = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const parsed = parseBase64Image(user.profilePicture);
    if (!parsed) {
      userFailed++;
      continue;
    }

    const originalSize = parsed.buffer.length;
    const { buffer: compressed, mimetype } = await compressImage(parsed.buffer, parsed.mimetype);
    const savings = Math.round((1 - compressed.length / originalSize) * 100);

    if (!CONFIRM) {
      console.log(`  🔍 [${i+1}/${users.length}] "${user.name}"`);
      console.log(`     Original: ${Math.round(originalSize/1024)} KB → Compressed: ${Math.round(compressed.length/1024)} KB (saved ${savings}%)`);
      continue;
    }

    try {
      const url = await uploadToR2(compressed, mimetype, "avatars");
      user.profilePicture = url;
      await user.save();
      userSuccess++;
      console.log(`  ✅ [${i+1}/${users.length}] Uploaded (saved ${savings}%) → ${url.split("/").pop()}`);
    } catch (err) {
      console.error(`  ❌ [${i+1}/${users.length}] Failed:`, err.message);
      userFailed++;
    }
  }

  // ---- SUMMARY ----
  console.log("\n═══════════════════════════════════════════");
  if (CONFIRM) {
    console.log("✅ MIGRATION COMPLETE");
    console.log(`   Posts:   ${postSuccess} migrated, ${postFailed} failed`);
    console.log(`   Users:   ${userSuccess} migrated, ${userFailed} failed`);
    console.log(`   Space saved: ~${Math.round((originalBytes - newBytes) / 1024)} KB`);
  } else {
    console.log("🔍 DRY RUN COMPLETE — nothing changed");
    console.log(`   Would migrate ${posts.length} posts + ${users.length} avatars`);
    console.log(`   Would save ~${Math.round((originalBytes - newBytes) / 1024)} KB by compressing`);
    console.log("\n   Run with --confirm to execute:");
    console.log("   node migrate-to-r2.js --confirm");
  }
  console.log("═══════════════════════════════════════════");

  await mongoose.disconnect();
  process.exit(0);
}

mongoose.connect(process.env.MONGODB_URI).then(() => migrate())
  .catch(err => { console.error(err); process.exit(1); });
