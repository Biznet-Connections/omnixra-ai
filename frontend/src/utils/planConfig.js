// Plan config — single source of truth for plan display
// Update these to match backend SUBSCRIPTION_* env vars when durations change

const TEST_DURATION_LABEL = {
  starter_biweekly: "3 minutes",
  plus_biweekly: "5 minutes",
  pro_monthly: "10 minutes",
};

const REAL_DURATION_LABEL = {
  starter_biweekly: "3 days",
  plus_biweekly: "7 days",
  pro_monthly: "1 month",
};

// Flip this when going live
const USE_TEST_DURATIONS = true;

export const PLANS = [
  {
    key: "starter_biweekly",
    tier: "starter",
    name: "Starter",
    price: "$5",
    period: USE_TEST_DURATIONS ? TEST_DURATION_LABEL.starter_biweekly : REAL_DURATION_LABEL.starter_biweekly,
    features: ["Inbox HR", "Push My Profile", "Push CV", "Apply via Omnixra", "Auto Apply"],
  },
  {
    key: "plus_biweekly",
    tier: "plus",
    name: "Plus",
    price: "$10",
    period: USE_TEST_DURATIONS ? TEST_DURATION_LABEL.plus_biweekly : REAL_DURATION_LABEL.plus_biweekly,
    features: ["Everything in Starter", "Higher visibility", "Advanced AI insights"],
  },
  {
    key: "pro_monthly",
    tier: "pro",
    name: "Pro",
    price: "$25",
    period: USE_TEST_DURATIONS ? TEST_DURATION_LABEL.pro_monthly : REAL_DURATION_LABEL.pro_monthly,
    badge: "BEST",
    highlight: true,
    features: ["Everything in Plus", "Instant notifications", "Priority support", "Verified badge"],
  },
];

export function getPlan(key) {
  return PLANS.find(p => p.key === key);
}
