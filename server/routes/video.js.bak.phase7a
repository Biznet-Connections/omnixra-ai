import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import ffmpegPath from "ffmpeg-static";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post("/trim", upload.single("video"), async (req, res) => {
  let tempInput = null;
  let tempOutput = null;

  try {
    if (!req.file) return res.status(400).json({ message: "No video uploaded" });

    const start = Number(req.body.start);
    const end = Number(req.body.end);

    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
      return res.status(400).json({ message: "Invalid trim range" });
    }

    // Write buffer to temp file
    const tempDir = "/tmp";
    tempInput = path.join(tempDir, `input-${Date.now()}.mp4`);
    tempOutput = path.join(tempDir, `output-${Date.now()}.mp4`);

    fs.writeFileSync(tempInput, req.file.buffer);

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath, [
        "-y", "-i", tempInput,
        "-ss", String(start),
        "-t", String(end - start),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-c:a", "aac",
        "-movflags", "+faststart",
        tempOutput
      ]);

      let stderr = "";
      ffmpeg.stderr.on("data", (data) => { stderr += data.toString(); });
      ffmpeg.on("error", reject);
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg failed: ${stderr}`));
      });
    });

    // Read output and convert to base64
    const outputBuffer = fs.readFileSync(tempOutput);
    const base64 = outputBuffer.toString("base64");
    const dataUrl = `data:video/mp4;base64,${base64}`;

    // Clean up temp files
    if (tempInput && fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
    if (tempOutput && fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);

    res.json({
      success: true,
      url: dataUrl,
      duration: end - start,
      start,
      end
    });

  } catch (error) {
    console.error("VIDEO TRIM ERROR:", error);
    if (tempInput && fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
    if (tempOutput && fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
    res.status(500).json({ success: false, message: "Failed to trim video", error: error.message });
  }
});

export default router;
