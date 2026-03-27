/**
 * Extract localized text from Tiendanube i18n fields.
 * Priority: es -> pt -> first available value
 */
export function extractLocalizedText(
  text: Record<string, string> | null | undefined
): string {
  if (!text) return "";
  return text.es || text.pt || Object.values(text)[0] || "";
}

/**
 * Parse price string to number.
 * Returns null if invalid.
 */
export function parsePrice(price: string | null | undefined): number | null {
  if (!price) return null;
  const parsed = parseFloat(price);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Sleep for specified milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
