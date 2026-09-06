import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 100 * 1024 * 1024 }
});

router.post("/trim", upload.single("video"), async (req, res) => {
  let inputPath = null;
  let outputPath = null;

  try {
    if (!req.file) return res.status(400).json({ message: "No video uploaded" });

    const start = Number(req.body.start);
    const end = Number(req.body.end);

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return res.status(400).json({ message: "Invalid start or end time" });
    }
    if (start < 0 || end <= start) {
      return res.status(400).json({ message: "Invalid trim range" });
    }

    inputPath = req.file.path;
    outputPath = path.join(uploadDir, `trimmed-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-y", "-i", inputPath,
        "-ss", String(start),
        "-t", String(end - start),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-c:a", "aac",
        "-movflags", "+faststart",
        outputPath
      ]);

      let stderr = "";
      ffmpeg.stderr.on("data", (data) => { stderr += data.toString(); });
      ffmpeg.on("error", reject);
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg failed with code ${code}\n${stderr}`));
      });
    });

    if (!fs.existsSync(outputPath)) {
      throw new Error("FFmpeg did not create output file");
    }

    const filename = path.basename(outputPath);
    res.json({
      success: true,
      message: "Video trimmed successfully",
      start, end,
      duration: end - start,
      url: `/uploads/${filename}`,
      filename
    });

  } catch (error) {
    console.error("VIDEO TRIM ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to trim video", error: error.message });
  } finally {
    if (inputPath && fs.existsSync(inputPath)) {
      try { fs.unlinkSync(inputPath); } catch {}
    }
  }
});

export default router;
