import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    location: { type: String },
    category: { type: String },
    industry: { type: String },
    verified: { type: Boolean, default: false },
    source: { type: String, enum: ["seed", "signup"], default: "seed" }
  },
  { timestamps: true }
);

const Company = mongoose.model("Company", companySchema);
export default Company;
