// Plan config — single source of truth for pricing, features, and Linkwa copy.
// Backend mirrors these durations in routes/payments.js.

const USE_TEST_DURATIONS = false; // set true for 3/5/10 min testing

const DURATION_LABEL = USE_TEST_DURATIONS
  ? { starter_biweekly: "3 minutes", plus_biweekly: "5 minutes", pro_monthly: "10 minutes" }
  : { starter_biweekly: "3 days",    plus_biweekly: "7 days",    pro_monthly: "30 days" };

const DURATION_DAYS = {
  starter_biweekly: 3,
  plus_biweekly: 7,
  pro_monthly: 30,
};

export const PLANS = [
  {
    key: "starter_biweekly",
    tier: "starter",
    name: "Starter",
    price: "$5",
    priceValue: 5,
    period: DURATION_LABEL.starter_biweekly,
    days: DURATION_DAYS.starter_biweekly,
    tagline: "Reply to 1 company per day",
    features: [
      "Send up to 3 replies total",
      "Basic replies (text only)",
      "Works for 3 days",
    ],
    linkwa: {
      name: "Starter Plan — Reply to Companies",
      description: "Reply to 1 company per day · up to 3 replies · text only · 3 days",
    },
  },
  {
    key: "plus_biweekly",
    tier: "plus",
    name: "Plus",
    price: "$10",
    priceValue: 10,
    period: DURATION_LABEL.plus_biweekly,
    days: DURATION_DAYS.plus_biweekly,
    highlight: true,
    badge: "POPULAR",
    tagline: "Reply to unlimited companies",
    features: [
      "Reply to every company that messages you — no limits",
      "Attach CV / portfolio in replies",
      "See when HR has read your reply",
      "Works for 7 days",
    ],
    linkwa: {
      name: "Plus Plan — Unlimited Replies",
      description: "Unlimited replies · attach CV · read receipts · 7 days",
    },
  },
  {
    key: "pro_monthly",
    tier: "pro",
    name: "Pro",
    price: "$25",
    priceValue: 25,
    period: DURATION_LABEL.pro_monthly,
    days: DURATION_DAYS.pro_monthly,
    badge: "BEST",
    tagline: "Priority HR inbox placement",
    features: [
      "Everything in Plus",
      "Your replies appear at TOP of the company's inbox",
      "\"Serious candidate\" badge on every reply",
      "Works for 30 days",
    ],
    linkwa: {
      name: "Pro Plan — Priority HR Inbox",
      description: "Priority placement · serious candidate badge · 30 days",
    },
  },
];

export function getPlan(key) {
  return PLANS.find(p => p.key === key);
}

export const DURATIONS = DURATION_DAYS;
