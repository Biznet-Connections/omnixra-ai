import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) { console.error("❌ MONGO_URI missing"); process.exit(1); }

async function run() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected\n");

  const db = mongoose.connection.db;

  const jobs = [
    {
      name: "posts_feed_cursor",
      collection: "posts",
      keys: { deleted: 1, createdAt: -1, _id: -1 },
      opts: { background: true }
    },
    {
      name: "posts_author_feed",
      collection: "posts",
      keys: { author: 1, deleted: 1, createdAt: -1, _id: -1 },
      opts: { background: true }
    },
    {
      name: "posts_authorType_createdAt",
      collection: "posts",
      keys: { authorType: 1, deleted: 1, createdAt: -1 },
      opts: { background: true }
    },
    {
      name: "jobs_active_createdAt",
      collection: "jobs",
      keys: { active: 1, createdAt: -1, _id: -1 },
      opts: { background: true }
    },
    {
      name: "jobs_category_active",
      collection: "jobs",
      keys: { category: 1, active: 1, createdAt: -1 },
      opts: { background: true }
    },
    {
      name: "jobs_location_active",
      collection: "jobs",
      keys: { location: 1, active: 1, createdAt: -1 },
      opts: { background: true }
    },
    {
      name: "users_accountType",
      collection: "users",
      keys: { accountType: 1 },
      opts: { background: true }
    },
    {
      name: "users_discoverable_category",
      collection: "users",
      keys: { discoverable: 1, category: 1, createdAt: -1 },
      opts: { background: true }
    },
    {
      name: "users_openToWork",
      collection: "users",
      keys: { openToWork: 1, accountType: 1 },
      opts: { background: true }
    },
    {
      name: "applications_user_created",
      collection: "applications",
      keys: { userId: 1, createdAt: -1 },
      opts: { background: true }
    },
    {
      name: "applications_job",
      collection: "applications",
      keys: { jobId: 1, matchPercentage: -1 },
      opts: { background: true }
    },
    {
      name: "applications_user_job_unique",
      collection: "applications",
      keys: { userId: 1, jobId: 1 },
      opts: { unique: true, background: true }
    },
    {
      name: "conversations_participants",
      collection: "conversations",
      keys: { participants: 1, updatedAt: -1 },
      opts: { background: true }
    },
    {
      name: "connection_requests_from_to",
      collection: "connectionrequests",
      keys: { from: 1, to: 1, status: 1 },
      opts: { background: true }
    },
    {
      name: "connection_requests_to_status",
      collection: "connectionrequests",
      keys: { to: 1, status: 1, createdAt: -1 },
      opts: { background: true }
    },
    {
      name: "chats_user_created",
      collection: "chats",
      keys: { userId: 1, createdAt: -1 },
      opts: { background: true }
    }
  ];

  console.log(`📦 Creating ${jobs.length} indexes...\n`);
  let ok = 0, skipped = 0, failed = 0;

  for (const job of jobs) {
    try {
      await db.collection(job.collection).createIndex(job.keys, { name: job.name, ...job.opts });
      console.log(`  ✅ ${job.collection}.${job.name}`);
      ok++;
    } catch (err) {
      if (err.code === 85 || err.code === 86) {
        console.log(`  ⚠️  ${job.collection}.${job.name} — already exists, updating...`);
        try {
          await db.collection(job.collection).dropIndex(job.name);
          await db.collection(job.collection).createIndex(job.keys, { name: job.name, ...job.opts });
          console.log(`  ✅ ${job.collection}.${job.name} (recreated)`);
          ok++;
        } catch (e2) {
          console.log(`  ⚠️  ${job.collection}.${job.name} — ${e2.message}`);
          skipped++;
        }
      } else {
        console.log(`  ❌ ${job.collection}.${job.name} — ${err.message}`);
        failed++;
      }
    }
  }

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`✅ Created: ${ok}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`❌ Failed:  ${failed}`);
  console.log(`═══════════════════════════════════════════\n`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(e => { console.error("FATAL:", e); process.exit(1); });
