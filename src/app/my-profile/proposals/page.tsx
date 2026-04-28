import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import Link from "next/link";
import { MyProposalsClient } from "./proposals-client";
import { resolveCandidate } from "@/lib/candidate-resolver";
import { CandidateSelectionPage } from "../candidate-selector";
import { signProposalImages, signAllCandidateImages } from "@/lib/storage";

export default async function MyProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ candidate_id?: string }>;
}) {
  const params = await searchParams;
  const requestedId = params.candidate_id ? parseInt(params.candidate_id, 10) : undefined;

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
        basePath="/my-profile/proposals"
      />
    );
  }

  if (!candidate) {
    redirect("/my-profile");
  }

  const candidateId = candidate.id as number;

  // Build candidate_id param for navigation links
  const cidParam = allCandidates.length > 1 ? `?candidate_id=${candidateId}` : "";

  // Fetch proposals where this candidate is involved
  const { data: rawProposals } = await supabase
    .from("proposals")
    .select(
      "*, candidate_1:candidates!candidate_id_1(id, full_name, image_urls, gender, age, residence), candidate_2:candidates!candidate_id_2(id, full_name, image_urls, gender, age, residence), proposal_notes(id, note_text, author_type, created_at)"
    )
    .or(
      `candidate_id_1.eq.${candidateId},candidate_id_2.eq.${candidateId}`
    )
    .order("updated_at", { ascending: false });

  const proposals = await signProposalImages(rawProposals ?? []);

  // Fetch active candidates for new proposal modal
  const { data: rawAllCandidatesForProposal } = await supabase
    .from("candidates")
    .select("id, full_name, gender, age, residence, image_urls, availability_status")
    .order("full_name", { ascending: true });

  const allCandidatesForProposal = await signAllCandidateImages(rawAllCandidatesForProposal ?? []);

  const activeCandidates = allCandidatesForProposal.filter(
    (c) =>
      !c.availability_status ||
      (c.availability_status !== "הקפאה" &&
        c.availability_status !== "התחתנו")
  );

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
                ההצעות שלי
              </h1>
              <p className="text-[11px] text-gray-400 leading-tight">
                {candidate.full_name as string}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href={`/my-profile${cidParam}`}
              className="px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
            >
              הפרופיל שלי
            </Link>
            <Link
              href={`/my-profile/recommendations${cidParam}`}
              className="hidden sm:block px-4 py-1.5 text-sm font-medium text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors"
            >
              הצעות מומלצות
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                התנתקות
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <MyProposalsClient
          proposals={proposals}
          candidateId={candidateId}
          candidateInfo={{
            id: candidateId,
            full_name: candidate.full_name as string,
            gender: candidate.gender as string,
            age: candidate.age as number,
            residence: candidate.residence as string,
            image_urls: candidate.image_urls as string[] | null,
          }}
          activeCandidates={activeCandidates}
        />
      </main>
    </div>
  );
}
