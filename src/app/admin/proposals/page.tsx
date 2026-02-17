import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import Link from "next/link";
import { ProposalsClient } from "./proposals-client";

export default async function AdminProposalsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role === "candidate") {
    redirect("/login");
  }

  // Fetch all proposals with joined candidate data
  const { data: proposals } = await supabase
    .from("proposals")
    .select(
      "*, candidate_1:candidates!candidate_id_1(id, full_name, image_urls, gender, age, residence), candidate_2:candidates!candidate_id_2(id, full_name, image_urls, gender, age, residence), proposal_notes(id, note_text, author_type, created_at)"
    )
    .order("updated_at", { ascending: false });

  // Fetch active candidates for the "new proposal" modal
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, full_name, gender, age, residence, image_urls, availability_status")
    .order("full_name", { ascending: true });

  const activeCandidates = (candidates ?? []).filter(
    (c) => !c.availability_status || (c.availability_status !== "הקפאה" && c.availability_status !== "התחתנו")
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">RL</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800 leading-tight">
                הצעות שידוך
              </h1>
              <p className="text-[11px] text-gray-400 leading-tight">
                ניהול הצעות
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:inline">
              {proposals?.length ?? 0} הצעות
            </span>
            <Link
              href="/admin"
              className="px-4 py-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
            >
              מועמדים
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <ProposalsClient
          proposals={proposals ?? []}
          candidates={activeCandidates}
        />
      </main>
    </div>
  );
}
