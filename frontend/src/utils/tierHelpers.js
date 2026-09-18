const TIER_RANK = { none: 0, starter: 1, plus: 2, pro: 3 };

export function tierRank(user) {
  if (!user) return 0;
  if (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) < new Date()) return 0;
  return TIER_RANK[user.subscriptionTier || "none"] ?? 0;
}

export function hasTier(user, minTier) {
  return tierRank(user) >= (TIER_RANK[minTier] ?? 0);
}

export function tierLabel(user) {
  const t = user?.subscriptionTier || "none";
  if (t === "none") return "Upgrade";
  return t.toUpperCase();
}

export function tierBadgeColor(user) {
  const t = user?.subscriptionTier || "none";
  if (t === "pro") return "text-amber-400 border-amber-400/30 bg-amber-400/10";
  if (t === "plus") return "text-purple-400 border-purple-400/30 bg-purple-400/10";
  if (t === "starter") return "text-indigo-400 border-indigo-400/30 bg-indigo-400/10";
  return "text-slate-400 border-white/10 bg-white/[.02]";
}
