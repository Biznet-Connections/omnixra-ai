import mongoose from "mongoose";

const remoteJobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    companyLogo: { type: String },
    location: { type: String, default: "Remote" },
    category: { type: String, default: "General" },
    description: { type: String },
    salary: { type: String },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    currency: { type: String, default: "USD" },
    employmentType: { type: String, default: "Full-time" },
    tags: [{ type: String }],
    applicationUrl: { type: String, required: true },
    source: { type: String, required: true, index: true },   // "remoteok" | "jobicy" | ...
    sourceUrl: { type: String },
    sourceJobId: { type: String, required: true },
    fingerprint: { type: String, required: true, unique: true },
    postedDate: { type: Date },
    dateScraped: { type: Date, default: Date.now, index: true },
    active: { type: Boolean, default: true },
    slug: { type: String, sparse: true },
  },
  { timestamps: true }
);

remoteJobSchema.index({ source: 1, sourceJobId: 1 }, { unique: true });
remoteJobSchema.index({ postedDate: -1 });

const RemoteJob = mongoose.model("RemoteJob", remoteJobSchema);
export default RemoteJob;
