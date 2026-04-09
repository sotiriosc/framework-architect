const normalizePrefix = (prefix: string): string =>
  prefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24) || "id";

export const createId = (prefix = "id"): string => `${normalizePrefix(prefix)}_${crypto.randomUUID()}`;

export const nowIso = (): string => new Date().toISOString();

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
