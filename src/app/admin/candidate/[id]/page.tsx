import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileClient } from "@/app/my-profile/profile-client";
import { MyProposalsClient } from "@/app/my-profile/proposals/proposals-client";
import { CreateProposalButton } from "./create-proposal-button";
import { AdminNotesSection } from "./admin-notes-section";
import { InquiriesSection } from "./inquiries-section";
import { CandidateTabs } from "./candidate-tabs";

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
  const { data: candidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .maybeSingle();

  if (!candidate) {
    redirect("/admin");
  }

  // Fetch proposals for this candidate
  const { data: proposals } = await supabase
    .from("proposals")
    .select(
      "*, candidate_1:candidates!candidate_id_1(id, full_name, image_urls, gender, age, residence), candidate_2:candidates!candidate_id_2(id, full_name, image_urls, gender, age, residence), proposal_notes(id, note_text, author_type, created_at)"
    )
    .or(
      `candidate_id_1.eq.${candidateId},candidate_id_2.eq.${candidateId}`
    )
    .order("updated_at", { ascending: false });

  // Fetch active candidates for new proposal modal
  const { data: allCandidates } = await supabase
    .from("candidates")
    .select("id, full_name, gender, age, residence, image_urls, availability_status")
    .order("full_name", { ascending: true });

  const activeCandidates = (allCandidates ?? []).filter(
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
          <Link
            href="/admin"
            className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            חזרה לניהול
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="py-4">
        <CandidateTabs tabs={tabs} />
      </div>
    </div>
  );
}
