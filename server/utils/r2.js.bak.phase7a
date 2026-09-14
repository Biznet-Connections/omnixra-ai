import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, CopyObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

console.log("🔥 R2 utility loaded");
console.log("   R2_ACCOUNT_ID:", process.env.R2_ACCOUNT_ID ? "✅ set" : "❌ missing");
console.log("   R2_ACCESS_KEY_ID:", process.env.R2_ACCESS_KEY_ID ? "✅ set" : "❌ missing");
console.log("   R2_SECRET_ACCESS_KEY:", process.env.R2_SECRET_ACCESS_KEY ? "✅ set" : "❌ missing");
console.log("   R2_BUCKET_NAME:", process.env.R2_BUCKET_NAME || "❌ missing");
console.log("   R2_PUBLIC_URL:", process.env.R2_PUBLIC_URL || "❌ missing");

// Cache images at the edge + browser for 1 year. Immutable because URLs
// contain a random hash (crypto.randomBytes) — content never changes for a key.
const CACHE_HEADERS = "public, max-age=31536000, immutable";

let _r2 = null;
function getR2Client() {
  if (_r2) return _r2;
  _r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  });
  return _r2;
}

export async function uploadToR2(buffer, mimetype, folder = "posts") {
  const ext = mimetype.split("/")[1]?.split("+")[0] || "jpg";
  const key = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;

  const r2 = getR2Client();
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
    CacheControl: CACHE_HEADERS,
    ContentDisposition: "inline"
  }));

  const url = `${process.env.R2_PUBLIC_URL}/${key}`;
  console.log(`✅ Uploaded to R2 (cached 1y): ${url}`);
  return url;
}

export async function deleteFromR2(url) {
  try {
    const key = url.replace(`${process.env.R2_PUBLIC_URL}/`, "");
    const r2 = getR2Client();
    await r2.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key
    }));
    console.log(`🗑️  Deleted from R2: ${key}`);
  } catch (err) {
    console.error("R2 delete error:", err.message);
  }
}

// Re-tag every object in the bucket with the new Cache-Control headers.
// R2 does not support partial updates — we use CopyObject with MetadataDirective=REPLACE.
export async function retagExistingObjects() {
  const r2 = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  let continuationToken = undefined;
  let total = 0, ok = 0, failed = 0;

  do {
    const list = await r2.send(new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
      MaxKeys: 1000
    }));

    for (const obj of (list.Contents || [])) {
      total++;
      try {
        await r2.send(new CopyObjectCommand({
          Bucket: bucket,
          Key: obj.Key,
          CopySource: `${bucket}/${encodeURIComponent(obj.Key)}`,
          MetadataDirective: "REPLACE",
          ContentType: obj.Key.endsWith(".png") ? "image/png"
                       : obj.Key.endsWith(".webp") ? "image/webp"
                       : obj.Key.endsWith(".mp4") ? "video/mp4"
                       : "image/jpeg",
          CacheControl: CACHE_HEADERS,
          ContentDisposition: "inline"
        }));
        ok++;
      } catch (err) {
        failed++;
        console.error(`  ❌ ${obj.Key}: ${err.message}`);
      }
    }
    continuationToken = list.NextContinuationToken;
  } while (continuationToken);

  return { total, ok, failed };
}

export function isBase64Image(str) {
  return typeof str === "string" && str.startsWith("data:image");
}

export function parseBase64Image(base64Str) {
  const matches = base64Str.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return null;
  return {
    mimetype: matches[1],
    buffer: Buffer.from(matches[2], "base64")
  };
}

export default { uploadToR2, deleteFromR2, retagExistingObjects };
