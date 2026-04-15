import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import Link from "next/link";
import { RecommendationsClient } from "./recommendations-client";
import { resolveCandidate } from "@/lib/candidate-resolver";
import { CandidateSelectionPage } from "../candidate-selector";
import { scoreAndRankMatches } from "@/lib/matching";
import { getMaxRecommendations } from "@/app/admin/settings-actions";

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ candidate_id?: string }>;
}) {
  const params = await searchParams;
  const requestedId = params.candidate_id
    ? parseInt(params.candidate_id, 10)
    : undefined;

  const { candidate, allCandidates, needsSelection, supabase } =
    await resolveCandidate(requestedId);

  if (needsSelection) {
    return (
      <CandidateSelectionPage
        candidates={allCandidates.map((c) => ({
          id: c.id as number,
          full_name: c.full_name as string,
          image_urls: c.image_urls as string[] | null,
        }))}
        basePath="/my-profile/recommendations"
      />
    );
  }

  if (!candidate) {
    redirect("/my-profile");
  }

  const candidateId = candidate.id as number;
  const cidParam =
    allCandidates.length > 1 ? `?candidate_id=${candidateId}` : "";

  // Opposite gender
  const myGender = candidate.gender as string;
  const oppositeGender = myGender === "זכר" ? "נקבה" : "זכר";

  // Fetch ALL opposite-gender candidates (excluding only frozen/married/engaged)
  const { data: allPotentialMatches } = await supabase
    .from("candidates")
    .select(
      "id, full_name, gender, age, residence, religious_level, marital_status, height, occupation, education, image_urls, availability_status, about_me"
    )
    .eq("gender", oppositeGender)
    .neq("id", candidateId);

  // Exclude truly inactive statuses
  const activeMatches = (allPotentialMatches ?? []).filter(
    (c) =>
      c.availability_status !== "הקפאה" &&
      c.availability_status !== "התחתנו" &&
      c.availability_status !== "התארסו"
  );

  // Fetch existing proposals, rejected candidates, and preference filters
  const [{ data: existingProposals }, { data: rejectedRows }, { data: prefData }] = await Promise.all([
    supabase
      .from("proposals")
      .select("candidate_id_1, candidate_id_2")
      .or(`candidate_id_1.eq.${candidateId},candidate_id_2.eq.${candidateId}`),
    supabase
      .from("recommendation_rejections")
      .select("rejected_candidate_id")
      .eq("candidate_id", candidateId),
    supabase
      .from("candidates")
      .select("preference_filters")
      .eq("id", candidateId)
      .single(),
  ]);

  type PrefFilters = {
    allowed_religious_levels?: string[];
    min_age?: number;
    max_age?: number;
  };
  const pref = (prefData?.preference_filters ?? {}) as PrefFilters;
  const preferenceFilters = {
    ...(pref.allowed_religious_levels?.length ? { allowedReligiousLevels: pref.allowed_religious_levels } : {}),
    ...(pref.min_age ? { minAge: pref.min_age } : {}),
    ...(pref.max_age ? { maxAge: pref.max_age } : {}),
  };

  const proposalPartnerIds = new Set<number>();
  for (const p of existingProposals ?? []) {
    if (Number(p.candidate_id_1) === candidateId) {
      proposalPartnerIds.add(Number(p.candidate_id_2));
    } else {
      proposalPartnerIds.add(Number(p.candidate_id_1));
    }
  }

  const rejectedIds = new Set<number>(
    (rejectedRows ?? []).map((r) => Number(r.rejected_candidate_id))
  );

  // Exclude proposal partners from all pools, then apply preference filters
  let pool = activeMatches.filter((m) => !proposalPartnerIds.has(Number(m.id)));
  if (pref.allowed_religious_levels?.length) {
    pool = pool.filter((m) => pref.allowed_religious_levels!.includes(m.religious_level as string));
  }
  if (pref.min_age) pool = pool.filter((m) => (m.age as number) >= pref.min_age!);
  if (pref.max_age) pool = pool.filter((m) => (m.age as number) <= pref.max_age!);

  // Split into: available (not תפוס, not rejected), unavailable (תפוס, not rejected), rejected
  const availablePool = pool.filter(
    (m) => m.availability_status !== "תפוס" && !rejectedIds.has(Number(m.id))
  );
  const unavailablePool = pool.filter(
    (m) => m.availability_status === "תפוס" && !rejectedIds.has(Number(m.id))
  );
  const rejectedPool = pool.filter((m) => rejectedIds.has(Number(m.id)));

  const maxRec = await getMaxRecommendations();
  const limit = maxRec === "all" ? availablePool.length : maxRec;

  const topMatches = scoreAndRankMatches(candidate, availablePool, limit);
  const unavailableMatches = scoreAndRankMatches(candidate, unavailablePool, unavailablePool.length);
  const rejectedMatches = scoreAndRankMatches(candidate, rejectedPool, rejectedPool.length);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">RL</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800 leading-tight">
                הצעות מומלצות
              </h1>
              <p className="text-[11px] text-gray-400 leading-tight">
                {candidate.full_name as string}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/my-profile${cidParam}`}
              className="px-4 py-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
            >
              הפרופיל שלי
            </Link>
            <Link
              href={`/my-profile/proposals${cidParam}`}
              className="px-4 py-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
            >
              ההצעות שלי
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                התנתקות
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <RecommendationsClient
          matches={topMatches}
          unavailableMatches={unavailableMatches}
          rejectedMatches={rejectedMatches}
          gender={myGender}
          candidateId={candidateId}
          preferenceFilters={preferenceFilters}
        />
      </main>
    </div>
  );
}
