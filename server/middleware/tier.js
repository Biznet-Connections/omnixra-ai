const TIER_RANK = { none: 0, starter: 1, plus: 2, pro: 3 };

export function tierRank(user) {
  if (!user) return 0;
  if (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) < new Date()) return 0;
  return TIER_RANK[user.subscriptionTier || "none"] ?? 0;
}

export function hasTier(user, minTier) {
  return tierRank(user) >= (TIER_RANK[minTier] ?? 0);
}

/**
 * Express middleware — must be used AFTER protect().
 */
export function requireTier(minTier) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });
    if (!hasTier(req.user, minTier)) {
      return res.status(403).json({
        message: `This feature requires ${minTier} plan or higher.`,
        requiresTier: minTier,
      });
    }
    next();
  };
}
