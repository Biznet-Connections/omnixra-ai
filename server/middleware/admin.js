export const adminOnly = (req, res, next) => {
  if (req.user && req.user.accountType === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Admin access required" });
  }
};
