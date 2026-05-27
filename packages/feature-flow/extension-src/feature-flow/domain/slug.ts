export function proposeSlug(input: string): string {
  return sanitizeSlug(input).split("-").slice(0, 8).join("-") || "feature";
}

export function sanitizeSlug(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-")
      .slice(0, 80) || "feature"
  );
}
