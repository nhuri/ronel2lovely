"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";

interface Candidate {
  id: number;
  full_name: string;
  gender: string | null;
  birth_date: string | null;
  age: number | null;
  residence: string | null;
  marital_status: string | null;
  children_count: number | null;
  religious_level: string | null;
  height: number | null;
  education: string | null;
  occupation: string | null;
  about_me: string | null;
  looking_for: string | null;
  phone_number: string;
  image_urls: string[] | null;
  contact_person: string | null;
  email: string | null;
  system_notes: string | null;
  availability_status: string | null;
}

interface Props {
  candidates: Candidate[];
  genders: string[];
  religiousLevels: string[];
}

export function CandidatesGrid({
  candidates,
  genders,
  religiousLevels,
}: Props) {
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [religiousFilter, setReligiousFilter] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (search && !c.full_name?.includes(search)) return false;
      if (genderFilter && c.gender !== genderFilter) return false;
      if (religiousFilter && c.religious_level !== religiousFilter) return false;
      if (ageMin && (c.age == null || c.age < Number(ageMin))) return false;
      if (ageMax && (c.age == null || c.age > Number(ageMax))) return false;
      return true;
    });
  }, [candidates, search, genderFilter, religiousFilter, ageMin, ageMax]);

  const hasActiveFilters =
    search || genderFilter || religiousFilter || ageMin || ageMax;

  function clearFilters() {
    setSearch("");
    setGenderFilter("");
    setReligiousFilter("");
    setAgeMin("");
    setAgeMax("");
  }

  const selected = selectedId
    ? candidates.find((c) => c.id === selectedId) ?? null
    : null;

  return (
    <>
      {/* ── Filters Bar ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-400 mb-1">חיפוש לפי שם</label>
            <input type="text" placeholder="הקלד שם..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all" />
          </div>
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-gray-400 mb-1">מין</label>
            <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all">
              <option value="">הכל</option>
              {genders.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-gray-400 mb-1">רמה דתית</label>
            <select value={religiousFilter} onChange={(e) => setReligiousFilter(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all">
              <option value="">הכל</option>
              {religiousLevels.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-end">
            <div className="w-[80px]">
              <label className="block text-xs font-medium text-gray-400 mb-1">גיל מ-</label>
              <input type="number" placeholder="18" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all" />
            </div>
            <div className="w-[80px]">
              <label className="block text-xs font-medium text-gray-400 mb-1">עד</label>
              <input type="number" placeholder="99" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all" />
            </div>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="px-4 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">נקה סינון</button>
          )}
        </div>
        {hasActiveFilters && (
          <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">מציג {filtered.length} מתוך {candidates.length} מועמדים</p>
        )}
      </div>

      {/* ── Cards Grid ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-1">לא נמצאו מועמדים</p>
          <p className="text-sm">נסה לשנות את הסינון</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((c) => (
            <CandidateCard key={c.id} candidate={c} onView={() => setSelectedId(c.id)} />
          ))}
        </div>
      )}

      {/* ── Profile Modal ── */}
      {selected && <ProfileModal candidate={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
}

/* ──────────────── Image Carousel ──────────────── */

function ImageCarousel({
  urls,
  alt,
  className,
  rounded,
}: {
  urls: string[];
  alt: string;
  className?: string;
  rounded?: string;
}) {
  const [idx, setIdx] = useState(0);
  const total = urls.length;

  const prev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIdx((i) => (i - 1 + total) % total);
    },
    [total]
  );
  const next = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIdx((i) => (i + 1) % total);
    },
    [total]
  );

  return (
    <div className={`relative group/carousel ${className ?? ""}`}>
      <Image
        src={urls[idx]}
        alt={alt}
        fill
        className={`object-contain transition-opacity duration-200 ${rounded ?? ""}`}
      />

      {total > 1 && (
        <>
          {/* Arrows */}
          <button
            onClick={next}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            onClick={prev}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {urls.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === idx ? "bg-white w-4" : "bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>

          {/* Counter */}
          <span className="absolute top-2 left-2 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
            {idx + 1}/{total}
          </span>
        </>
      )}
    </div>
  );
}

/* ──────────────── No Image Placeholder ──────────────── */

function NoImage({ className, rounded }: { className?: string; rounded?: string }) {
  return (
    <div className={`flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200 ${className ?? ""} ${rounded ?? ""}`}>
      <svg className="w-20 h-20 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </div>
  );
}

/* ──────────────── Card ──────────────── */

