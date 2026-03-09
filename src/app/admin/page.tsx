import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminTabs } from "./admin-tabs";
import { logout } from "@/app/login/actions";
import Link from "next/link";

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();

  const { data: allCandidates } = await supabase
    .from("candidates")
    .select("*")
    .order("id", { ascending: true });

  // Filter out frozen and married candidates from the main grid
  const candidates = (allCandidates ?? []).filter(
    (c) => !c.availability_status || (c.availability_status !== "הקפאה" && c.availability_status !== "התחתנו" && c.availability_status !== "התארסו")
  );

  // Count unread inquiries
  const { count: unreadInquiries } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  const genders = [
    ...new Set(candidates.map((c) => c.gender).filter(Boolean)),
  ];
  const religiousLevels = [
    ...new Set(
      candidates.map((c) => c.religious_level).filter(Boolean)
    ),
  ];

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
                Ronel Lovely
              </h1>
              <p className="text-[11px] text-gray-400 leading-tight">
                ממשק ניהול
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:inline">
              {candidates?.length ?? 0} מועמדים
            </span>
            <Link
              href="/admin/inquiries"
              className="relative px-4 py-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
            >
              פניות מועמדים
              {(unreadInquiries ?? 0) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {unreadInquiries}
                </span>
              )}
            </Link>
            <Link
              href="/admin/proposals"
              className="px-4 py-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
            >
              הצעות שידוך
            </Link>
            <Link
              href="/admin/new"
              className="px-4 py-1.5 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors"
            >
              + הוסף מועמד חדש
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
        <AdminTabs
          candidates={candidates ?? []}
          allCandidates={allCandidates ?? []}
          genders={genders}
          religiousLevels={religiousLevels}
        />
      </main>
    </div>
  );
}
