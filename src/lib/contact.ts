/**
 * When a candidate has an ambassador ("שגריר") — someone managing the profile
 * on their behalf, tracked via `ambassador_id` — all outbound communication
 * must go through the ambassador's phone/email instead of the candidate's own.
 * The candidate's own phone_number and email are reserved for identification
 * (auth/OTP/matching), never for revealing contact info to another party or
 * messaging the candidate directly.
 *
 * `contact_person_*` alone is NOT the same as having an ambassador: a
 * self-registered candidate can optionally list an unrelated "contact person
 * for inquiries" in those same columns while still managing their own account
 * (ambassador_id stays null). Only `ambassador_id` being set means the profile
 * is actually ambassador-managed — this mirrors the check in
 * src/app/admin/page.tsx (`!c.ambassador_id || !c.contact_person`).
 */
export type ContactSource = {
  ambassador_id?: string | null;
  phone_number?: string | null;
  email?: string | null;
  contact_person_phone?: string | null;
  contact_person_email?: string | null;
};

export type EffectiveContact = {
  phone: string | null;
  email: string | null;
  hasAmbassador: boolean;
};

export function getEffectiveContact(candidate: ContactSource): EffectiveContact {
  const hasAmbassador = !!candidate.ambassador_id;
  return hasAmbassador
    ? {
        phone: candidate.contact_person_phone || candidate.phone_number || null,
        email: candidate.contact_person_email || candidate.email || null,
        hasAmbassador: true,
      }
    : {
        phone: candidate.phone_number || null,
        email: candidate.email || null,
        hasAmbassador: false,
      };
}
