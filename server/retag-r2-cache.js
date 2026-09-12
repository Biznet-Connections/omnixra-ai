// server/retag-r2-cache.js
// Run once to add Cache-Control: public, max-age=31536000, immutable
// to every object already in the R2 bucket.

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { retagExistingObjects } from "./utils/r2.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function run() {
  const confirm = process.argv.includes("--confirm");
  console.log("═══════════════════════════════════════════");
  console.log("🔄 R2 RE-TAG SCRIPT");
  console.log("═══════════════════════════════════════════");

  if (!confirm) {
    console.log("ℹ️  Dry run. Add --confirm to actually re-tag.");
    console.log("   This will CopyObject every file with new Cache-Control headers.");
    return;
  }

  const t0 = Date.now();
  const result = await retagExistingObjects();
  const sec = ((Date.now() - t0) / 1000).toFixed(1);

  console.log("═══════════════════════════════════════════");
  console.log(`📊 Total: ${result.total}`);
  console.log(`✅ Re-tagged: ${result.ok}`);
  console.log(`❌ Failed: ${result.failed}`);
  console.log(`⏱️  Time: ${sec}s`);
  console.log("═══════════════════════════════════════════");
}

run().catch(e => { console.error("FATAL:", e); process.exit(1); });
