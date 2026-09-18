import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ── Auto-downgrade expired subscriptions ──
async function autoDowngradeIfExpired(user) {
  try {
    if (!user) return user;
    if (!user.isPremium) return user;
    if (!user.subscriptionExpiresAt) return user;
    if (new Date(user.subscriptionExpiresAt) >= new Date()) return user;

    // Expired — downgrade silently
    user.isPremium = false;
    user.subscriptionTier = "none";
    user.expiredNotificationSent = true;
    await user.save();
    console.log("[auth] auto-downgraded expired user:", user.email);
    return user;
  } catch (e) {
    console.warn("[auth] auto-downgrade failed:", e.message);
    return user;
  }
}

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      let user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }
      user = await autoDowngradeIfExpired(user);
      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};
