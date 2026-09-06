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
    premiumExpiresAt: { type: Date },
    profilePicture: { type: String },
    profilePicLocked: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    verifiedRequested: { type: Boolean, default: false },
    profileViews: [
      { viewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, viewerType: { type: String }, viewedAt: { type: Date, default: Date.now } }
    ],
    companyViews: [
      { company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" }, viewedAt: { type: Date, default: Date.now } }
    ],
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    connections: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "Company" }]
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
