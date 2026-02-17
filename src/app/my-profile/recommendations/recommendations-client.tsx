"use client";

import Image from "next/image";
import type { ScoredMatch } from "@/lib/matching";

interface Props {
  matches: ScoredMatch[];
  gender: string;
}

export function RecommendationsClient({ matches, gender }: Props) {
  return (
    <div className="space-y-6" dir="rtl">
      {/* Intro */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <h2 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
          <span className="w-1 h-4 bg-pink-500 rounded-full inline-block" />
          ההתאמות המומלצות שלך
        </h2>
        <p className="text-xs text-gray-500">
          {gender === "נקבה"
            ? "בחרנו עבורך את המועמדים המתאימים ביותר לפרופיל שלך. ההתאמות מתבססות על גיל, רמה דתית, מצב משפחתי ומיקום."
            : "בחרנו עבורך את המועמדות המתאימות ביותר לפרופיל שלך. ההתאמות מתבססות על גיל, רמה דתית, מצב משפחתי ומיקום."}
        </p>
      </div>

      {/* Match cards */}
      {matches.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-1">אין התאמות כרגע</p>
          <p className="text-sm">נחפש עבורך שוב בקרוב</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match, index) => (
            <MatchCard key={match.candidate.id} match={match} rank={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, rank }: { match: ScoredMatch; rank: number }) {
  const c = match.candidate;
  const img = (c.image_urls as string[] | null)?.[0];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex">
        {/* Photo */}
        <div className="relative w-32 sm:w-40 flex-shrink-0 bg-gray-100">
          {img ? (
            <Image
              src={img}
              alt={c.full_name as string}
              fill
              className="object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          {/* Rank badge */}
          <span className="absolute top-2 right-2 bg-pink-500 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-sm">
            {rank}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 p-4">
          <h3 className="font-bold text-gray-800 text-base leading-tight">
            {c.full_name as string}
          </h3>

          <div className="mt-2 space-y-1">
            <InfoRow label="גיל" value={c.age != null ? String(c.age) : "-"} />
            <InfoRow label="עיר" value={(c.residence as string) || "-"} />
            <InfoRow label="רמה דתית" value={(c.religious_level as string) || "-"} />
            <InfoRow label="תעסוקה" value={(c.occupation as string) || "-"} />
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {c.marital_status && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">
                {c.marital_status as string}
              </span>
            )}
            {c.education && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
                {c.education as string}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-400 font-medium w-16 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-700">{value}</span>
    </div>
  );
}
