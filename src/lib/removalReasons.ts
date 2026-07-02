export const REMOVAL_REASONS = [
  { value: "break", label: "יוצא/ת להפסקה" },
  { value: "married_outside", label: "התחתנתי לא דרך המיזם" },
  { value: "married_via", label: "התחתנתי דרך המיזם" },
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
