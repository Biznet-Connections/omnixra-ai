import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";
import validator from "validator";
import { sendVerificationCode, sendResetCode } from "../utils/mailer.js";
import { protect } from "../middleware/auth.js";
import { uploadToR2, isBase64Image, parseBase64Image } from "../utils/r2.js";

const router = express.Router();

// ── Helpers ──
function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function generateSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isValidEmail(email) {
  return typeof email === "string" && validator.isEmail(email);
}

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// ═══════════════════════════════════════════════════════════
// SIGNUP — creates unverified user + sends 6-digit code
// ═══════════════════════════════════════════════════════════
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, accountType, companyName, location, discoverable, category } = req.body;

    // 1. Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    // 2. Check if already exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      // If unverified, resend code instead of erroring
      if (!userExists.emailVerified && userExists.signupMethod === "email") {
        const code = generateSixDigitCode();
        userExists.verificationCodeHash = hashCode(code);
        userExists.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
        await userExists.save();
        await sendVerificationCode(userExists.email, code);
        return res.status(200).json({
          message: "Account exists but unverified. New code sent.",
          requiresVerification: true,
          email: userExists.email,
        });
      }
      return res.status(400).json({ message: "User already exists. Please sign in." });
    }

    const isAdmin = email.toLowerCase() === (process.env.ADMIN_EMAIL || "").toLowerCase();

    // Create user — auto-verified, no email required (for now)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      accountType: isAdmin ? "admin" : (accountType || "jobseeker"),
      companyName: accountType === "company" ? companyName : undefined,
      location,
      category: category || "General",
      discoverable: discoverable !== undefined ? discoverable : true,
      signupMethod: "email",
      emailVerified: true,
    });

    // Respond with token — user is logged in immediately
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      accountType: user.accountType,
      companyName: user.companyName,
      location: user.location,
      category: user.category,
      headline: user.headline,
      skills: user.skills,
      isPremium: user.isPremium,
      profilePicture: user.profilePicture,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// VERIFY EMAIL — checks 6-digit code, marks verified
