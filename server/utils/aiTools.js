import Job from "../models/Job.js";
import User from "../models/User.js";
import Company from "../models/Company.js";

// ══════════════════════════════════════════════════════════
// CATEGORY DATA — Realistic titles + salaries per category
// ══════════════════════════════════════════════════════════

const TITLES_BY_CATEGORY = {
  accounting: ["Junior Accountant", "Accounts Clerk", "Bookkeeper", "Finance Assistant", "Tax Assistant"],
  finance: ["Finance Officer", "Financial Analyst", "Accounts Assistant", "Credit Controller", "Audit Assistant"],
  culinary: ["Cook", "Chef de Partie", "Kitchen Assistant", "Pastry Chef", "Line Cook"],
  hospitality: ["Waiter", "Bartender", "Housekeeping Attendant", "Front Desk Receptionist", "Concierge"],
  it: ["Junior Developer", "IT Support Technician", "Frontend Developer", "Help Desk Technician", "QA Tester"],
  software: ["Software Engineer", "Junior Developer", "Full-Stack Developer", "Backend Developer", "DevOps Engineer"],
  sales: ["Sales Representative", "Sales Assistant", "Business Development Officer", "Account Executive", "Retail Salesperson"],
  marketing: ["Marketing Assistant", "Social Media Manager", "Content Writer", "Brand Ambassador", "Digital Marketer"],
  admin: ["Administrative Assistant", "Office Clerk", "Data Entry Clerk", "Receptionist", "Secretary"],
  "customer service": ["Customer Service Representative", "Call Center Agent", "Client Support Officer", "Help Desk Agent", "Customer Care Assistant"],
  general: ["General Worker", "Cleaner", "Loader", "Warehouse Assistant", "Office Messenger"],
  cleaning: ["Housekeeper", "Cleaner", "Laundry Attendant", "Sanitation Worker", "Office Cleaner"],
  teaching: ["Teacher", "Tutor", "Teaching Assistant", "Lecturer", "Subject Instructor"],
  education: ["Teacher", "Tutor", "Teaching Assistant", "Academic Coordinator", "Curriculum Developer"],
  healthcare: ["Nurse Aide", "Caregiver", "Clinic Assistant", "Medical Receptionist", "Health Worker"],
  nursing: ["Registered Nurse", "Nurse Aide", "Clinical Officer", "Midwife", "Community Health Worker"],
  driver: ["Driver", "Delivery Driver", "Chauffeur", "Truck Driver", "Dispatch Rider"],
  security: ["Security Guard", "Gate Keeper", "Patrol Officer", "Security Supervisor", "Access Controller"],
  construction: ["Construction Worker", "Bricklayer", "Painter", "Welder", "Carpenter"],
  engineering: ["Junior Engineer", "Site Engineer", "Mechanical Technician", "Electrical Technician", "Civil Engineer"],
  mining: ["Mine Worker", "Plant Operator", "Drill Operator", "Safety Officer", "Mine Electrician"],
  agriculture: ["Farm Worker", "Agricultural Assistant", "Irrigation Technician", "Livestock Attendant", "Crop Supervisor"],
  retail: ["Retail Assistant", "Shop Attendant", "Cashier", "Stock Controller", "Merchandiser"],
  logistics: ["Logistics Coordinator", "Warehouse Supervisor", "Supply Chain Assistant", "Dispatch Clerk", "Inventory Officer"],
  hr: ["HR Assistant", "Recruitment Officer", "HR Coordinator", "Payroll Clerk", "Training Officer"],
};

const SALARY_BY_CATEGORY = {
  accounting: ["$500-800/mo", "$600-900/mo", "$450-750/mo", "$550-850/mo"],
  finance: ["$700-1200/mo", "$800-1400/mo", "$600-1000/mo"],
  culinary: ["$350-600/mo", "$400-700/mo", "$300-550/mo", "$450-750/mo"],
  hospitality: ["$300-500/mo", "$350-600/mo", "$400-650/mo"],
  it: ["$700-1200/mo", "$800-1500/mo", "$600-1000/mo", "$900-1600/mo"],
  software: ["$900-1800/mo", "$1200-2500/mo", "$800-1500/mo"],
  sales: ["$400-700/mo + commission", "$500-900/mo", "$350-650/mo"],
  marketing: ["$500-900/mo", "$600-1000/mo", "$400-750/mo"],
  admin: ["$400-650/mo", "$450-700/mo", "$350-550/mo"],
  "customer service": ["$350-550/mo", "$400-600/mo", "$300-500/mo"],
  general: ["$300-500/mo", "$250-450/mo", "$350-550/mo"],
  cleaning: ["$280-450/mo", "$300-480/mo", "$250-420/mo"],
  teaching: ["$400-700/mo", "$500-800/mo", "$350-650/mo"],
  healthcare: ["$450-750/mo", "$500-850/mo", "$400-700/mo"],
  driver: ["$400-600/mo", "$450-700/mo", "$350-550/mo"],
  security: ["$300-450/mo", "$350-500/mo"],
  construction: ["$400-700/mo", "$450-750/mo", "$350-600/mo"],
  engineering: ["$800-1400/mo", "$900-1600/mo", "$700-1200/mo"],
  mining: ["$600-1200/mo", "$700-1400/mo", "$500-1000/mo"],
  agriculture: ["$250-450/mo", "$300-500/mo"],
  retail: ["$300-500/mo", "$350-550/mo"],
  logistics: ["$500-850/mo", "$600-1000/mo"],
  hr: ["$500-850/mo", "$600-950/mo"],
};

