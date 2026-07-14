import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileClient } from "@/app/my-profile/profile-client";
import { MyProposalsClient } from "@/app/my-profile/proposals/proposals-client";
import { CreateProposalButton } from "./create-proposal-button";
import { AdminNotesSection } from "./admin-notes-section";
import { InquiriesSection } from "./inquiries-section";
import { CandidateTabs } from "./candidate-tabs";
import { CandidateStatusSection } from "./candidate-status-section";
import { signCandidateImages, signProposalImages } from "@/lib/storage";
import { scoreAndRankMatches } from "@/lib/matching";
import { getMaxRecommendations } from "@/app/admin/settings-actions";
import { AdminRecommendationsSection } from "./admin-recommendations-section";

export default async function AdminCandidateViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // Verify admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role === "candidate") {
    redirect("/login");
  }

  const candidateId = parseInt(id, 10);
  if (isNaN(candidateId)) {
    redirect("/admin");
  }

  // Fetch candidate
  const { data: rawCandidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .maybeSingle();

  if (!rawCandidate) {
    redirect("/admin");
  }

  const candidate = await signCandidateImages(rawCandidate);

  // Fetch proposals for this candidate
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
  const { data: rawAllCandidates } = await supabase
    .from("candidates")
    .select("id, full_name, gender, age, residence, image_urls, availability_status")
    .order("full_name", { ascending: true });

  const activeCandidates = (rawAllCandidates ?? []).filter(
    (c) =>
      !c.availability_status ||
      (c.availability_status !== "הקפאה" &&
        c.availability_status !== "התחתנו")
  );

  // Fetch admin notes
  const { data: adminNotes } = await supabase
    .from("admin_notes")
    .select("id, note_text, created_at")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  // Fetch inquiries
  const { data: inquiries } = await supabase
    .from("inquiries")
    .select("id, category, message, created_at, is_read, admin_reply, replied_at")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  // Fetch recommendation data for this candidate
  const myGender = candidate.gender as string;
  const oppositeGender = myGender === "זכר" ? "נקבה" : "זכר";

  const [
    { data: rawPotentialMatches },
    { data: rejectedRows },
    { data: prefData },
  ] = await Promise.all([
    supabase
      .from("candidates")
      .select("id, full_name, gender, age, residence, religious_level, marital_status, height, occupation, education, image_urls, availability_status, about_me")
      .eq("gender", oppositeGender)
      .neq("id", candidateId),
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

  const allPotentialMatches = rawPotentialMatches ?? [];

  const activeMatches = allPotentialMatches.filter(
    (c) =>
      c.availability_status !== "הקפאה" &&
      c.availability_status !== "התחתנו" &&
      c.availability_status !== "התארסו"
  );

  type PrefFilters = { allowed_religious_levels?: string[]; min_age?: number; max_age?: number };
  const pref = (prefData?.preference_filters ?? {}) as PrefFilters;

  // Reuse already-fetched proposals to build partner exclusion set
  const proposalPartnerIds = new Set<number>();
  for (const p of rawProposals ?? []) {
    if (Number(p.candidate_id_1) === candidateId) {
      proposalPartnerIds.add(Number(p.candidate_id_2));
    } else {
      proposalPartnerIds.add(Number(p.candidate_id_1));
    }
  }

  const rejectedIds = new Set<number>(
    (rejectedRows ?? []).map((r) => Number(r.rejected_candidate_id))
  );

  let basePool = activeMatches.filter((m) => !proposalPartnerIds.has(Number(m.id)));

  // For female candidates: never show men younger by more than 2 years
  if (myGender === "נקבה" && candidate.age) {
    const minManAge = (candidate.age as number) - 2;
    basePool = basePool.filter((m) => {
      const mAge = m.age as number | null;
      return mAge == null || mAge >= minManAge;
    });
  }

  const rejectedPool = basePool.filter((m) => rejectedIds.has(Number(m.id)));
  let recPool = basePool.filter((m) => !rejectedIds.has(Number(m.id)));

  if (pref.allowed_religious_levels?.length) {
    recPool = recPool.filter((m) => pref.allowed_religious_levels!.includes(m.religious_level as string));
  }
  if (pref.min_age) recPool = recPool.filter((m) => (m.age as number) >= pref.min_age!);
  if (pref.max_age) recPool = recPool.filter((m) => (m.age as number) <= pref.max_age!);

  const availablePool = recPool.filter((m) => m.availability_status !== "תפוס");
  const unavailablePool = recPool.filter((m) => m.availability_status === "תפוס");

  const maxRec = await getMaxRecommendations();
  const recLimit = maxRec === "all" ? availablePool.length : maxRec;

  const topMatches = scoreAndRankMatches(candidate, availablePool, recLimit);
  const unavailableMatches = scoreAndRankMatches(candidate, unavailablePool, unavailablePool.length);
  const rejectedMatches = scoreAndRankMatches(candidate, rejectedPool, rejectedPool.length);

  const tabs = [
    {
      key: "profile",
      label: "פרופיל",
      color: "bg-sky-500",
      content: (
        <ProfileClient
          candidate={candidate}
          readOnly
          backUrl="/admin"
          hideHeader
        />
      ),
    },
    {
      key: "proposals",
      label: "הצעות",
      count: proposals?.length ?? 0,
      color: "bg-sky-500",
      content: (
        <div className="space-y-4">
          <div className="flex justify-end">
            <CreateProposalButton
              preselected={{
                id: candidate.id,
                full_name: candidate.full_name,
                gender: candidate.gender,
                age: candidate.age,
                residence: candidate.residence,
                image_urls: candidate.image_urls,
              }}
              candidates={activeCandidates}
            />
          </div>
          <MyProposalsClient
            proposals={proposals ?? []}
            candidateId={candidateId}
            isAdmin
          />
        </div>
      ),
    },
    {
      key: "recommendations",
      label: "המלצות",
      count: topMatches.length,
      color: "bg-violet-500",
      content: (
        <AdminRecommendationsSection
          matches={topMatches}
          unavailableMatches={unavailableMatches}
          rejectedMatches={rejectedMatches}
          totalPool={availablePool.length}
          filters={pref}
        />
      ),
    },
    {
      key: "inquiries",
      label: "פניות",
      count: inquiries?.length ?? 0,
      color: "bg-emerald-500",
      content: (
        <InquiriesSection
          candidateId={candidateId}
          inquiries={inquiries ?? []}
        />
      ),
    },
    {
      key: "notes",
      label: "הערות",
      count: adminNotes?.length ?? 0,
      color: "bg-amber-500",
      content: (
        <AdminNotesSection
          candidateId={candidateId}
          notes={adminNotes ?? []}
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">RL</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800 leading-tight">
                {candidate.full_name}
              </h1>
              <p className="text-[11px] text-gray-400 leading-tight">
                {[candidate.gender, candidate.age, candidate.residence].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/candidate/${candidateId}/print`}
              target="_blank"
              className="px-3 py-1.5 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors"
            >
              הורד PDF
            </Link>
            <Link
              href="/admin"
              className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              חזרה לניהול
            </Link>
          </div>
        </div>
      </header>

      {/* Status */}
      <div className="pt-4">
        <CandidateStatusSection
          candidateId={candidateId}
          availabilityStatus={candidate.availability_status}
          removalReason={candidate.removal_reason}
          removalReasonOther={candidate.removal_reason_other}
          removedBy={candidate.removed_by}
        />
      </div>

      {/* Tabs */}
      <div className="pb-4">
        <CandidateTabs tabs={tabs} />
      </div>
    </div>
  );
}