// ═══════════════════════════════════════════════════════════
router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email already verified. Please sign in." });
    }

    if (!user.verificationCodeHash || !user.verificationCodeExpires) {
      return res.status(400).json({ message: "No verification code on file. Request a new one." });
    }

    if (new Date() > user.verificationCodeExpires) {
      return res.status(400).json({ message: "Code expired. Request a new one." });
    }

    if (hashCode(code) !== user.verificationCodeHash) {
      return res.status(400).json({ message: "Incorrect code. Please try again." });
    }

    // Mark verified + clear code
    user.emailVerified = true;
    user.verificationCodeHash = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    res.json({
      message: "Email verified successfully.",
      _id: user._id,
      name: user.name,
      email: user.email,
      accountType: user.accountType,
      companyName: user.companyName,
      location: user.location,
      category: user.category,
      headline: user.headline,
      skills: user.skills,
      isPremium: user.isPremium,
      profilePicture: user.profilePicture,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// RESEND VERIFICATION CODE — 60-second cooldown
// ═══════════════════════════════════════════════════════════
router.post("/resend-code", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email already verified." });
    }

    // 60-second cooldown
    if (user.verificationCodeExpires) {
      const issuedAt = user.verificationCodeExpires.getTime() - 10 * 60 * 1000;
      const elapsed = Date.now() - issuedAt;
      if (elapsed < 60000) {
        const wait = Math.ceil((60000 - elapsed) / 1000);
        return res.status(429).json({ message: `Please wait ${wait}s before requesting a new code.` });
      }
    }

    const code = generateSixDigitCode();
    user.verificationCodeHash = hashCode(code);
    user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    sendVerificationCode(user.email, code).catch(e => console.warn("Resend error:", e.message));

    res.json({ message: "New code sent. Check your email." });
  } catch (error) {
    console.error("Resend code error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// SIGNIN — now requires email verification
// ═══════════════════════════════════════════════════════════
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Google-only accounts can't sign in with password
    if (user.signupMethod === "google" && !user.password) {
      return res.status(400).json({ message: "This account uses Google Sign-In. Tap 'Continue with Google'." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      accountType: user.accountType,
      companyName: user.companyName,
      location: user.location,
      category: user.category,
      headline: user.headline,
      skills: user.skills,
      isPremium: user.isPremium,
      profilePicture: user.profilePicture,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// PASSWORD RESET (3-step flow)
// ═══════════════════════════════════════════════════════════

// Rate limit map (per email, per hour)
const resetRateMap = new Map();
function checkResetRate(email) {
  const now = Date.now();
  const key = String(email).toLowerCase();
  const entry = resetRateMap.get(key) || { count: 0, resetAt: now + 60 * 60 * 1000 };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60 * 60 * 1000;
  }
  entry.count++;
  resetRateMap.set(key, entry);
  return entry.count <= 3;
}

// STEP 1 — Request reset code
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email" });
    }

    if (!checkResetRate(email)) {
      return res.status(429).json({ message: "Too many reset requests. Try again later." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success (prevent user enumeration)
    if (!user) {
      console.log("[RESET] No user for", email);
      return res.json({ success: true });
    }

    const code = generateSixDigitCode();
    user.resetCodeHash = hashCode(code);
    user.resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.resetAttempts = 0;
    await user.save();

    const { sendResetCode } = await import("../utils/mailer.js");
    const result = await sendResetCode(user.email, code, user.name);

    if (!result.sent) {
      console.warn("[RESET] Email failed:", result.reason);
      return res.status(500).json({ message: "Could not send email. Try again." });
    }

    console.log("[RESET] Code sent to", email);
    res.json({ success: true });
  } catch (err) {
    console.error("[RESET] error:", err.message);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// STEP 2 — Verify code
router.post("/verify-reset-code", async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({ message: "Email and code required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.resetCodeHash) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    if (user.resetAttempts >= 5) {
      user.resetCodeHash = undefined;
      user.resetCodeExpires = undefined;
      await user.save();
      return res.status(429).json({ message: "Too many attempts. Request a new code." });
    }

    if (!user.resetCodeExpires || user.resetCodeExpires < new Date()) {
      return res.status(400).json({ message: "Code expired. Request a new one." });
    }

    if (user.resetCodeHash !== hashCode(code)) {
      user.resetAttempts = (user.resetAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: "Invalid code" });
    }

    // Issue a short-lived reset token
    const resetToken = jwt.sign(
      { id: user._id, purpose: "password_reset" },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    res.json({ success: true, resetToken });
  } catch (err) {
    console.error("[RESET-VERIFY] error:", err.message);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// STEP 3 — Set new password
router.post("/reset-password", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body || {};
    if (!resetToken || !newPassword) {
      return res.status(400).json({ message: "Token and new password required" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    let payload;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ message: "Reset link expired. Start again." });
    }
    if (payload.purpose !== "password_reset") {
      return res.status(400).json({ message: "Invalid token" });
    }

    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = newPassword;
    user.resetCodeHash = undefined;
    user.resetCodeExpires = undefined;
    user.resetAttempts = 0;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    console.log("[RESET] Password changed for", user.email);
    res.json({ success: true });
  } catch (err) {
    console.error("[RESET-FINAL] error:", err.message);
    res.status(500).json({ message: "Something went wrong" });
  }
});


// ═══════════════════════════════════════════════════════════
// VERIFY RESET CODE — checks code without consuming it
// ═══════════════════════════════════════════════════════════
router.post("/verify-reset-code", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "Invalid code." });
    }

    if (!user.resetCodeHash || !user.resetCodeExpires) {
      return res.status(400).json({ message: "No reset code on file. Request a new one." });
    }

    if (new Date() > user.resetCodeExpires) {
      return res.status(400).json({ message: "Code expired. Request a new one." });
    }

    if (hashCode(code) !== user.resetCodeHash) {
      return res.status(400).json({ message: "Incorrect code." });
    }

    res.json({ message: "Code verified. You can now set a new password." });
  } catch (error) {
    console.error("Verify reset code error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// RESET PASSWORD — sets new password after code verified
// ═══════════════════════════════════════════════════════════
router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "Email, code, and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "Invalid request." });
    }

    if (!user.resetCodeHash || !user.resetCodeExpires) {
      return res.status(400).json({ message: "No reset code on file. Request a new one." });
    }

    if (new Date() > user.resetCodeExpires) {
      return res.status(400).json({ message: "Code expired. Request a new one." });
    }

    if (hashCode(code) !== user.resetCodeHash) {
      return res.status(400).json({ message: "Incorrect code." });
    }

    // Set new password + clear code
    user.password = newPassword;
    user.resetCodeHash = undefined;
    user.resetCodeExpires = undefined;
    await user.save();

    res.json({ message: "Password updated. You can now sign in." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN LOGIN (unchanged)
// ═══════════════════════════════════════════════════════════
router.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return res.status(500).json({ message: "Admin credentials not configured" });
    }

    if (email.toLowerCase() !== adminEmail.toLowerCase() || password !== adminPassword) {
      console.log("⚠️ Failed admin login attempt for:", email);
      return res.status(401).json({ message: "Access denied" });
    }

    let adminUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (!adminUser) {
      adminUser = await User.create({
        name: "Admin",
        email: adminEmail.toLowerCase(),
        password: adminPassword,
        accountType: "admin",
        verified: true,
        emailVerified: true,
        headline: "System Administrator",
      });
      console.log("Created admin user:", adminUser._id);
    } else if (adminUser.accountType !== "admin") {
      adminUser.accountType = "admin";
      adminUser.emailVerified = true;
      await adminUser.save();
    }

    console.log("✅ Admin logged in:", adminEmail);
    res.json({
      _id: adminUser._id,
      name: adminUser.name,
      email: adminUser.email,
      accountType: "admin",
      token: generateToken(adminUser._id),
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// COMPLETE COMPANY PROFILE — after Google signup as company
// ═══════════════════════════════════════════════════════════
router.put("/complete-company-profile", protect, async (req, res) => {
  try {
    const { companyName, location, category } = req.body;
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ message: "Company name is required." });
    }

    const update = {
      companyName: companyName.trim(),
    };
    if (location) update.location = location.trim();
    if (category) update.category = category.trim();

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select("-password");
    res.json(user);
  } catch (error) {
    console.error("Complete company profile error:", error);
    res.status(500).json({ message: error.message });
  }
});
// GET CURRENT USER
router.get("/me", protect, async (req, res) => {
  res.json(req.user);
});

// UPDATE PROFILE PICTURE
router.put("/profile-picture", protect, async (req, res) => {
  try {
    const { profilePicture } = req.body;
    let pictureUrl = profilePicture;
    if (profilePicture && isBase64Image(profilePicture)) {
      const parsed = parseBase64Image(profilePicture);
      if (parsed) {
        console.log("📤 Uploading avatar to R2...");
        pictureUrl = await uploadToR2(parsed.buffer, parsed.mimetype, "avatars");
      }
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePicture: pictureUrl },
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── CHANGE EMAIL — step 1: send code to new email ──
router.post("/change-email", protect, async (req, res) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ message: "Valid new email required" });
    }
    const existing = await User.findOne({ email: newEmail.toLowerCase() });
    if (existing) return res.status(400).json({ message: "Email already in use" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    await User.findByIdAndUpdate(req.user._id, {
      pendingEmail: newEmail.toLowerCase(),
      pendingEmailCodeHash: codeHash,
      pendingEmailCodeExpires: new Date(Date.now() + 15 * 60 * 1000),
    });

    const { sendVerificationCode } = await import("../utils/mailer.js");
    await sendVerificationCode(newEmail, code);

    res.json({ message: "Verification code sent to new email" });
  } catch (error) {
    console.error("[change-email] error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── CHANGE EMAIL — step 2: verify code ──
router.post("/verify-email-change", protect, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Code required" });

    const user = await User.findById(req.user._id);
    if (!user.pendingEmail || !user.pendingEmailCodeHash) {
      return res.status(400).json({ message: "No pending email change" });
    }
    if (new Date(user.pendingEmailCodeExpires) < new Date()) {
      return res.status(400).json({ message: "Code expired" });
    }
    const ok = await bcrypt.compare(code, user.pendingEmailCodeHash);
    if (!ok) return res.status(400).json({ message: "Invalid code" });

    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    user.pendingEmailCodeHash = undefined;
    user.pendingEmailCodeExpires = undefined;
    await user.save();

    res.json({ message: "Email updated", email: user.email });
  } catch (error) {
    console.error("[verify-email-change] error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── CHANGE PASSWORD ──
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }
    const user = await User.findById(req.user._id);
    const ok = await user.matchPassword(currentPassword);
    if (!ok) return res.status(400).json({ message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated" });
  } catch (error) {
    console.error("[change-password] error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
