export function buildSearchText({
  title = "",
  content = "",
  folder = "",
  tags = [],
  aiImageSummary = "",
  aiImageTags = [],
}) {
  return [
    title,
    content,
    folder,
    ...(Array.isArray(tags) ? tags : []),
    aiImageSummary,
    ...(Array.isArray(aiImageTags) ? aiImageTags : []),
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}