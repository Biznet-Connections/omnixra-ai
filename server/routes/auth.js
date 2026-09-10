import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// SIGNUP
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, accountType, companyName, location, discoverable, category } = req.body;

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const isAdmin = email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      accountType: isAdmin ? "admin" : accountType,
      companyName: accountType === "company" ? companyName : undefined,
      location,
      category: category || "General",
      discoverable: discoverable !== undefined ? discoverable : true
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      accountType: user.accountType,
      category: user.category,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: error.message });
  }
});

// SIGNIN
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
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
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ADMIN LOGIN - separate from normal login
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
        headline: "System Administrator"
      });
      console.log("Created admin user:", adminUser._id);
    } else if (adminUser.accountType !== "admin") {
      adminUser.accountType = "admin";
      await adminUser.save();
    }

    console.log("✅ Admin logged in:", adminEmail);
    res.json({
      _id: adminUser._id,
      name: adminUser.name,
      email: adminUser.email,
      accountType: "admin",
      token: generateToken(adminUser._id)
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: error.message });
  }
});

// FORGOT PASSWORD (fake for now)
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  console.log("Forgot password requested for:", email);
  res.json({ message: "If that email exists, a reset link has been sent." });
});

// GET CURRENT USER
router.get("/me", protect, async (req, res) => {
  res.json(req.user);
});

// UPDATE PROFILE PICTURE
router.put("/profile-picture", protect, async (req, res) => {
  try {
    const { profilePicture } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePicture },
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