const DEADLINE_DAYS = [3, 4, 5, 6, 7, 9, 11, 12, 14, 21, 30];

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Keyword → category mapping so "chef", "cook", "waiter" etc resolve to the right bucket
const KEYWORD_TO_CATEGORY = {
  chef: "culinary", cook: "culinary", kitchen: "culinary", pastry: "culinary", "line cook": "culinary", sous: "culinary",
  waiter: "hospitality", waitress: "hospitality", bartender: "hospitality", barista: "hospitality", housekeep: "hospitality", receptionist: "hospitality",
  driver: "driver", chauffeur: "driver", delivery: "driver", truck: "driver",
  nurse: "nursing", caregiver: "healthcare", clinic: "healthcare", medical: "healthcare", health: "healthcare",
  teacher: "teaching", tutor: "teaching", lecturer: "teaching", instructor: "teaching",
  developer: "software", engineer: "software", programmer: "software", "full-stack": "software", frontend: "software", backend: "software",
  "it ": "it", "help desk": "it", "it support": "it", technician: "it",
  accountant: "accounting", bookkeeper: "accounting", finance: "finance", audit: "finance",
  security: "security", guard: "security", patrol: "security",
  cleaner: "cleaning", cleaning: "cleaning", housekeeper: "cleaning", laundry: "cleaning",
  construction: "construction", builder: "construction", bricklayer: "construction", welder: "construction", painter: "construction", carpenter: "construction",
  warehouse: "logistics", logistics: "logistics", supply: "logistics", dispatch: "logistics", inventory: "logistics",
  sales: "sales", retail: "retail", cashier: "retail", shop: "retail", merchandiser: "retail",
  marketing: "marketing", "social media": "marketing", content: "marketing", brand: "marketing",
  admin: "admin", "administrative": "admin", clerk: "admin", secretary: "admin", "data entry": "admin",
  hr: "hr", "human resources": "hr", recruiter: "hr", payroll: "hr",
  farm: "agriculture", agricultur: "agriculture", irrigation: "agriculture", livestock: "agriculture",
  mine: "mining", miner: "mining", drilling: "mining",
  "customer service": "customer service", "call center": "customer service", "call centre": "customer service", support: "customer service",
  general: "general", worker: "general", labourer: "general", laborer: "general",
};

function resolveCategory(raw) {
  const key = (raw || "").toLowerCase().trim();
  if (!key) return null;
  if (TITLES_BY_CATEGORY[key]) return key;
  if (SALARY_BY_CATEGORY[key]) return key;

  // Keyword mapping FIRST — avoids short-key traps like "waiter" containing "it"
  // Sort keywords by length descending so longer, more specific phrases win
  const sortedKeywords = Object.keys(KEYWORD_TO_CATEGORY).sort((a, b) => b.length - a.length);
  for (const kw of sortedKeywords) {
    if (key === kw || key.includes(kw)) return KEYWORD_TO_CATEGORY[kw];
  }

  // Substring category-key match (only for keys >= 4 chars to avoid "it"/"hr" traps)
  const sortedCats = Object.keys(TITLES_BY_CATEGORY).sort((a, b) => b.length - a.length);
  for (const k of sortedCats) {
    if (k.length < 4) continue;
    if (key.includes(k) || k.includes(key)) return k;
  }

  return null;
}

function getTitlesForCategory(category) {
  const resolved = resolveCategory(category);
  if (resolved && TITLES_BY_CATEGORY[resolved]) return TITLES_BY_CATEGORY[resolved];
  // If we couldn't resolve but user gave a specific title, use it as the sole title
  const raw = (category || "").trim();
  if (raw && raw.length <= 40) {
    return [raw, ...TITLES_BY_CATEGORY.general.slice(0, 4)];
  }
  return ["General Worker", "Office Assistant", "Customer Service Rep", "Administrative Assistant", "Store Assistant"];
}

