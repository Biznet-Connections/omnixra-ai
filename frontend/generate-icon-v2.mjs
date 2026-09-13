// generate-icon-v2.mjs
import { PNG } from "pngjs";
import fs from "fs";

const SIZE = 1024;
const COLORS = {
  purple1: { r: 99, g: 102, b: 241 },
  purple2: { r: 139, g: 92, b: 246 },
  purple3: { r: 168, g: 85, b: 247 },
  white:   { r: 255, g: 255, b: 255 }
};

function makeBackground() {
  const png = new PNG({ width: SIZE, height: SIZE });
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (SIZE * y + x) << 2;
      const t = (x + y) / (SIZE * 2);
      let from, to, local;
      if (t < 0.5) { from = COLORS.purple1; to = COLORS.purple2; local = t * 2; }
      else { from = COLORS.purple2; to = COLORS.purple3; local = (t - 0.5) * 2; }
      png.data[idx]     = Math.round(from.r + (to.r - from.r) * local);
      png.data[idx + 1] = Math.round(from.g + (to.g - from.g) * local);
      png.data[idx + 2] = Math.round(from.b + (to.b - from.b) * local);
      png.data[idx + 3] = 255;
    }
  }
  return png;
}

function sparkleSDF(px, py, cx, cy, r) {
  const dx = Math.abs(px - cx);
  const dy = Math.abs(py - cy);
  return Math.pow(dx / r, 0.55) + Math.pow(dy / r, 0.55) - 1;
}

function makeForeground() {
  const png = new PNG({ width: SIZE, height: SIZE });
  const cxMain = SIZE * 0.5, cyMain = SIZE * 0.5, rMain = SIZE * 0.30;
  const cxSmall = SIZE * 0.68, cySmall = SIZE * 0.30, rSmall = SIZE * 0.10;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (SIZE * y + x) << 2;
      let r = 0, g = 0, b = 0, a = 0;
      const sMain = sparkleSDF(x, y, cxMain, cyMain, rMain);
      if (sMain < 0) {
        const aa = Math.max(0, Math.min(1, -sMain * 3));
        r = g = b = 255;
        a = Math.round(255 * aa);
      }
      const sSmall = sparkleSDF(x, y, cxSmall, cySmall, rSmall);
      if (sSmall < 0) {
        const aa = Math.max(0, Math.min(1, -sSmall * 3)) * 0.85;
        const alpha = Math.round(255 * aa);
        if (alpha > a) { r = g = b = 255; a = alpha; }
      }
      png.data[idx]     = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }
  return png;
}

// Build fresh combined PNG each time (since pack() is one-shot)
function buildCombined() {
  const bg = makeBackground();
  const fg = makeForeground();
  const png = new PNG({ width: SIZE, height: SIZE });
  for (let i = 0; i < png.data.length; i += 4) {
    const alpha = fg.data[i + 3] / 255;
    png.data[i]     = Math.round(bg.data[i]     * (1 - alpha) + fg.data[i]     * alpha);
    png.data[i + 1] = Math.round(bg.data[i + 1] * (1 - alpha) + fg.data[i + 1] * alpha);
    png.data[i + 2] = Math.round(bg.data[i + 2] * (1 - alpha) + fg.data[i + 2] * alpha);
    png.data[i + 3] = 255;
  }
  return png;
}

function writePng(png, path, label) {
  return new Promise((resolve, reject) => {
    png.pack()
      .pipe(fs.createWriteStream(path))
      .on("finish", () => { console.log("✅ " + label); resolve(); })
      .on("error", reject);
  });
}

fs.mkdirSync("assets", { recursive: true });

async function run() {
  await writePng(makeBackground(), "assets/icon-background.png", "assets/icon-background.png");
  await writePng(makeForeground(), "assets/icon-foreground.png", "assets/icon-foreground.png");
  await writePng(buildCombined(), "assets/icon.png",             "assets/icon.png");
  await writePng(buildCombined(), "assets/splash.png",           "assets/splash.png");
  console.log("\n🎉 All icons regenerated!");
}

run().catch(e => { console.error("FATAL:", e); process.exit(1); });
