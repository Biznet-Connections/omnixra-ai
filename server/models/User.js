import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    accountType: { type: String, enum: ["jobseeker", "company", "admin"], default: "jobseeker" },
    companyName: { type: String },
    location: { type: String },
    headline: { type: String },
    skills: [{ type: String }],
    about: { type: String },
    category: { type: String, default: "General" },
    openToWork: { type: Boolean, default: true },
    discoverable: { type: Boolean, default: true },

    isPremium: { type: Boolean, default: false },
    premiumVoucher: { type: String },
    premiumPlan: { type: String, enum: ["none", "monthly", "yearly"], default: "none" },
    premiumExpiresAt: { type: Date },
    premiumPlan: { type: String, enum: ["none", "monthly", "yearly"], default: "none" },
    subscriptionTier: {
      type: String,
      enum: ["none", "starter", "plus", "pro"],
      default: "none",
    },
    subscriptionExpiresAt: { type: Date },
    expiryWarningSent: { type: Boolean, default: false },
    expiredNotificationSent: { type: Boolean, default: false },
    pushCredits: { type: Number, default: 0 },

    // ── Company paid features ──
    aiMatchCredits: { type: Number, default: 0 },
    priorityCredits: { type: Number, default: 0 },
    dmCredits: { type: Number, default: 0 },
    verifiedBadge: { type: Boolean, default: false },
    verifiedBadgeExpiresAt: { type: Date },
    companyBoostExpiresAt: { type: Date },
    lastPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    pushCredits: { type: Number, default: 0 },
    boostCredits: { type: Number, default: 0 },
    lastPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },

    signupMethod: { type: String, enum: ["email", "google"], default: "email" },
    googleId: { type: String, sparse: true },
    emailVerified: { type: Boolean, default: false },
    verificationCodeHash: { type: String },
    verificationCodeExpires: { type: Date },
    resetCodeHash: { type: String },
    resetCodeExpires: { type: Date },
    pendingEmail: { type: String, sparse: true },
    pendingEmailCodeHash: { type: String },
    pendingEmailCodeExpires: { type: Date },

    profilePicture: { type: String },
    profilePicLocked: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    verifiedRequested: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    profileViews: [
      {
        viewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        viewerType: { type: String },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    companyViews: [
      {
        company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    connections: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "Company" }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    followingUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    fcmTokens: [
      {
        token: { type: String, required: true },
        platform: { type: String, default: "android" },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ── CV / work experience tracking (for AI qualifying questions) ──
    cvReady: { type: Boolean, default: null },   // null = unknown, true/false = known
    cvUrl: { type: String },
    cvUpdatedAt: { type: Date },
    yearsExperience: { type: Number },
    experienceLevel: { type: String, enum: ["entry", "mid", "senior", null], default: null },

    notificationPrefs: {
      jobAlerts: { type: Boolean, default: true },
      news: { type: Boolean, default: true },
      social: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      likes: { type: Boolean, default: true },
      follows: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
    },
    notificationLog: {
      news: { type: Date },
      jobs: { type: Date },
      jobsFirstSentAt: { type: Date },
    },
    notificationQueue: [
      {
        jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
        matchedAt: { type: Date, default: Date.now },
      },
    ],

    // ── AI follow-up nudge state ──
    aiFollowUpState: {
      lastChatAt: { type: Date },
      lastChatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
      lastIntent: { type: String, enum: ["search_jobs", "cv_help", "chitchat", "venting", "unknown", null], default: null },
      lastCategory: { type: String },
      lastLocation: { type: String },
      lastJobsShown: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
      nudgesSentThisThread: { type: Number, default: 0 },
      lastNudgeAt: { type: Date },
      lastNudgeType: { type: String },
      nextNudgeAt: { type: Date },
      ignoredNudgesCount: { type: Number, default: 0 },
      disabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
