// Plan config — single source of truth for pricing + features
// Durations MUST match backend SUBSCRIPTION_* env vars

const USE_TEST_DURATIONS = false; // set true for 3/5/10 min testing

const DURATION_LABEL = USE_TEST_DURATIONS
  ? { starter_biweekly: "3 minutes", plus_biweekly: "5 minutes", pro_monthly: "10 minutes" }
  : { starter_biweekly: "3 days", plus_biweekly: "7 days", pro_monthly: "30 days" };

export const PLANS = [
  {
    key: "starter_biweekly",
    tier: "starter",
    name: "Starter",
    price: "$5",
    period: DURATION_LABEL.starter_biweekly,
    tagline: "Land your first interview",
    features: [
      "Push your CV to top of pile",
      "Apply via Omnixra — AI writes your letter",
      "Auto Apply — one tap, we handle it",
    ],
  },
  {
    key: "plus_biweekly",
    tier: "plus",
    name: "Plus",
    price: "$10",
    period: DURATION_LABEL.plus_biweekly,
    tagline: "Reach 10x more recruiters",
    features: [
      "Everything in Starter",
      "Companies see you first",
      "Message HR directly — skip the queue",
      "Send your profile to companies",
      "AI career coach — tailored advice",
    ],
  },
  {
    key: "pro_monthly",
    tier: "pro",
    name: "Pro",
    price: "$25",
    period: DURATION_LABEL.pro_monthly,
    badge: "BEST",
    highlight: true,
    tagline: "Premium job seeker mode",
    features: [
      "Everything in Plus",
      "Instant job alerts — be first to apply",
      "Priority support — we reply in hours",
      "Verified badge — stand out instantly",
    ],
  },
];

export function getPlan(key) {
  return PLANS.find(p => p.key === key);
}
