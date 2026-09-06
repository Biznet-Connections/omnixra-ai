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
      enum: ["omnixra", "seed", "scraped", "jsearch", "ai-generated"],
      default: "omnixra"
    },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Job = mongoose.model("Job", jobSchema);
export default Job;
