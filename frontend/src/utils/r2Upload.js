 // ── Direct-to-R2 upload via presigned URL ──
// Replaces slow base64 round-trips. Browser uploads straight to R2.
//
// Usage:
//   import { uploadToR2 } from "../utils/r2Upload";
//   const { key, publicUrl } = await uploadToR2(file, "video/mp4", (pct) => setProgress(pct));

import api from "../api/axios";

/**
 * Upload a File/Blob directly to R2 using a presigned URL.
 * @param {File|Blob} file - the file to upload
 * @param {string} contentType - MIME type (e.g. "video/mp4")
 * @param {(pct:number)=>void} onProgress - 0-100 progress callback
 * @param {string} folder - "videos" (default) or "images"
 * @returns {Promise<{key:string, publicUrl:string}>}
 */
export async function uploadToR2(file, contentType, onProgress, folder = "videos") {
  if (!file) throw new Error("No file provided");
  if (!contentType) throw new Error("contentType required");

  // 1. Ask backend for a presigned URL
  const presignRes = await api.post("/video/presign", {
    filename: file.name || (folder === "videos" ? "video.mp4" : "image.jpg"),
    contentType,
    folder,
  });
  const { uploadUrl, key, publicUrl } = presignRes.data;
  if (!uploadUrl) throw new Error("Failed to get upload URL");

  // 2. Upload directly to R2 with XHR (for progress events)
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress && onProgress(100);
        resolve();
      } else {
        reject(new Error("R2 upload failed: " + xhr.status + " " + xhr.statusText));
      }
    };

    xhr.onerror = () => reject(new Error("R2 upload network error"));
    xhr.ontimeout = () => reject(new Error("R2 upload timed out"));
    xhr.timeout = 15 * 60 * 1000; // 15 min

    xhr.send(file);
  });

  // 3. Confirm with backend (optional — keeps logs clean)
  try {
    await api.post("/video/confirm", { key });
  } catch (e) {
    console.warn("Confirm ping failed (non-blocking):", e.message);
  }

  console.log("✅ [R2 UPLOAD] Done:", publicUrl);
  return { key, publicUrl };
}

/**
 * Convert a base64 data URL to a Blob.
 */
export async function dataUrlToBlob(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith("data:")) {
    throw new Error("Not a data URL");
  }
  const res = await fetch(dataUrl);
  return await res.blob();
}

/**
 * Detect MIME from a data URL.
 */
export function mimeFromDataUrl(dataUrl) {
  const match = dataUrl && dataUrl.match(/^data:([^;]+);/);
  return match ? match[1] : "application/octet-stream";
}

export default { uploadToR2, dataUrlToBlob, mimeFromDataUrl };