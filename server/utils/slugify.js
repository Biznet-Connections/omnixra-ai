export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateJobSlug(category, title, id) {
  const catSlug = slugify(category || "general");
  const titleSlug = slugify(title || "job");
  const shortId = id.toString().slice(-6);
  return `${catSlug}/${titleSlug}-${shortId}`;
}

export function generateShareUrl(category, title, id) {
  const slug = generateJobSlug(category, title, id);
  return `http://localhost:5173/jobs/${slug}`;
}
