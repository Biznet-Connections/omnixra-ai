import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const companies = [
  { name: "Goldenknot Financial Holdings", email: "hr@goldenknot.co.zw", location: "Harare, Zimbabwe", category: "Financial Services", industry: "Finance" },
  { name: "Star International Logistics", email: "hr@starinternational.co.zw", location: "Harare, Zimbabwe", category: "Transport & Logistics", industry: "Logistics" },
  { name: "Zimbabwe Women's Bureau (ZWB)", email: "recruitment@zwbonline.org", location: "Harare, Zimbabwe", category: "NGO", industry: "Development" },
  { name: "Bindura University", email: "https://jobs.buse.ac.zw", location: "Bindura, Zimbabwe", category: "Education", industry: "Academic" },
  { name: "Zimparks", email: "jgwaza@zimparks.org.zw", location: "Harare, Zimbabwe", category: "Conservation", industry: "Government" },
  { name: "TIMB", email: "recruitment@galawayms.co.zw", location: "Harare, Zimbabwe", category: "Government", industry: "Regulatory" },
  { name: "Shumba Mhazi Projects (Pvt) Ltd", email: "hr@smlogistics.co.za", location: "Harare, Zimbabwe", category: "Construction", industry: "Engineering" },
  { name: "Surrey Group", email: "recruiment@surreygroup.org", location: "Marondera, Zimbabwe", category: "Manufacturing", industry: "FMCG" },
  { name: "Greenwood Wholesalers & Pharmacies", email: "careers@greenwoodwholesalers.co.zw", location: "Harare, Zimbabwe", category: "Pharmaceutical", industry: "Retail" },
  { name: "Local Company (Harare)", email: "hr@mh.co.zw", location: "Harare, Zimbabwe", category: "Mining", industry: "Engineering" },
  { name: "Nendoro Stationery", email: "0715230042", location: "Harare, Zimbabwe", category: "Retail", industry: "Stationery" },
  { name: "Client in Mutare", email: "cvs@oxfordrecruitment.co.zw", location: "Mutare, Zimbabwe", category: "Transport", industry: "FMCG" },
  { name: "Secondary Book Press", email: "careers@secondarybookpress.co.zw", location: "Mutare, Zimbabwe", category: "Publishing", industry: "Education" },
  { name: "Crown College", email: "recruitment@crowncollege.co.zw", location: "Norton, Zimbabwe", category: "Education", industry: "Academic" },
  { name: "Associated Belts and Bearings", email: "jobs@abbmotorspares.co.zw", location: "Harare, Zimbabwe", category: "Industrial", industry: "Retail" },
  { name: "Zimbabwe School of Mines", email: "humancapital@zsm.co.zw", location: "Bulawayo, Zimbabwe", category: "Education", industry: "Mining" },
  { name: "AFIDEP", email: "https://afidep.org/about/work-with-us/", location: "Harare, Zimbabwe", category: "NGO", industry: "Research" },
  { name: "Road Freight Company", email: "0777 929 403", location: "Harare, Zimbabwe", category: "Logistics", industry: "Transport" },
  { name: "Kwikbucks Investments", email: "info@kwikbucks.co.zw", location: "Harare, Zimbabwe", category: "Financial Services", industry: "Finance" }
];

try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // Clear existing companies
  await mongoose.connection.db.collection("companies").deleteMany({});
  console.log("Cleared old companies");

  const result = await mongoose.connection.db.collection("companies").insertMany(companies);
  console.log(`Seeded ${result.insertedCount} companies`);

  await mongoose.disconnect();
  console.log("Done!");
  process.exit(0);
} catch (error) {
  console.error("Seed error:", error);
  process.exit(1);
}
