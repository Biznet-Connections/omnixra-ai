import mongoose from "mongoose";
import User from "./models/User.js";
import Payment from "./models/Payment.js";

await mongoose.connect(process.env.MONGODB_URI);

// Find users with any Payment record
const payments = await Payment.find({}).select("user").lean();
const userIds = [...new Set(payments.map(p => p.user?.toString()).filter(Boolean))];

console.log("Total payments:", payments.length);
console.log("Unique users with payments:", userIds.length);
console.log("");

for (const id of userIds) {
  const u = await User.findById(id).select("email name subscriptionTier isPremium aiMatchCredits dmCredits priorityCredits pushCredits");
  if (!u) continue;
  console.log(`${u.email} | tier: ${u.subscriptionTier} | premium: ${u.isPremium} | AI: ${u.aiMatchCredits} | DM: ${u.dmCredits} | Push: ${u.pushCredits}`);
}

process.exit(0);