function CandidateCard({ candidate: c, onView }: { candidate: Candidate; onView: () => void }) {
  const imgs = c.image_urls ?? [];

  return (
    <div onClick={onView} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      <div className="relative w-full aspect-square bg-gray-100">
        {imgs.length > 0 ? (
          <ImageCarousel urls={imgs} alt={c.full_name} className="w-full h-full" />
        ) : (
          <NoImage className="absolute inset-0" />
        )}

        {c.age != null && (
          <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm z-10">
            {c.age}
          </span>
        )}
        {c.availability_status && (
          <span className="absolute top-2 left-2 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
            {c.availability_status}
          </span>
        )}
      </div>

      <div className="p-4">
        <a
          href={`/admin/candidate/${c.id}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mb-3 block w-full py-1.5 text-center text-xs font-medium text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
        >
          לאזור האישי של המועמד
        </a>

        <h3 className="font-bold text-gray-800 text-lg leading-tight">{c.full_name}</h3>
        {c.residence && <p className="text-sm text-gray-400 mt-0.5">{c.residence}</p>}

        <div className="flex flex-wrap gap-1.5 mt-3">
          {c.gender && <Tag text={c.gender} color="purple" />}
          {c.religious_level && <Tag text={c.religious_level} color="emerald" />}
          {c.marital_status && <Tag text={c.marital_status} color="amber" />}
        </div>
      </div>
    </div>
  );
}

/* ──────────────── Tag ──────────────── */

const tagColors = {
  sky: "bg-sky-50 text-sky-700",
  purple: "bg-purple-50 text-purple-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
};

function Tag({ text, color }: { text: string; color: keyof typeof tagColors }) {
  return <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${tagColors[color]}`}>{text}</span>;
}

/* ──────────────── Profile Modal ──────────────── */

function ProfileModal({ candidate: c, onClose }: { candidate: Candidate; onClose: () => void }) {
  const imgs = c.image_urls ?? [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        {/* ── Header: Carousel or fallback ── */}
        <div className="relative">
          {imgs.length > 0 ? (
            <>
              <div className="bg-black rounded-t-3xl">
                <ImageCarousel
                  urls={imgs}
                  alt={c.full_name}
                  className="w-full h-80 sm:h-[28rem]"
                  rounded="rounded-t-3xl"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent rounded-t-3xl pointer-events-none" />
            </>
          ) : (
            <div className="w-full h-48 bg-gradient-to-bl from-sky-400 to-sky-600 rounded-t-3xl" />
          )}

          {/* Close */}
          <button onClick={onClose} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center transition-colors z-20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {/* Name overlay */}
          <div className="absolute bottom-0 right-0 left-0 p-6 z-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">{c.full_name}</h2>
            <p className="text-white/80 text-sm mt-1 drop-shadow">
              {[c.gender, c.age ? `${c.gender === "נקבה" ? "בת" : "בן"} ${c.age}` : null, c.residence].filter(Boolean).join(" | ")}
            </p>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap gap-2">
            {c.gender && <Tag text={c.gender} color="purple" />}
            {c.religious_level && <Tag text={c.religious_level} color="emerald" />}
            {c.marital_status && <Tag text={c.marital_status} color="amber" />}
            {c.age != null && <Tag text={`גיל ${c.age}`} color="sky" />}
            {c.height && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">{c.height} ס&quot;מ</span>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-gray-50 rounded-2xl p-5">
            <Field label="מצב משפחתי" value={c.marital_status} />
            <Field label="ילדים" value={c.children_count != null ? String(c.children_count) : null} />
            <Field label="רמה דתית" value={c.religious_level} />
            <Field label="גובה" value={c.height ? `${c.height} ס"מ` : null} />
            <Field label="השכלה" value={c.education} />
            <Field label="עיסוק" value={c.occupation} />
            <Field label="תאריך לידה" value={c.birth_date} />
            <Field label="טלפון" value={c.phone_number} dir="ltr" />
            <Field label="גיל" value={c.age != null ? String(c.age) : null} />
            <Field label="איש קשר" value={c.contact_person} />
            {c.email && <Field label="אימייל" value={c.email} dir="ltr" />}
          </div>

          {c.about_me && (
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <span className="w-1 h-4 bg-sky-500 rounded-full inline-block" />תיאור אישי
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed bg-sky-50/50 border border-sky-100 rounded-xl p-4">{c.about_me}</p>
            </div>
          )}

          {c.looking_for && (
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <span className="w-1 h-4 bg-pink-500 rounded-full inline-block" />{c.gender === "נקבה" ? "מה מחפשת" : "מה מחפש"}
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed bg-pink-50/50 border border-pink-100 rounded-xl p-4">{c.looking_for}</p>
            </div>
          )}

          {(() => {
            const filteredNotes = c.system_notes
              ?.replace("תאריך לידה משוער על פי גיל בעת ההרשמה", "")
              .trim();
            return filteredNotes ? (
              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                {filteredNotes}
              </div>
            ) : null;
          })()}

          <button onClick={onClose} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl transition-colors">סגור</button>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */

function Field({ label, value, dir }: { label: string; value: string | null | undefined; dir?: string }) {
  return (
    <div>
      <span className="text-[11px] text-gray-400 font-medium block">{label}</span>
      <p className="text-sm font-semibold text-gray-800 mt-0.5" dir={dir}>{value || "-"}</p>
    </div>
  );
}
