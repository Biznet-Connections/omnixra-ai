export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateJobSlug(category, title, company, id) {
  const base = slugify(`${title}-${company}`);
  const shortId = id.toString().slice(-6);
  return `${base}-${shortId}`;
}

export function generateShareUrl(slug) {
  return `https://omnixra-ai.com/jobs/${slug}`;
}
