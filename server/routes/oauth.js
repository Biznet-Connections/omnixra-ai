// Google OAuth — web-view flow (works on web + native)
import express from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

function getClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "https://omnixra-ai.com/api/oauth/google/callback"
  );
}

function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

// ── Step 1: Kick off Google OAuth ──
// Redirects user to Google's consent screen
router.get("/google", (req, res) => {
  const client = getClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
  });
  res.redirect(url);
});

// ── Step 2: Google redirects back here ──
router.get("/google/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect("omnixraapp://oauth?error=missing_code");
    }

    const client = getClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    if (!email) {
      return res.redirect("omnixraapp://oauth?error=no_email");
    }

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Create new user
      user = await User.create({
        name: name || email.split("@")[0],
        email: email.toLowerCase(),
        password: Math.random().toString(36).slice(-32), // random — user never uses it
        accountType: "jobseeker",
        signupMethod: "google",
        googleId,
        emailVerified: true,
        profilePicture: picture || undefined,
      });
    } else {
      // Existing user — link Google account
      if (!user.googleId) user.googleId = googleId;
      if (!user.emailVerified) user.emailVerified = true;
      if (!user.profilePicture && picture) user.profilePicture = picture;
      // If signupMethod was "email" but they use Google now, keep email password too
      await user.save();
    }

    const token = generateToken(user._id);

    // Return to app with token in URL — deep link
    // For web: redirect to home with token in localStorage via frontend route
    // For native: deep link back into app
    const isNative = req.query.platform === "native";

    if (isNative) {
      // Deep link back to the app
      return res.redirect(`omnixraapp://oauth?token=${token}&userId=${user._id}`);
    }

    // Web: redirect to frontend with token in URL fragment (safer than query)
    return res.redirect(`https://omnixra-ai.com/auth-callback#token=${token}&userId=${user._id}`);
  } catch (error) {
    console.error("Google OAuth error:", error);
    return res.redirect("omnixraapp://oauth?error=" + encodeURIComponent(error.message));
  }
});

// ── Optional: Verify token from a client (for mobile app) ──
router.post("/google/verify", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "idToken required" });

    const client = getClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name: name || email.split("@")[0],
        email: email.toLowerCase(),
        password: Math.random().toString(36).slice(-32),
        accountType: "jobseeker",
        signupMethod: "google",
        googleId,
        emailVerified: true,
        profilePicture: picture || undefined,
      });
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (!user.emailVerified) user.emailVerified = true;
      await user.save();
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      accountType: user.accountType,
      category: user.category,
      profilePicture: user.profilePicture,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Google verify error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
