import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    location: { type: String },
    category: { type: String },
    description: { type: String },
    duties: [{ type: String }],
    qualifications: [{ type: String }],
    salary: { type: String },
    type: { type: String, default: "Full-time" },
    deadline: { type: Date },
    email: { type: String },
    source: {
      type: String,
      enum: ["omnixra", "seed", "scraped", "jsearch", "ai-generated", "company"],
      default: "omnixra"
    },
    slug: { type: String, unique: true, sparse: true },
    active: { type: Boolean, default: true },

    // ── Company posting fields ──
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["active", "expired", "paused", "draft"], default: "active" },
    expiresAt: { type: Date },
    priorityUntil: { type: Date },
    aiMatchedAt: { type: Date },
    aiMatches: { type: Array, default: [] },
    requirements: { type: String },
    applicationUrl: { type: String },
  },
  { timestamps: true }
);

jobSchema.index({ slug: 1 }, { unique: true, sparse: true });
// Prevent duplicate AI jobs for the same company+title
jobSchema.index({ title: 1, company: 1, source: 1 }, { unique: true, sparse: true });

const Job = mongoose.model("Job", jobSchema);
export default Job;
