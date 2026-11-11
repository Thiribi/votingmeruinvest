/** Predefined industry options for the organization dropdown; "Other" unlocks a custom value. */
export const INDUSTRIES = [
  "Technology",
  "Telecommunications",
  "Finance & Banking",
  "Media & Entertainment",
  "Retail & Consumer",
  "Manufacturing",
  "Education",
  "Healthcare",
  "Hospitality & Tourism",
  "Real Estate",
  "Agriculture",
  "Energy & Utilities",
  "Transport & Logistics",
  "Sports",
  "Non-profit / NGO",
  "Government",
] as const;

export const OTHER_INDUSTRY = "Other";

export const ORG_DESCRIPTION_MAX = 500;

/** Ensures a user-entered website is stored with an https:// scheme (empty stays empty). */
export function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Strips the scheme so the input can render a fixed "https://" prefix affordance. */
export function stripScheme(value: string): string {
  return value.replace(/^https?:\/\//i, "");
}

/** Display helper: first `max` words, appending "…" when the text was longer. */
export function truncateWords(text: string, max = 10): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return words.join(" ");
  return `${words.slice(0, max).join(" ")}…`;
}
