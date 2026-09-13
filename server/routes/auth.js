import express from "express";
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

    // 3. Generate verification code
    const code = generateSixDigitCode();

    // 4. Create user (unverified unless admin)
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
      emailVerified: isAdmin ? true : false,
      verificationCodeHash: isAdmin ? undefined : hashCode(code),
      verificationCodeExpires: isAdmin ? undefined : new Date(Date.now() + 10 * 60 * 1000),
    });

    // 5. Send code (skip for admin)
    if (!isAdmin) {
      const sendResult = await sendVerificationCode(user.email, code);
      if (!sendResult.sent) {
        console.warn("Verification email failed:", sendResult.reason);
        // Still return success — code is saved, user can request resend
      }
    }

    // 6. Respond
    if (isAdmin) {
      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        category: user.category,
        token: generateToken(user._id),
      });
    }

    res.status(201).json({
      message: "Account created. Check your email for the 6-digit code.",
      requiresVerification: true,
      email: user.email,
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

    const sendResult = await sendVerificationCode(user.email, code);
    if (!sendResult.sent) {
      return res.status(500).json({ message: "Could not send email. Try again." });
    }

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

    // Require email verification (skip for admins)
    if (!user.emailVerified && user.accountType !== "admin") {
      // Resend code so user can verify
      const code = generateSixDigitCode();
      user.verificationCodeHash = hashCode(code);
      user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      await sendVerificationCode(user.email, code);
      return res.status(403).json({
        message: "Please verify your email. A new code was sent.",
        requiresVerification: true,
        email: user.email,
      });
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
// FORGOT PASSWORD — sends 6-digit reset code
// ═══════════════════════════════════════════════════════════
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success (don't reveal if account exists)
    const genericResponse = { message: "If that email exists, a reset code was sent." };

    if (!user) {
      return res.json(genericResponse);
    }

    // Google-only accounts can't reset password
    if (user.signupMethod === "google" && !user.password) {
      return res.json(genericResponse);
    }

    const code = generateSixDigitCode();
    user.resetCodeHash = hashCode(code);
    user.resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendResetCode(user.email, code);
    res.json(genericResponse);
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: error.message });
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

export default router;
