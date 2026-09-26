import mongoose from "mongoose";
import User from "./models/User.js";
import Payment from "./models/Payment.js";

await mongoose.connect(process.env.MONGODB_URI);

console.log("=== Deleting all sandbox payments ===");
const payResult = await Payment.deleteMany({});
console.log(`Deleted ${payResult.deletedCount} payment records`);
console.log("");

console.log("=== Resetting user premium state ===");
const userResult = await User.updateMany(
  {},
  {
    $set: {
      isPremium: false,
      subscriptionTier: "none",
      premiumPlan: "none",
      subscriptionExpiresAt: null,
      premiumExpiresAt: null,
      lastPaymentId: null,
      pushCredits: 0,
      boostCredits: 0,
      aiMatchCredits: 0,
      dmCredits: 0,
      priorityCredits: 0,
      verifiedBadge: false,
      verifiedBadgeExpiresAt: null,
      companyBoostExpiresAt: null,
      expiryWarningSent: false,
      expiredNotificationSent: false,
    },
  }
);
console.log(`Reset ${userResult.modifiedCount} users`);
console.log("");

console.log("=== Final state ===");
const users = await User.find({}).select("email subscriptionTier isPremium aiMatchCredits dmCredits").lean();
users.forEach(u => {
  console.log(`${u.email} | tier: ${u.subscriptionTier} | premium: ${u.isPremium} | AI: ${u.aiMatchCredits} | DM: ${u.dmCredits}`);
});

process.exit(0);
