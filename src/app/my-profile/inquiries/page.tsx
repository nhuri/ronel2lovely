import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import Link from "next/link";
import { InquiriesClient } from "./inquiries-client";
import { resolveCandidate } from "@/lib/candidate-resolver";
import { CandidateSelectionPage } from "../candidate-selector";

export default async function MyInquiriesPage({
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
        basePath="/my-profile/inquiries"
      />
    );
  }

  if (!candidate) {
    redirect("/my-profile");
  }

  const candidateId = candidate.id as number;
  const cidParam = allCandidates.length > 1 ? `?candidate_id=${candidateId}` : "";

  // Fetch inquiries for this candidate
  const { data: inquiries } = await supabase
    .from("inquiries")
    .select("id, category, message, created_at, admin_reply, replied_at")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

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
                פניות
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
            <Link
              href={`/my-profile/recommendations${cidParam}`}
              className="px-4 py-1.5 text-sm font-medium text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors"
            >
              הצעות מומלצות
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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6" dir="rtl">
        <InquiriesClient
          inquiries={inquiries ?? []}
          gender={candidate.gender as string}
          candidateId={candidateId}
        />
      </main>
    </div>
  );
}
