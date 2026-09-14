// ── Client-side video trimming via FFmpeg.wasm ──
// Runs entirely on the user's device. No server upload for trim.
// Uses stream copy (-c copy) → instant, lossless, no re-encode.
//
// FFmpeg.wasm is lazy-loaded from unpkg CDN (~25MB, cached after first use).

let ffmpegInstance = null;
let ffmpegLoadPromise = null;

async function getFFmpeg() {
  if (ffmpegInstance && ffmpegInstance.loaded) return ffmpegInstance;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");

    const ffmpeg = new FFmpeg();

    ffmpeg.on("log", ({ message }) => {
      // Uncomment for debugging:
      // console.log("[ffmpeg]", message);
    });

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    console.log("📦 [FFMPEG] Loading core from CDN...");
    await ffmpeg.load({
      coreURL: await toBlobURL(baseURL + "/ffmpeg-core.js", "text/javascript"),
      wasmURL: await toBlobURL(baseURL + "/ffmpeg-core.wasm", "application/wasm"),
    });
    console.log("✅ [FFMPEG] Core loaded");

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return ffmpegLoadPromise;
}

/**
 * Trim a video file on-device.
 * @param {File|Blob} file - original video file
 * @param {number} startSec - start time in seconds
 * @param {number} endSec - end time in seconds
 * @param {(pct:number)=>void} onProgress - 0-100
 * @returns {Promise<Blob>} - trimmed video as Blob
 */
export async function trimVideoClient(file, startSec, endSec, onProgress) {
  if (!file) throw new Error("No file provided");
  if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || endSec <= startSec) {
    throw new Error("Invalid trim range");
  }

  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import("@ffmpeg/util");

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      const pct = Math.min(99, Math.max(1, Math.round(progress * 100)));
      onProgress(pct);
    });
  }

  const ext = (file.name || "input.mp4").split(".").pop() || "mp4";
  const inputName = "input." + ext;
  const outputName = "output.mp4";

  console.log("🎬 [TRIM] Writing input file...", file.size, "bytes");
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  console.log("🎬 [TRIM] Running ffmpeg (stream copy)...");
  await ffmpeg.exec([
    "-ss", String(startSec),
    "-to", String(endSec),
    "-i", inputName,
    "-c", "copy",
    "-movflags", "+faststart",
    outputName,
  ]);

  console.log("🎬 [TRIM] Reading output...");
  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data.buffer], { type: "video/mp4" });

  // Cleanup
  try { await ffmpeg.deleteFile(inputName); } catch (e) {}
  try { await ffmpeg.deleteFile(outputName); } catch (e) {}

  if (onProgress) onProgress(100);
  console.log("✅ [TRIM] Done. Output size:", blob.size, "bytes");
  return blob;
}

export default { trimVideoClient };