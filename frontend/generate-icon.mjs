// generate-icon.mjs
import { PNG } from "pngjs";
import fs from "fs";

const SIZE = 1024;
const COLORS = {
  purple1: { r: 99, g: 102, b: 241 },   // #6366f1
  purple2: { r: 139, g: 92, b: 246 },   // #8b5cf6
  purple3: { r: 168, g: 85, b: 247 },   // #a855f7
  white:   { r: 255, g: 255, b: 255 }
};

const png = new PNG({ width: SIZE, height: SIZE });
const PADDING = Math.round(SIZE * 0.10);
const BOX = SIZE - PADDING * 2;
const RADIUS = Math.round(BOX * 0.275);

function insideRoundedRect(x, y, rx, ry, w, h, r) {
  if (x < rx || x > rx + w || y < ry || y > ry + h) return false;
  if (x < rx + r && y < ry + r) return Math.hypot(x - (rx + r), y - (ry + r)) <= r;
  if (x > rx + w - r && y < ry + r) return Math.hypot(x - (rx + w - r), y - (ry + r)) <= r;
  if (x < rx + r && y > ry + h - r) return Math.hypot(x - (rx + r), y - (ry + h - r)) <= r;
  if (x > rx + w - r && y > ry + h - r) return Math.hypot(x - (rx + w - r), y - (ry + h - r)) <= r;
  return true;
}

// Curved 4-point sparkle SDF matching the SVG cubic bezier shape
function sparkleSDF(px, py, cx, cy, r) {
  const dx = Math.abs(px - cx);
  const dy = Math.abs(py - cy);
  const norm = Math.pow(dx / r, 0.55) + Math.pow(dy / r, 0.55);
  return norm - 1;
}

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const idx = (SIZE * y + x) << 2;
    let r = 0, g = 0, b = 0, a = 0;

    if (insideRoundedRect(x, y, PADDING, PADDING, BOX, BOX, RADIUS)) {
      const t = (x + y) / (SIZE * 2);
      let from, to, local;
      if (t < 0.5) { from = COLORS.purple1; to = COLORS.purple2; local = t * 2; }
      else { from = COLORS.purple2; to = COLORS.purple3; local = (t - 0.5) * 2; }
      r = Math.round(from.r + (to.r - from.r) * local);
      g = Math.round(from.g + (to.g - from.g) * local);
      b = Math.round(from.b + (to.b - from.b) * local);
      a = 255;

      // Main sparkle
      const sMain = sparkleSDF(x, y, SIZE * 0.50, SIZE * 0.50, SIZE * 0.22);
      if (sMain < 0) {
        const aa = Math.max(0, Math.min(1, -sMain * 3));
        r = Math.round(r * (1 - aa) + 255 * aa);
        g = Math.round(g * (1 - aa) + 255 * aa);
        b = Math.round(b * (1 - aa) + 255 * aa);
      }

      // Small sparkle
      const sSmall = sparkleSDF(x, y, SIZE * 0.70, SIZE * 0.32, SIZE * 0.08);
      if (sSmall < 0) {
        const aa = Math.max(0, Math.min(1, -sSmall * 3)) * 0.85;
        r = Math.round(r * (1 - aa) + 255 * aa);
        g = Math.round(g * (1 - aa) + 255 * aa);
        b = Math.round(b * (1 - aa) + 255 * aa);
      }
    }

    png.data[idx] = r;
    png.data[idx + 1] = g;
    png.data[idx + 2] = b;
    png.data[idx + 3] = a;
  }
}

fs.mkdirSync("assets", { recursive: true });
png.pack().pipe(fs.createWriteStream("assets/icon.png")).on("finish", () => {
  const stat = fs.statSync("assets/icon.png");
  console.log("✅ assets/icon.png created — " + Math.round(stat.size / 1024) + " KB");
});
