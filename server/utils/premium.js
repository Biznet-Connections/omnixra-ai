// Central premium gating helpers
export function hasActiveSubscription(user) {
  if (!user) return false;
  if (!user.isPremium) return false;
  if (user.premiumExpiresAt && new Date(user.premiumExpiresAt) < new Date()) return false;
  return true;
}

export function tierOf(user) {
  if (!hasActiveSubscription(user)) return "none";
  return user.subscriptionTier || "none";
}

// HR messaging is a Plus+ feature
export function hasHrMessagingAccess(user) {
  const tier = tierOf(user);
  return tier === "plus" || tier === "pro";
}

export function requireHrMessaging(req, res, next) {
  if (!hasHrMessagingAccess(req.user)) {
    return res.status(402).json({
      message: "Replying to companies is a Plus feature. Upgrade to continue.",
      requiresTier: "plus",
      code: "HR_MESSAGING_LOCKED",
    });
  }
  next();
}
