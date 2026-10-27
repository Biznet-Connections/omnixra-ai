// Server-side mirror of frontend/src/utils/planConfig.js
// Used for Linkwa checkout copy + subscription durations.

export const PLAN_COPY = {
  starter_biweekly: {
    name: "Starter Plan — Reply to Companies",
    description: "Reply to 1 company per day · up to 3 replies · text only · 3 days",
    days: 3,
    amount: 5,
    tier: "starter",
  },
  plus_biweekly: {
    name: "Plus Plan — Unlimited Replies",
    description: "Unlimited replies · attach CV · read receipts · 7 days",
    days: 7,
    amount: 10,
    tier: "plus",
  },
  pro_monthly: {
    name: "Pro Plan — Priority HR Inbox",
    description: "Priority placement · serious candidate badge · 30 days",
    days: 30,
    amount: 25,
    tier: "pro",
  },
};

export function getPlanCopy(type) {
  return PLAN_COPY[type] || null;
}
