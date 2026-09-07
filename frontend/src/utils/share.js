export const BASE_URL = "https://omnixra-ai.com";

export function shareText(title, description, url) {
  const text = `${title}\n${description}\n${url}`;
  if (navigator.share) {
    return navigator.share({ title, text, url });
  }
  return navigator.clipboard.writeText(text);
}

export function sharePost(post) {
  const title = post.author?.name || "Omnixra AI";
  const description = post.text?.substring(0, 100) || "Check this out on Omnixra";
  const url = `${BASE_URL}/posts/${post._id}`;
  return shareText(title, description, url);
}

export function shareJob(job) {
  const title = `${job.title} at ${job.company}`;
  const description = `${job.location}${job.salary ? " · " + job.salary : ""}`;
  const url = job.slug ? `${BASE_URL}/jobs/${job.slug}` : `${BASE_URL}/job/${job._id}`;
  return shareText(title, description, url);
}

export function shareVideo(post) {
  const title = post.author?.name || "Omnixra AI";
  const description = post.text?.substring(0, 100) || "Video on Omnixra";
  const url = `${BASE_URL}/posts/${post._id}`;
  return shareText(title, description, url);
}
