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
          {/* Logo — clickable, links to donation page + desktop links below */}
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
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
            {/* Desktop only: stacked links below logo */}
            <div className="hidden lg:flex flex-col gap-0.5 items-end">
              <a href="/VID-20260429-WA0055.mp4" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-white text-[11px] font-medium hover:text-sky-200 transition-colors">
                <span className="w-3.5 h-3.5 rounded-full bg-white/20 flex items-center justify-center text-[8px] flex-shrink-0">▶</span>
                סרטון הסבר
              </a>
              <a href="https://chaim-beronel.org/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-white/80 hover:text-white text-[11px] transition-colors">
                <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                אתר זיכרון
              </a>
              <a href="https://www.instagram.com/remember_ronel?igsh=ZW80bjE3bnpvaXJ1" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-white/80 hover:text-white text-[11px] transition-colors">
                <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                אינסטגרם
              </a>
              <a href="https://www.tiktok.com/@remember_ronel?_r=1&_t=ZS-95ztIJ4zEzV" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-white/80 hover:text-white text-[11px] transition-colors">
                <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1-.06z"/>
                </svg>
                טיקטוק
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
