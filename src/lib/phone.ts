/**
 * Normalize an Israeli phone number for DB lookup.
 * Strips dashes, spaces, and parentheses.
 * "050-123-4567" → "0501234567"
 */
export function normalizePhoneForDb(phone: string): string {
  return phone.replace(/[-\s()]/g, "");
}

/**
 * Convert an Israeli phone number to E.164 format for Supabase phone auth.
 * "0501234567"   → "+972501234567"
 * "050-123-4567" → "+972501234567"
 * "+972501234567" → "+972501234567" (already E.164)
 */
export function toE164(phone: string): string {
  let cleaned = phone.replace(/[-\s()]/g, "");
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  return `+972${cleaned}`;
}
