import axios from "axios";

// JSearch API source (RapidAPI)
// Requires JSEARCH_API_KEY in .env
// Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch

export async function searchJSearch(query, page = 1) {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return {
      jobs: [],
      hasMore: false,
      total: 0,
      page,
      comingSoon: true
    };
  }

  try {
    const url = `https://jsearch.p.rapidapi.com/search`;
    const params = {
      query: query || "remote developer",
      page: String(page),
      num_pages: "1"
    };

    const response = await axios.get(url, {
      params,
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
      },
      timeout: 15000
    });

    const data = response.data?.data || [];
    const jobs = data.map(job => ({
      _id: job.job_id,
      title: job.job_title,
      company: job.employer_name || "Company",
      location: job.job_city
        ? `${job.job_city}, ${job.job_country}`
        : job.job_country || "Remote",
      description: job.job_description?.substring(0, 500) || "",
      salary: job.job_min_salary && job.job_max_salary
        ? `${job.job_currency || "USD"} ${job.job_min_salary} - ${job.job_max_salary}`
        : job.job_salary_period || null,
      type: job.job_employment_type || "Full-time",
      category: "Remote",
      source: "jsearch",
      sourceUrl: job.job_apply_link || job.job_google_link,
      applicationUrl: job.job_apply_link,
      logo: job.employer_logo,
      remote: job.job_is_remote,
      postedDate: job.job_posted_at_datetime_utc
    }));

    return {
      jobs,
      hasMore: jobs.length >= 10,
      total: jobs.length,
      page
    };
  } catch (error) {
    console.error("JSearch API error:", error.response?.data?.message || error.message);
    return {
      jobs: [],
      hasMore: false,
      total: 0,
      page,
      error: "Failed to fetch remote jobs"
    };
  }
}
