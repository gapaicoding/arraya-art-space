/**
 * Accepts common Indonesian phone number formats: leading "08...",
 * "+628...", or "628...", 9-13 digits after the country/trunk prefix.
 * Spaces/dashes are stripped before checking.
 */
export function isValidIndonesianPhone(value: string): boolean {
  const normalized = value.replace(/[\s-]/g, "");
  return /^(\+62|62|0)8[0-9]{8,12}$/.test(normalized);
}
