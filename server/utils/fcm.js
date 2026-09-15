import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let admin = null;
let initialized = false;
let initFailed = false;

async function loadAdmin() {
  if (admin) return admin;
  try {
    const mod = await import("firebase-admin");
    // ESM: prefer default if present; fall back to namespace
    admin = mod.default || mod;
    // Ensure credential + cert exist. Some firebase-admin builds expose
    // them on the namespace instead of on .default.
    if (!admin.credential || typeof admin.credential.cert !== "function") {
      if (typeof mod.cert === "function") {
        admin = { ...admin, credential: { cert: mod.cert } };
      } else if (mod.default && typeof mod.default.cert === "function") {
        admin = { ...admin, credential: { cert: mod.default.cert } };
      }
    }
    return admin;
  } catch (err) {
    console.warn("firebase-admin not installed:", err.message);
    return null;
  }
}

export async function initFirebase() {
  if (initialized) return true;
  if (initFailed) return false;

  const a = await loadAdmin();
  if (!a) { initFailed = true; return false; }

  try {
    let creds = null;

    // Priority 1: base64 env var (for Render)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
      creds = JSON.parse(json);
      console.log("Firebase: using env var (base64)");
    }
    // Priority 2: raw JSON env var
    else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log("Firebase: using env var (raw JSON)");
    }
    // Priority 3: file on disk (local dev)
    else {
      const filePath = path.join(__dirname, "..", "firebase-service-account.json");
      if (fs.existsSync(filePath)) {
        creds = JSON.parse(fs.readFileSync(filePath, "utf8"));
        console.log("Firebase: using local file");
      }
    }

    if (!creds) {
      console.warn("Firebase credentials not found - push disabled");
      initFailed = true;
      return false;
    }

    const certFn = (a.credential && a.credential.cert)
      ? a.credential.cert
      : (a.cert || null);

    if (!certFn || typeof certFn !== "function") {
      console.error("Firebase Admin: no cert() function available");
      initFailed = true;
      return false;
    }

    if (!a.apps || a.apps.length === 0) {
      a.initializeApp({ credential: certFn(creds) });
    }
    initialized = true;
    console.log("Firebase Admin initialized");
    return true;
  } catch (err) {
    console.error("Firebase init error:", err.message);
    initFailed = true;
    return false;
  }
}

export async function isFirebaseReady() {
  return await initFirebase();
}

export async function sendPushToTokens(tokens, payload) {
  const ready = await initFirebase();
  if (!ready) return { success: false, reason: "firebase_not_initialized" };
  const cleanTokens = (tokens || []).filter(Boolean);
  if (cleanTokens.length === 0) return { success: false, reason: "no_tokens" };

  try {
    const message = {
      tokens: cleanTokens,
      notification: {
        title: payload.title || "Omnixra",
        body: payload.body || "",
      },
      data: stringifyData(payload.data || {}),
      android: {
        priority: "high",
        notification: {
          channelId: "omnixra-default",
          sound: "default",
        },
      },
    };

    const res = await admin.messaging().sendEachForMulticast(message);
    console.log("Push sent:", res.successCount, "ok /", res.failureCount, "failed");

    const invalidTokens = [];
    res.responses.forEach((r, i) => {
      if (!r.success) {
        const code = (r.error && r.error.code) || "";
        if (
          code.includes("invalid-registration") ||
          code.includes("not-registered") ||
          code.includes("invalid-argument")
        ) {
          invalidTokens.push(cleanTokens[i]);
        }
      }
    });

    return {
      success: true,
      successCount: res.successCount,
      failureCount: res.failureCount,
      invalidTokens,
    };
  } catch (err) {
    console.error("Push error:", err.message);
    return { success: false, reason: err.message };
  }
}

function stringifyData(data) {
  const out = {};
  for (const [k, v] of Object.entries(data || {})) {
    out[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  return out;
}

export async function sendPushToUser(user, payload) {
  if (!user) return { success: false, reason: "no_user" };
  const list = user.fcmTokens || [];
  const tokens = list.map((t) => (typeof t === "string" ? t : t.token)).filter(Boolean);
  if (tokens.length === 0) return { success: false, reason: "no_tokens_for_user" };

  const result = await sendPushToTokens(tokens, payload);

  if (result.invalidTokens && result.invalidTokens.length > 0) {
    try {
      const User = (await import("../models/User.js")).default;
      await User.findByIdAndUpdate(user._id, {
        $pull: { fcmTokens: { token: { $in: result.invalidTokens } } },
      });
      console.log("Cleaned", result.invalidTokens.length, "invalid tokens");
    } catch (e) {
      console.warn("Token cleanup failed:", e.message);
    }
  }

  return result;
}

export default { initFirebase, isFirebaseReady, sendPushToTokens, sendPushToUser };
