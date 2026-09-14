// Client-side video poster generator
// Extracts a JPEG thumbnail from a video file BEFORE upload.
// Runs entirely in the browser — no backend changes needed.
//
// Usage:
//   import { generateVideoPoster } from "../utils/videoPoster";
//   const posterDataUrl = await generateVideoPoster(videoFile);
//   // posterDataUrl is "data:image/jpeg;base64,..." (~50-150KB)
//   // send it as `thumbnailUrl` in the post payload

export async function generateVideoPoster(file, options = {}) {
  const {
    maxWidth = 800,
    quality = 0.72,
    seekTime = 1,
    timeoutMs = 10000,
  } = options;

  return new Promise((resolve) => {
    if (!file) return resolve(null);

    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.src = url;

    let resolved = false;

    const cleanup = () => {
      try { URL.revokeObjectURL(url); } catch {}
    };

    const done = (result) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(result);
    };

    video.onerror = () => done(null);

    video.onloadedmetadata = () => {
      const dur = video.duration || 2;
      const t = Math.min(seekTime, Math.max(0.1, dur * 0.1));
      try {
        video.currentTime = t;
      } catch {
        done(null);
      }
    };

    video.onseeked = () => {
      try {
        const vw = video.videoWidth || 720;
        const vh = video.videoHeight || 1280;
        const scale = Math.min(1, maxWidth / vw);
        const w = Math.round(vw * scale);
        const h = Math.round(vh * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, w, h);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        done(dataUrl);
      } catch (e) {
        done(null);
      }
    };

    setTimeout(() => done(null), timeoutMs);
  });
}

export default generateVideoPoster;
