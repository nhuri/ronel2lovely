const COUPLE_ORDINAL_WORDS: Record<number, string> = {
  1: "הראשון", 2: "השני", 3: "השלישי", 4: "הרביעי", 5: "החמישי",
  6: "השישי", 7: "השביעי", 8: "השמיני", 9: "התשיעי", 10: "העשירי",
};

export function coupleOrdinalPhrase(n: number): string {
  return COUPLE_ORDINAL_WORDS[n] ? `הזוג ${COUPLE_ORDINAL_WORDS[n]}` : `הזוג מספר ${n}`;
}
