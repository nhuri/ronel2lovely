import Image from "next/image";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function SiteBanner() {
  let candidateCount = 0;
  let proposalCount = 0;
  let marriedCount = 0;
  let engagedCount = 0;
  let datingCount = 0;

  try {
    const supabase = await createSupabaseServerClient();

    const [candidatesRes, proposalsRes, marriedRes, engagedRes, datingRes] =
      await Promise.all([
        supabase
          .from("candidates")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("proposals")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("candidates")
          .select("id", { count: "exact", head: true })
          .eq("availability_status", "התחתנו"),
        supabase
          .from("candidates")
          .select("id", { count: "exact", head: true })
          .eq("availability_status", "התארסו"),
        supabase
          .from("proposals")
          .select("id", { count: "exact", head: true })
          .eq("status", "5"),
      ]);

    candidateCount = candidatesRes.count ?? 0;
    proposalCount = proposalsRes.count ?? 0;
    marriedCount = marriedRes.count ?? 0;
    engagedCount = engagedRes.count ?? 0;
    datingCount = datingRes.count ?? 0;
  } catch {
    // Fail silently — banner still renders with zeros
  }

  return (
    <div className="bg-gradient-to-l from-sky-600 to-sky-700 text-white py-3 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Single row: photo + text/stats + donation button */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 border-white/40 flex-shrink-0 bg-no-repeat"
            style={{
              backgroundImage: "url(/ronel-web.jpg)",
              backgroundSize: "500%",
              backgroundPosition: "93% 18%",
            }}
            role="img"
            aria-label="רונאל"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold tracking-wide leading-tight">
              בונים בתים לזכרו של רונאל
            </p>
            <p className="text-[11px] font-medium text-sky-200 leading-tight mt-0.5">
              הניצחון של רונאל השמחה של כולנו
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-sky-100">
              <span>
                <strong className="text-white text-xs">{candidateCount}</strong>{" "}
                מועמדים רשומים
              </span>

              {proposalCount > 0 ? (
                <span>
                  <strong className="text-white text-xs">{proposalCount}</strong>{" "}
                  הצעות נפתחו
                </span>
              ) : (
                <span className="text-sky-200 italic">תהיו הראשונים לפתוח הצעה!</span>
              )}

              {datingCount > 0 && (
                <span>
                  <strong className="text-white text-xs">{datingCount}</strong>{" "}
                  דייטים יוצאים
                </span>
              )}

              {engagedCount > 0 && (
                <span>
                  <strong className="text-white text-xs">{engagedCount}</strong>{" "}
                  התארסו
                </span>
              )}

              {marriedCount > 0 ? (
                <span>
                  <strong className="text-white text-xs">{marriedCount}</strong>{" "}
                  התחתנו
                </span>
              ) : (
                <span className="text-sky-200 italic">
                  תהיו הראשונים להתחתן דרך המיזם!
                </span>
              )}
            </div>
          </div>
          {/* Logo — clickable, links to donation page */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <Link
              href="/donate"
              title="לתרומה למיזם לזכרו של רונאל"
              className="flex flex-col items-center cursor-pointer transition-transform hover:scale-105 hover:opacity-90"
            >
              <Image
                src="/chaim%20beronel.jpg"
                alt="לתרומה למיזם לזכרו של רונאל"
                width={300}
                height={300}
                className="mt-1 h-14 w-auto object-contain"
              />
              <span className="text-[9px] text-sky-100 text-center leading-tight mt-0.5 max-w-[60px]">
                בחסות עמותת חיים ברונאל
              </span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
