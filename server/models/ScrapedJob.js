import mongoose from "mongoose";

const scrapedJobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String },
    country: { type: String, default: "Zimbabwe" },
    employmentType: { type: String, default: "Full-time" },
    category: { type: String, default: "General" },
    description: { type: String },
    requirements: [{ type: String }],
    responsibilities: [{ type: String }],
    skills: [{ type: String }],
    education: { type: String },
    experience: { type: String },
    salary: { type: String },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    currency: { type: String, default: "USD" },
    postedDate: { type: Date },
    closingDate: { type: Date },
    applicationUrl: { type: String },
    applicationEmail: { type: String },
    source: { type: String },
    sourceUrl: { type: String },
    sourceJobId: { type: String },
    fingerprint: { type: String },
    isExpired: { type: Boolean, default: false },
    lastChecked: { type: Date, default: Date.now },
    dateScraped: { type: Date, default: Date.now },
    slug: { type: String },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

scrapedJobSchema.index({ fingerprint: 1 }, { unique: true });

const ScrapedJob = mongoose.model("ScrapedJob", scrapedJobSchema);
export default ScrapedJob;
