import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

console.log("🔥 R2 utility loaded");
console.log("   R2_ACCOUNT_ID:", process.env.R2_ACCOUNT_ID ? "✅ set" : "❌ missing");
console.log("   R2_ACCESS_KEY_ID:", process.env.R2_ACCESS_KEY_ID ? "✅ set" : "❌ missing");
console.log("   R2_SECRET_ACCESS_KEY:", process.env.R2_SECRET_ACCESS_KEY ? "✅ set" : "❌ missing");
console.log("   R2_BUCKET_NAME:", process.env.R2_BUCKET_NAME || "❌ missing");
console.log("   R2_PUBLIC_URL:", process.env.R2_PUBLIC_URL || "❌ missing");

// Create client lazily (after env is loaded)
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
    ContentType: mimetype
  }));

  const url = `${process.env.R2_PUBLIC_URL}/${key}`;
  console.log(`✅ Uploaded to R2: ${url}`);
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

export default { uploadToR2, deleteFromR2 };
