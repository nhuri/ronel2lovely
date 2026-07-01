import Link from "next/link";
import type { ScoredMatch } from "@/lib/matching";

interface PrefFilters {
  allowed_religious_levels?: string[];
  min_age?: number;
  max_age?: number;
}

interface Props {
  matches: ScoredMatch[];
  unavailableMatches: ScoredMatch[];
  rejectedMatches: ScoredMatch[];
  totalPool: number;
  filters: PrefFilters;
}

function MatchCard({ match, rank, dim }: { match: ScoredMatch; rank: number; dim?: boolean }) {
  const c = match.candidate;
  const photo = (c.image_urls as string[] | null)?.[0];

  return (
    <Link
      href={`/admin/candidate/${c.id as number}`}
      className={`flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow ${dim ? "opacity-55" : ""}`}
    >
      <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
        {rank}
      </div>
      <div className="w-10 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={c.full_name as string} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{c.full_name as string}</p>
        <p className="text-xs text-gray-500 truncate">
          {[c.age ? `גיל ${c.age}` : null, c.residence, c.religious_level].filter(Boolean).join(" · ")}
        </p>
      </div>
      <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2 py-1 rounded-full flex-shrink-0 whitespace-nowrap">
        {match.score} נק׳
      </span>
    </Link>
  );
}

export function AdminRecommendationsSection({ matches, unavailableMatches, rejectedMatches, totalPool, filters }: Props) {
  const hasFilters =
    (filters.allowed_religious_levels?.length ?? 0) > 0 ||
    !!filters.min_age ||
    !!filters.max_age;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        <span className="text-gray-700">
          <span className="font-semibold text-sky-600">{matches.length}</span> הצעות מוצגות למועמד
        </span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-500">{totalPool} מועמדים זמינים בסה״כ</span>
        {unavailableMatches.length > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">{unavailableMatches.length} תפוסים</span>
          </>
        )}
        {rejectedMatches.length > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">{rejectedMatches.length} נדחו ע״י המועמד</span>
          </>
        )}
      </div>

      {/* Active filters */}
      {hasFilters && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs font-medium text-amber-800 mb-1.5">פילטרים פעילים של המועמד:</p>
          <div className="flex flex-wrap gap-1.5">
            {filters.allowed_religious_levels?.map((l) => (
              <span key={l} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {l}
              </span>
            ))}
            {filters.min_age && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                גיל מינ׳: {filters.min_age}
              </span>
            )}
            {filters.max_age && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                גיל מקס׳: {filters.max_age}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Top matches */}
      {matches.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">אין הצעות מומלצות כרגע</div>
      ) : (
        <div className="space-y-2">
          {matches.map((m, i) => (
            <MatchCard key={m.candidate.id as number} match={m} rank={i + 1} />
          ))}
        </div>
      )}

      {/* Unavailable (תפוס) */}
      {unavailableMatches.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2 px-1">
            תפוסים – לא מוצגים למועמד ({unavailableMatches.length})
          </h3>
          <div className="space-y-2">
            {unavailableMatches.map((m, i) => (
              <MatchCard key={m.candidate.id as number} match={m} rank={i + 1} dim />
            ))}
          </div>
        </div>
      )}

      {/* Rejected */}
      {rejectedMatches.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2 px-1">
            נדחו על ידי המועמד ({rejectedMatches.length})
          </h3>
          <div className="space-y-2">
            {rejectedMatches.map((m, i) => (
              <MatchCard key={m.candidate.id as number} match={m} rank={i + 1} dim />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
