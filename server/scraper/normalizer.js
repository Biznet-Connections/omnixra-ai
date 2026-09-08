import crypto from "crypto";

export function generateFingerprint(title, company, location) {
  const str = `${title.toLowerCase()}|${company.toLowerCase()}|${location.toLowerCase()}`;
  return crypto.createHash("md5").update(str).digest("hex");
}

export function normalizeJob(rawJob, source) {
  const fingerprint = generateFingerprint(
    rawJob.title || "",
    rawJob.company || "",
    rawJob.location || ""
  );

  return {
    title: rawJob.title || "Untitled Position",
    company: rawJob.company || "Unknown Company",
    location: rawJob.location || "Zimbabwe",
    country: rawJob.country || "Zimbabwe",
    employmentType: rawJob.employmentType || "Full-time",
    category: rawJob.category || "General",
    description: rawJob.description || "",
    requirements: rawJob.requirements || [],
    responsibilities: rawJob.responsibilities || [],
    skills: rawJob.skills || [],
    education: rawJob.education || "",
    experience: rawJob.experience || "",
    salary: rawJob.salary || "",
    salaryMin: rawJob.salaryMin,
    salaryMax: rawJob.salaryMax,
    currency: rawJob.currency || "USD",
    applicationUrl: rawJob.applicationUrl || "",
    applicationEmail: rawJob.applicationEmail || "",
    source: rawJob.source || source,
    sourceUrl: rawJob.sourceUrl || "",
    sourceJobId: rawJob.sourceJobId || `job-${Date.now()}`,
    fingerprint,
    active: true,
    closingDate: rawJob.closingDate || null,
    postedDate: rawJob.postedDate || new Date(),
    isExpired: false,
    dateScraped: new Date()
  };
}

export function dedupeJobs(jobs) {
  const seen = new Set();
  return jobs.filter(job => {
    if (seen.has(job.fingerprint)) return false;
    seen.add(job.fingerprint);
    return true;
  });
}
