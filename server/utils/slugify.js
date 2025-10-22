import mongoose from "mongoose";

export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "") // remove quotes
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumerics to hyphen
    .replace(/-{2,}/g, "-") // collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // trim hyphens
}

export async function ensureUniqueSlug(Model, baseSlug, scopeFilter = {}, selfId = null) {
  let slug = baseSlug;
  let suffix = 1;
  // Build base query with scope and slug
  const buildQuery = (s) => ({
    ...scopeFilter,
    slug: s,
    ...(selfId ? { _id: { $ne: new mongoose.Types.ObjectId(selfId) } } : {}),
  });

  // If empty, fallback to random
  if (!slug) slug = Math.random().toString(36).slice(2, 8);

  // Try the base slug, then append -2, -3, ... until free
  let exists = await Model.exists(buildQuery(slug));
  while (exists) {
    suffix += 1;
    const candidate = `${baseSlug}-${suffix}`;
    exists = await Model.exists(buildQuery(candidate));
    if (!exists) {
      slug = candidate;
      break;
    }
  }
  return slug;
}
