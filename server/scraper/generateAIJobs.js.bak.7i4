import Job from "../models/Job.js";
import Company from "../models/Company.js";
import { generateJobSlug } from "../utils/slugify.js";

// Generate fresh AI jobs daily from company database
const JOB_TITLES_BY_CATEGORY = {
  "Information Technology": ["IT Support Specialist", "Software Developer", "Systems Administrator", "Network Technician", "IT Officer"],
  "Finance & Accounting": ["Accountant", "Finance Officer", "Bookkeeper", "Auditor", "Accounts Clerk"],
  "Marketing & Sales": ["Sales Agent", "Marketing Officer", "Digital Marketing Specialist", "Brand Manager", "Sales Representative"],
  "Healthcare": ["Nurse", "Caregiver", "Pharmacist Assistant", "Clinic Assistant", "Health Officer"],
  "Education": ["Teacher", "Teaching Assistant", "Tutor", "Education Officer", "Lecturer"],
  "Plumbing": ["Plumber", "Plumbing Assistant", "Maintenance Plumber"],
  "Electrical": ["Electrician", "Electrical Assistant", "Maintenance Electrician"],
  "Welding & Fabrication": ["Welder", "Fabricator", "Metal Worker"],
  "Mechanics": ["Mechanic", "Auto Technician", "Diesel Mechanic"],
  "Carpentry": ["Carpenter", "Furniture Maker", "Construction Carpenter"],
  "Housekeeping": ["Housekeeper", "Cleaner", "Domestic Worker"],
  "Gardening": ["Gardener", "Grounds Keeper", "Landscape Assistant"],
  "Nanny / Childcare": ["Nanny", "Childminder", "Au Pair"],
  "Driving": ["Driver", "Truck Driver", "Delivery Driver"],
  "Security": ["Security Guard", "Security Officer", "CCTV Operator"],
  "Farm Work": ["Farm Worker", "Agricultural Assistant", "Field Worker"],
  "Construction Labour": ["Construction Worker", "Site Labourer", "Builder"],
  "General": ["General Worker", "Office Assistant", "Administrative Assistant", "Customer Service", "Receptionist"]
};

export async function generateDailyAIJobs() {
  const startTime = Date.now();
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  ✨ GENERATING AI JOBS FROM COMPANIES            ║");
  console.log("║  Time:", new Date().toISOString());
  console.log("╚══════════════════════════════════════════════════╝");

  try {
    const companies = await Company.find().lean();
    if (companies.length === 0) {
      console.log("⚠️  No companies found. Run seed script first.");
      return { generated: 0 };
    }

    console.log(`📊 Found ${companies.length} companies in database`);

    // Delete old AI jobs (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deleted = await Job.deleteMany({
      source: "ai-generated",
      createdAt: { $lt: thirtyDaysAgo }
    });
    if (deleted.deletedCount > 0) {
      console.log(`🗑️  Cleaned up ${deleted.deletedCount} old AI jobs (>30 days)`);
    }

    // Shuffle companies and pick up to 30 for fresh jobs
    const shuffledCompanies = companies.sort(() => Math.random() - 0.5).slice(0, 30);
    let generated = 0;
    let skipped = 0;

    for (const company of shuffledCompanies) {
      const category = company.category || "General";
      const titles = JOB_TITLES_BY_CATEGORY[category] || JOB_TITLES_BY_CATEGORY["General"];
      const title = titles[Math.floor(Math.random() * titles.length)];

      // Check if similar job exists (any time, not just today)
      const existing = await Job.findOne({
        company: company.name,
        title,
        source: "ai-generated"
      });

      if (existing) {
        skipped++;
        continue;
      }

      const deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      try {
        const job = await Job.create({
          title,
          company: company.name,
          companyId: company._id,
          location: company.location || "Zimbabwe",
          category,
          description: `${company.name} is seeking a ${title} to join their team in ${company.location || "Zimbabwe"}. Apply now to join our growing team.`,
          salary: null,
          type: "Full-time",
          deadline,
          email: company.email || null,
          source: "ai-generated",
          active: true
        });
        job.slug = generateJobSlug(category, title, company.name, job._id);
        await job.save();
        generated++;
      } catch (err) {
        console.error(`  ❌ Failed: ${company.name} - ${title}:`, err.message);
      }
    }

    console.log("\\n╔══════════════════════════════════════════════════╗");
    console.log(`║  ✅ AI JOB GENERATION COMPLETE                   ║`);
    console.log(`║  Generated:  ${generated.toString().padEnd(36)}║`);
    console.log(`║  Skipped:    ${skipped.toString().padEnd(36)}║`);
    console.log(`║  Time: ${(Date.now() - startTime)}ms${' '.repeat(40 - String(Date.now() - startTime).length)}║`);
    console.log("╚══════════════════════════════════════════════════╝\\n");

    return { generated, skipped };
  } catch (error) {
    console.error("❌ AI job generation failed:", error.message);
    return { generated: 0, error: error.message };
  }
}
