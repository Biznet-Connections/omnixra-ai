import mongoose from "mongoose";
const email = 'mutaurijoe@gmail.com';
await mongoose.connect(process.env.MONGODB_URI);
const User = (await import('./models/User.js')).default;
const Payment = (await import('./models/Payment.js')).default;
const Application = (await import('./models/Application.js')).default;
const Boost = (await import('./models/Boost.js')).default;
const user = await User.findOne({ email });
if (!user) { console.log('User not found'); process.exit(1); }
console.log('User:', user._id.toString(), email);
const paymentsDeleted = await Payment.deleteMany({ user: user._id });
console.log('Payments deleted:', paymentsDeleted.deletedCount);
const appsDeleted = await Application.deleteMany({ userId: user._id });
console.log('Applications deleted:', appsDeleted.deletedCount);
const boostsDeleted = await Boost.deleteMany({ userId: user._id });
console.log('Boosts deleted:', boostsDeleted.deletedCount);
const updated = await User.findByIdAndUpdate(user._id, {
  isPremium: false,
  subscriptionTier: 'none',
  premiumPlan: 'none',
  subscriptionExpiresAt: null,
  premiumExpiresAt: null,
  lastPaymentId: null,
  pushCredits: 0,
  boostCredits: 0,
  expiryWarningSent: false,
  expiredNotificationSent: false,
}, { returnDocument: 'after' }).select('email isPremium subscriptionTier subscriptionExpiresAt');
console.log('');
console.log('=== USER RESET ===');
console.log(JSON.stringify(updated, null, 2));
process.exit(0);
