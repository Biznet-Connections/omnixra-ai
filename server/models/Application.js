import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    companyName: { type: String },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["applied", "viewed", "interview", "shortlisted", "rejected"],
      default: "applied",
    },
    matchPercentage: { type: Number, default: 0 },
    viewedAt: { type: Date },

    // New fields for the apply flow
    method: { type: String, enum: ["gmail", "omnixra", "auto"], default: "gmail" },
    deliveredAt: { type: Date },
    deliveredTo: { type: String },
    companyUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },

    pushedCV: { type: Boolean, default: false },
    cvAttachment: { type: String },
    cvName: { type: String },
  },
  { timestamps: true }
);

applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });
applicationSchema.index({ userId: 1, createdAt: -1 });
applicationSchema.index({ jobId: 1, matchPercentage: -1 });
applicationSchema.index({ companyId: 1, createdAt: -1 });

const Application = mongoose.model("Application", applicationSchema);
export default Application;
