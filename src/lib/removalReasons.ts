export const REMOVAL_REASONS = [
  { value: "break", label: "יוצא/ת להפסקה" },
  { value: "site_pause", label: "בהפסקה מהאתר כרגע" },
  { value: "married_outside", label: "התארסתי לא דרך המיזם" },
  { value: "married_via", label: "התארסתי דרך המיזם" },
  { value: "other", label: "אחר" },
] as const;

export type RemovalReasonValue = (typeof REMOVAL_REASONS)[number]["value"];

export function isValidRemovalReason(value: string): value is RemovalReasonValue {
  return REMOVAL_REASONS.some((r) => r.value === value);
}

export function removalReasonLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return REMOVAL_REASONS.find((r) => r.value === value)?.label ?? value;
}
