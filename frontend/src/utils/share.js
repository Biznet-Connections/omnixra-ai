export const BASE_URL = "https://omnixra-ai.com";

export function shareText(title, description, url) {
  const text = `${title}\n${description}`;
  if (navigator.share) {
    return navigator.share({ title, text, url });
  }
  return navigator.clipboard.writeText(`${text}\n${url}`);
}

export function sharePost(post) {
  const title = post.author?.name || "Omnixra AI";
  const description = post.text?.substring(0, 150) || "Check this out";
  const url = `${BASE_URL}/share/posts/${post._id}`;
  return shareText(title, description, url);
}

export function shareJob(job) {
  const title = `${job.title} at ${job.company}`;
  const description = `${job.location}${job.salary ? " · " + job.salary : ""}`;
  const url = job.slug ? `${BASE_URL}/share/jobs/${job.slug}` : `${BASE_URL}/share/jobs/${job._id}`;
  return shareText(title, description, url);
}
