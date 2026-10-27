import { hasTier, tierRank } from "./tier.js";

const STARTER_REPLY_LIMIT = 3;

/**
 * Enforces HR-reply access + Starter per-account reply cap.
 * Must run AFTER protect().
 *  - Non-subscriber      → 402 (upgrade required)
 *  - Starter at limit    → 402 with upgrade hint
 *  - Plus / Pro          → always allowed
 */
export function requireReplyAccess(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Not authorized" });

  const rank = tierRank(user);

  if (rank < 2 /* plus */) {
    if (rank === 1 /* starter */) {
      const used = user.replyCountSinceSubscription || 0;
      if (used >= STARTER_REPLY_LIMIT) {
        return res.status(402).json({
          message: `Starter plan allows ${STARTER_REPLY_LIMIT} replies. Upgrade to Plus for unlimited.`,
          requiresTier: "plus",
          code: "STARTER_LIMIT_REACHED",
        });
      }
      return next();
    }
    // No subscription at all
    return res.status(402).json({
      message: "Replying to companies is a Plus feature. Upgrade to continue.",
      requiresTier: "plus",
      code: "HR_MESSAGING_LOCKED",
    });
  }

  next();
}
