// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CandidateRecord = Record<string, any>;

export interface ScoredMatch {
  candidate: CandidateRecord;
  score: number;
}

/**
 * Religious level → numeric index for cross-gender comparison.
 * Male and female Hebrew terms map to the same level.
 */
const RELIGIOUS_LEVEL_MAP: Record<string, number> = {
  "חרדי": 5,
  "חרדית": 5,
  "דתי לאומי תורני": 4,
  "דתי": 3,
  "דתייה": 3,
  "דתי לאומי": 3,
  "דתייה לאומית": 3,
  "מסורתי": 2,
  "מסורתית": 2,
  "חילוני": 1,
  "חילונית": 1,
};

const MARITAL_STATUS_MAP: Record<string, number> = {
  "רווק": 1,
  "רווקה": 1,
  "גרוש": 2,
  "גרושה": 2,
  "אלמן": 3,
  "אלמנה": 3,
};

export function scoreAndRankMatches(
  current: CandidateRecord,
  candidates: CandidateRecord[],
  limit: number
): ScoredMatch[] {
  const myAge = current.age as number | null;
  const myReligion = current.religious_level as string | null;
  const myMarital = current.marital_status as string | null;
  const myCity = current.residence as string | null;

  const scored: ScoredMatch[] = candidates.map((c) => {
    let score = 0;

    // Age compatibility (max 30 + up to 8 direction bonus)
    const theirAge = c.age as number | null;
    if (myAge != null && theirAge != null) {
      const diff = Math.abs(myAge - theirAge);
      if (diff <= 2) score += 30;
      else if (diff <= 5) score += 20;
      else if (diff <= 8) score += 10;
      else if (diff <= 12) score += 5;

      // Prefer woman younger than man (or up to 2 years older is ok)
      const myGender = current.gender as string;
      const manAge = myGender === "זכר" ? myAge : theirAge;
      const womanAge = myGender === "זכר" ? theirAge : myAge;
      if (manAge >= womanAge) {
        score += 8; // woman is younger or same age → ideal
      } else if (manAge + 2 >= womanAge) {
        score += 4; // woman is 1-2 years older → acceptable
      }
      // woman 3+ years older → no bonus
    }

    // Religious level compatibility (max 30)
    if (myReligion && c.religious_level) {
      const myLevel = RELIGIOUS_LEVEL_MAP[myReligion];
      const theirLevel = RELIGIOUS_LEVEL_MAP[c.religious_level as string];
      if (myLevel != null && theirLevel != null) {
        const diff = Math.abs(myLevel - theirLevel);
        if (diff === 0) score += 30;
        else if (diff === 1) score += 15;
      }
    }

    // Marital status compatibility (max 20)
    if (myMarital && c.marital_status) {
      const myGroup = MARITAL_STATUS_MAP[myMarital];
      const theirGroup = MARITAL_STATUS_MAP[c.marital_status as string];
      if (myGroup != null && theirGroup != null) {
        const diff = Math.abs(myGroup - theirGroup);
        if (diff === 0) score += 20;
        else if (diff === 1) score += 10;
      }
    }

    // Same city bonus (max 15)
    if (myCity && c.residence && myCity === c.residence) {
      score += 15;
    }

    // Has photo bonus (5)
    const imgs = c.image_urls as string[] | null;
    if (imgs && imgs.length > 0) {
      score += 5;
    }

    return { candidate: c, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.candidate.id as number) - (b.candidate.id as number);
  });

  return scored.slice(0, limit);
}
