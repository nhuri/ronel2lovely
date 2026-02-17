"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createProposal } from "@/app/admin/proposals/actions";

interface CandidateOption {
  id: number;
  full_name: string;
  gender: string | null;
  age: number | null;
  residence: string | null;
  image_urls: string[] | null;
}

interface Props {
  preselected: CandidateOption;
  candidates: CandidateOption[];
}

function getOppositeGender(gender: string | null): string | null {
  if (gender === "זכר") return "נקבה";
  if (gender === "נקבה") return "זכר";
  return null;
}

function CandidateAvatar({ src, name, size = 28 }: { src?: string | null; name: string; size?: number }) {
  return src ? (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-full bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </div>
  );
}

export function CreateProposalButton({ preselected, candidates }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected2, setSelected2] = useState<CandidateOption | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Filter to opposite gender
  const filteredCandidates = useMemo(() => {
    const opposite = getOppositeGender(preselected.gender);
    const filtered = opposite
      ? candidates.filter((c) => c.gender === opposite)
      : candidates;
    return filtered.filter((c) => c.id !== preselected.id);
  }, [candidates, preselected]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selected2) {
      setError("יש לבחור מועמד נוסף");
      return;
    }
    setSaving(true);
    const result = await createProposal(preselected.id, selected2.id, notes || undefined);
    if (result.error) {
      setError(result.error);
      setSaving(false);
    } else {
      setOpen(false);
      setSelected2(null);
      setNotes("");
      setSaving(false);
      router.refresh();
    }
  }

  function handleClose() {
    setOpen(false);
    setSelected2(null);
    setNotes("");
    setError(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors"
      >
        + הצעה חדשה
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          dir="rtl"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">הצעה חדשה</h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Candidate 1 - Pre-selected */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {preselected.gender === "נקבה" ? "מועמדת 1" : "מועמד 1"}
                </label>
                <div className="flex items-center gap-2 px-3 py-2 border border-sky-200 bg-sky-50 rounded-xl">
                  <CandidateAvatar src={preselected.image_urls?.[0]} name={preselected.full_name} />
                  <span className="text-sm font-medium text-gray-800">
                    {preselected.full_name}
                    {preselected.age ? ` (${preselected.age})` : ""}
                    {preselected.residence ? ` - ${preselected.residence}` : ""}
                  </span>
                </div>
              </div>

              {/* Candidate 2 - Picker */}
              <CandidatePicker
                label={preselected.gender === "נקבה" ? "מועמד 2" : "מועמדת 2"}
                candidates={filteredCandidates}
                selected={selected2}
                onSelect={setSelected2}
              />

              {preselected.gender && (
                <div className="text-[11px] text-sky-600 bg-sky-50 px-3 py-1.5 rounded-lg">
                  מציג מועמדים מהמין הנגדי ({getOppositeGender(preselected.gender)}) בלבד
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">הערות</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="הערות להצעה..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all resize-none"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 transition-all shadow-sm text-base"
              >
                {saving ? "יוצר..." : "צור הצעה"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Candidate Picker ── */

function CandidatePicker({
  label,
  candidates,
  selected,
  onSelect,
}: {
  label: string;
  candidates: CandidateOption[];
  selected: CandidateOption | null;
  onSelect: (c: CandidateOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showFullList, setShowFullList] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const searchResults = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return candidates.filter((c) => c.full_name.toLowerCase().includes(q));
  }, [candidates, query]);

  const handleSelect = useCallback(
    (c: CandidateOption) => {
      onSelect(c);
      setQuery("");
      setShowDropdown(false);
      setShowFullList(false);
    },
    [onSelect]
  );

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (wrapperRef.current && !wrapperRef.current.contains(document.activeElement)) {
        setShowDropdown(false);
      }
    }, 150);
  }, []);

  if (selected) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          {label} <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2 px-3 py-2 border border-sky-200 bg-sky-50 rounded-xl">
          <CandidateAvatar src={selected.image_urls?.[0]} name={selected.full_name} />
          <span className="text-sm font-medium text-gray-800 flex-1">
            {selected.full_name}
            {selected.age ? ` (${selected.age})` : ""}
            {selected.residence ? ` - ${selected.residence}` : ""}
          </span>
          <button
            type="button"
            onClick={() => { onSelect(null); setQuery(""); }}
            className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef}>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        placeholder="הקלד לפחות 2 אותיות לחיפוש..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
        onFocus={() => setShowDropdown(true)}
        onBlur={handleBlur}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all"
      />

      {showDropdown && query.length >= 2 && (
        <div className="mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-lg">
          {searchResults.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">לא נמצאו תוצאות</div>
          ) : (
            searchResults.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(c)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-sky-50 transition-colors text-right"
              >
                <CandidateAvatar src={c.image_urls?.[0]} name={c.full_name} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{c.full_name}</div>
                  <div className="text-[11px] text-gray-400 truncate">
                    {c.gender ?? ""}{c.age ? ` · ${c.age}` : ""}{c.residence ? ` · ${c.residence}` : ""}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      <div className="mt-2">
        <button
          type="button"
          onClick={() => setShowFullList(!showFullList)}
          className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-colors"
        >
          <svg className={`w-3 h-3 transition-transform ${showFullList ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {showFullList ? "הסתר רשימה מלאה" : "בחירה מרשימה מלאה"}
          {` (${candidates.length})`}
        </button>
        {showFullList && (
          <div className="mt-1.5 max-h-56 overflow-y-auto border border-gray-200 rounded-xl bg-white">
            {candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-sky-50 transition-colors border-b border-gray-50 last:border-b-0 text-right"
              >
                <CandidateAvatar src={c.image_urls?.[0]} name={c.full_name} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{c.full_name}</div>
                  <div className="text-[11px] text-gray-400 truncate">
                    {c.gender ?? ""}{c.age ? ` · ${c.age}` : ""}{c.residence ? ` · ${c.residence}` : ""}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
