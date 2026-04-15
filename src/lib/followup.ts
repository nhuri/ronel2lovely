export const FOLLOWUP_DELAY_OPTIONS = [
  { value: "1m",  label: "דקה אחת (לבדיקה)" },
  { value: "1h",  label: "שעה אחת" },
  { value: "1d",  label: "יום אחד" },
  { value: "7d",  label: "שבוע" },
  { value: "30d", label: "חודש" },
] as const;

export type FollowupDelay = typeof FOLLOWUP_DELAY_OPTIONS[number]["value"];

export function followupDelayToMs(delay: string): number {
  switch (delay) {
    case "1m":  return 60 * 1000;
    case "1h":  return 60 * 60 * 1000;
    case "1d":  return 24 * 60 * 60 * 1000;
    case "30d": return 30 * 24 * 60 * 60 * 1000;
    default:    return 7 * 24 * 60 * 60 * 1000; // "7d"
  }
}
