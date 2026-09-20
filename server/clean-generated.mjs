import mongoose from "mongoose";
import Job from "./models/Job.js";

await mongoose.connect(process.env.MONGODB_URI);

const before = await Job.countDocuments({ source: "ai-generated" });
const r = await Job.deleteMany({ source: "ai-generated" });
console.log("Before:", before, "| Deleted:", r.deletedCount);

process.exit(0);
