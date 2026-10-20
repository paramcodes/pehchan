const MAX_QUERY_LENGTH = 80;

export function normalizeSearchQuery(raw: string | undefined): string {
  if (!raw) return "";

  return raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

export function toTsQuery(query: string): string {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return "";
  return normalized
    .split(" ")
    .map((term) => term.replace(/[^a-zA-Z0-9'-]/g, ""))
    .filter(Boolean)
    .join(" & ");
}
