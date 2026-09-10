import axios from "axios";

export async function scrapeZimboJobs() {
  console.log("=== SCRAPING ZIMBOJOBS ===");
  const jobs = [];

  try {
    const response = await axios.get("https://zimbojobs.com/", {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });

    const html = response.data;

    // Extract all __next_f.push payloads
    const pushes = [...html.matchAll(/self\.__next_f\.push\(\[1,"(.+?)"\]\)/gs)];
    const combined = pushes.map(m => {
      try {
        return JSON.parse(`"${m[1]}"`);
      } catch { return ""; }
    }).join("");

    // Find the jobs array
    const jobsMatch = combined.match(/"jobs":(\[.*?\])/s);
    if (!jobsMatch) {
      console.log("ZimboJobs: no jobs array found in payload");
      return jobs;
    }

    const jobsArray = JSON.parse(jobsMatch[1]);
    console.log(`ZimboJobs: found ${jobsArray.length} jobs in payload`);

    for (const j of jobsArray) {
      if (!j._id || !j.title) continue;

      const absoluteUrl = `https://zimbojobs.com/jobs/${j._id}`;

      jobs.push({
        title: j.title,
        company: j.company || "ZimWorX",
        location: j.location || "Zimbabwe",
        applicationUrl: absoluteUrl,
        source: "ZimboJobs",
        sourceUrl: absoluteUrl,
        description: j.description || `Join the ZimWorX team as a ${j.title} in ${j.location || "Zimbabwe"}. This is a full-time position offering excellent growth opportunities. Click to apply on ZimboJobs.`,
        sourceJobId: `zimbojobs-${j._id}`
      });
    }

    console.log(`ZimboJobs total: ${jobs.length} jobs`);
  } catch (error) {
    console.error("ZimboJobs scrape error:", error.message);
  }

  return jobs;
}
