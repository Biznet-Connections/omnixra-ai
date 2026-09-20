import mongoose from "mongoose";
import Job from "./models/Job.js";

await mongoose.connect(process.env.MONGODB_URI);

const jobs = await Job.find({ source: "ai-generated" })
  .sort({ createdAt: -1 })
  .limit(10)
  .select("title company category location expiresAt createdAt source")
  .lean();

console.log("New generated jobs:", jobs.length);
jobs.forEach(j => {
  console.log("---");
  console.log("Title:", j.title);
  console.log("Company:", j.company);
  console.log("Category:", j.category);
  console.log("Location:", j.location);
  console.log("Expires:", j.expiresAt);
});

process.exit(0);