function getSalaryForCategory(category) {
  const key = (category || "").toLowerCase().trim();
  if (SALARY_BY_CATEGORY[key]) return pick(SALARY_BY_CATEGORY[key]);
  for (const k of Object.keys(SALARY_BY_CATEGORY)) {
    if (key.includes(k) || k.includes(k)) return pick(SALARY_BY_CATEGORY[k]);
  }
  return pick(SALARY_BY_CATEGORY.general);
}

function generateSlug(title, company, seed) {
  const base = `${title}-${company}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
  return `${base}-${seed}`;
}

// ══════════════════════════════════════════════════════════
// MATCH CALCULATION
// ══════════════════════════════════════════════════════════

export function calculateMatch({ user, job }) {
  if (!user || !job) return 30;
  let score = 40;

  if (user.category && job.category && user.category.toLowerCase() === job.category.toLowerCase()) {
    score += 30;
  }

  if (user.location && job.location) {
    const uLoc = user.location.toLowerCase();
    const jLoc = job.location.toLowerCase();
    if (uLoc.includes(jLoc) || jLoc.includes(uLoc)) score += 15;
  }

  const userSkills = (user.skills || []).map(s => s.toLowerCase());
  const jobText = ((job.description || "") + " " + (job.title || "") + " " + (job.requirements || "")).toLowerCase();
  let skillHits = 0;
  for (const s of userSkills) {
    if (jobText.includes(s)) skillHits++;
  }
  score += Math.min(15, skillHits * 5);

  return Math.min(99, Math.max(30, score));
}

export function enrichJobsWithMatch(jobs, user) {
  return jobs
    .map(j => ({ ...j, matchScore: calculateMatch({ user, job: j }) }))
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}

// ══════════════════════════════════════════════════════════
// GENERATE JOBS FROM DB COMPANIES (no-dead-ends)
// ══════════════════════════════════════════════════════════

async function generateJobsFromCompanies({ category, location, count }) {
  if (count <= 0) return [];
  // Normalize the category so generated jobs are tagged consistently for future queries
  const normalizedCategory = resolveCategory(category) || (category || "general").toLowerCase().trim();

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Try location-matched companies first
  let companies = [];
  if (location) {
    companies = await Company.find({ location: new RegExp(location, "i") }).limit(40).lean();
  }
  if (companies.length < count) {
    const extra = await Company.find().limit(60).lean();
    companies = [...companies, ...extra];
  }

  // Dedupe companies by _id
  const seenCompanyIds = new Set();
  companies = companies.filter(c => {
    if (seenCompanyIds.has(String(c._id))) return false;
    seenCompanyIds.add(String(c._id));
    return true;
  });

  // Shuffle + pick
  const picks = shuffle(companies).slice(0, Math.max(count * 2, count));
  const titles = getTitlesForCategory(category);

  const generated = [];
  for (let i = 0; i < picks.length; i++) {
    const company = picks[i];
    const title = titles[i % titles.length];

    // Dedupe — check if same company+category generated in last 24h
    const existing = await Job.findOne({
      companyId: company._id,
      category: new RegExp("^" + normalizedCategory + "$", "i"),
      source: "ai-generated",
      createdAt: { $gt: cutoff },
    });
    if (existing) {
      generated.push(existing);
      continue;
    }

    // Pick a random future deadline
    const daysAhead = pick(DEADLINE_DAYS);
    const expiresAt = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    const description = `${company.name} is currently seeking a qualified ${title} to join our team in ${company.location || location || "Zimbabwe"}. We offer competitive compensation, a supportive work environment, and opportunities for growth. Ideal candidates should be reliable, hardworking, and ready to start soon.`;

    try {
      const job = await Job.create({
        title,
        company: company.name,
        companyId: company._id,
        location: company.location || location || "Zimbabwe",
        category,
        description,
        salary: getSalaryForCategory(category),
        type: "Full-time",
        deadline: expiresAt,
        email: company.email || null,
        source: "ai-generated",
        active: true,
        status: "active",
        expiresAt,
      });
      job.slug = generateSlug(title, company.name, job._id.toString().slice(-6));
      await job.save();
      generated.push(job.toObject ? job.toObject() : job);
    } catch (err) {
      if (err.code !== 11000) console.error("[genJob] error:", err.message);
    }
  }

  return generated;
}

// ══════════════════════════════════════════════════════════
// SEARCH JOBS — real first, generate if thin
// ══════════════════════════════════════════════════════════

export async function searchJobs({ category, location, keywords, limit = 5 }) {
  const resolved = resolveCategory(category);
  const rawCat = (category || "").trim();

  // Build a broad $or query: match category OR title OR description
  const orClauses = [];

  if (resolved) {
    orClauses.push({ category: new RegExp("^" + resolved + "$", "i") });
    // Only add loose regex for LONG resolved categories
    // (short ones like "it" would match "hospitality")
    if (resolved.length >= 4) {
      orClauses.push({ category: new RegExp(resolved, "i") });
    }
  }
  if (rawCat && rawCat.toLowerCase() !== "general") {
    const isShort = rawCat.length <= 3;
    // Short keywords (it, hr, ...) must match as whole words to avoid false positives
    const catRx = isShort ? new RegExp("\\b" + rawCat + "\\b", "i") : new RegExp(rawCat, "i");
    const titleRx = isShort ? new RegExp("\\b" + rawCat + "\\b", "i") : new RegExp(rawCat, "i");
    orClauses.push({ category: catRx });
    orClauses.push({ title: titleRx });
    // Only match description for longer, specific keywords (>= 4 chars)
    if (rawCat.length >= 4) {
      orClauses.push({ description: new RegExp(rawCat, "i") });
    }
  }
  if (keywords) {
    orClauses.push({ title: new RegExp(keywords, "i") });
    orClauses.push({ description: new RegExp(keywords, "i") });
  }

  const q = {};
  if (orClauses.length) q.$or = orClauses;
  if (location && location !== "Zimbabwe") q.location = new RegExp(location, "i");

  let jobs = await Job.find(q).sort({ createdAt: -1 }).limit(limit * 6).lean();

  // ── Filter: keep only jobs whose TITLE matches the keyword or a known title in that category ──
  if (rawCat && rawCat.toLowerCase() !== "general") {
    const rx = new RegExp(rawCat, "i");
    const knownTitles = resolved && TITLES_BY_CATEGORY[resolved] ? TITLES_BY_CATEGORY[resolved] : [];
    const titleRx = knownTitles.length
      ? new RegExp(knownTitles.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i")
      : null;

    jobs = jobs.filter(j => {
      const title = j.title || "";
      // Keep if title directly matches the user's phrase
      if (rx.test(title)) return true;
      // OR title is one of the canonical titles for the resolved category
      if (titleRx && titleRx.test(title)) return true;
      return false;
    });
  }

  // If still nothing, try location-only (no category filter)
  if (!jobs.length && location) {
    jobs = await Job.find({ location: new RegExp(location, "i") })
      .sort({ createdAt: -1 }).limit(limit * 2).lean();
    if (rawCat && rawCat.toLowerCase() !== "general") {
      const isShort = rawCat.length <= 3;
      const rx = isShort ? new RegExp("\\b" + rawCat + "\\b", "i") : new RegExp(rawCat, "i");
      jobs = jobs.filter(j => rx.test(j.title || "") || rx.test(j.category || ""));
    }
  }

  // Final fallback — generate with the RESOLVED category (so jobs are tagged correctly for future queries)
  if (!jobs.length) {
    const genCategory = resolved || rawCat || "general";
    jobs = await generateJobsFromCompanies({
      category: genCategory,
      location: location || "Zimbabwe",
      count: limit,
    });
  }

  // Rank: title match first
  if (rawCat) {
    const rx = new RegExp(rawCat, "i");
    jobs.sort((a, b) => {
      const aT = rx.test(a.title || "") ? 1 : 0;
      const bT = rx.test(b.title || "") ? 1 : 0;
      return bT - aT;
    });
  }

  return jobs.slice(0, limit);
}

export async function countJobs({ category, location }) {
  const q = { active: true, status: { $ne: "paused" } };
  if (category && category !== "General") q.category = new RegExp(category, "i");
  if (location) q.location = new RegExp(location, "i");
  return await Job.countDocuments(q);
}

export async function searchUsers({ category, location, skills, limit = 5 }) {
  const q = { accountType: "jobseeker", discoverable: true };
  if (category && category !== "General") q.category = new RegExp(category, "i");
  if (location) q.location = new RegExp(location, "i");
  if (skills && Array.isArray(skills) && skills.length > 0) {
    q.skills = { $in: skills.map(s => new RegExp(s, "i")) };
  }
  return await User.find(q)
    .sort({ isPremium: -1, lastSeen: -1 })
    .limit(limit)
    .select("name profilePicture headline location skills category isPremium verifiedBadge")
    .lean();
}

export async function countUsers({ category, location, skills }) {
  const q = { accountType: "jobseeker", discoverable: true };
  if (category && category !== "General") q.category = new RegExp(category, "i");
  if (location) q.location = new RegExp(location, "i");
  if (skills && Array.isArray(skills) && skills.length > 0) {
    q.skills = { $in: skills.map(s => new RegExp(s, "i")) };
  }
  return await User.countDocuments(q);
}

export async function countCompanies({ category, location }) {
  const q = {};
  if (category) q.category = new RegExp(category, "i");
  if (location) q.location = new RegExp(location, "i");
  return await Company.countDocuments(q);
}
