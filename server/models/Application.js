import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["applied", "viewed", "interview", "shortlisted", "rejected"],
      default: "applied"
    },
    matchPercentage: { type: Number, default: 0 },
    viewedAt: { type: Date },
    pushedCV: { type: Boolean, default: false },
    cvAttachment: { type: String }
  },
  { timestamps: true }
);

const Application = mongoose.model("Application", applicationSchema);
export default Application;
