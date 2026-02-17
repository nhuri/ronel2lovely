"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  PROPOSAL_STATUSES,
  getStatusLabel,
  getStatusColor,
  isTerminalStatus,
} from "@/lib/proposals";
import {
  createProposal,
  updateProposalStatus,
  addProposalNote,
  updateProposalNotes,
  deleteProposal,
} from "./actions";

interface CandidateBasic {
  id: number;
  full_name: string;
  image_urls: string[] | null;
  gender: string | null;
  age: number | null;
  residence: string | null;
}

interface ProposalNote {
  id: number;
  note_text: string;
  author_type: string;
  created_at: string;
}

interface Proposal {
  id: number;
  candidate_id_1: number;
  candidate_id_2: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  candidate_1: CandidateBasic;
  candidate_2: CandidateBasic;
  proposal_notes?: ProposalNote[];
}

interface CandidateOption {
  id: number;
  full_name: string;
  gender: string | null;
  age: number | null;
  residence: string | null;
  image_urls: string[] | null;
}

interface Props {
  proposals: Proposal[];
  candidates: CandidateOption[];
}

export function ProposalsClient({ proposals, candidates }: Props) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);

  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const name1 = p.candidate_1?.full_name?.toLowerCase() ?? "";
        const name2 = p.candidate_2?.full_name?.toLowerCase() ?? "";
        if (!name1.includes(s) && !name2.includes(s)) return false;
      }
      return true;
    });
  }, [proposals, statusFilter, search]);

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              חיפוש לפי שם מועמד
            </label>
            <input
              type="text"
              placeholder="הקלד שם..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all"
            />
          </div>
          <div className="min-w-[180px]">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              סטטוס
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all"
            >
              <option value="">הכל</option>
              {Object.entries(PROPOSAL_STATUSES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-xl transition-colors"
          >
            + הצעה חדשה
          </button>
        </div>
      </div>

      {/* Proposals Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-1">לא נמצאו הצעות</p>
          <p className="text-sm">צור הצעת שידוך חדשה</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              onEdit={() => setEditingProposal(p)}
            />
          ))}
        </div>
      )}

      {/* New Proposal Modal */}
      {showNewModal && (
        <NewProposalModal
          candidates={candidates}
          onClose={() => setShowNewModal(false)}
          onCreated={() => {
            setShowNewModal(false);
            router.refresh();
          }}
        />
      )}

      {/* Edit Proposal Modal */}
      {editingProposal && (
        <EditProposalModal
          proposal={editingProposal}
          onClose={() => setEditingProposal(null)}
          onUpdated={() => {
            setEditingProposal(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

/* ──────────────── Helpers ──────────────── */

function getNoteAuthorLabel(note: ProposalNote): string {
  if (note.author_type === "admin") return "מנהל";
  if (note.author_type === "candidate") return "מועמד";
  return note.author_type;
}

/* ──────────────── Proposal Card ──────────────── */

function ProposalCard({
  proposal: p,
  onEdit,
}: {
  proposal: Proposal;
  onEdit: () => void;
}) {
  const c1 = p.candidate_1;
  const c2 = p.candidate_2;
  const img1 = c1?.image_urls?.[0];
  const img2 = c2?.image_urls?.[0];
  const date = new Date(p.created_at).toLocaleDateString("he-IL");
  const allNotes = (p.proposal_notes ?? []).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const latestNote = allNotes[0];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Two candidate photos side by side */}
      <div className="flex h-44">
        <div className="relative w-1/2 bg-gray-100">
          {img1 ? (
            <Image
              src={img1}
              alt={c1?.full_name ?? ""}
              fill
              className="object-cover object-top"
            />
          ) : (
            <NoImage />
          )}
        </div>
        <div className="relative w-1/2 bg-gray-100 border-r border-white">
          {img2 ? (
            <Image
              src={img2}
              alt={c2?.full_name ?? ""}
              fill
              className="object-cover object-top"
            />
          ) : (
            <NoImage />
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Names */}
        <div className="flex justify-between items-start mb-2">
          <div className="text-sm font-bold text-gray-800 truncate flex-1">
            {c1?.full_name ?? "—"}
          </div>
          <span className="text-gray-300 mx-2">&amp;</span>
          <div className="text-sm font-bold text-gray-800 truncate flex-1 text-left">
            {c2?.full_name ?? "—"}
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center justify-between mb-3">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${getStatusColor(p.status)}`}
          >
            {getStatusLabel(p.status)}
          </span>
          <span className="text-[11px] text-gray-400">{date}</span>
        </div>

        {/* Latest note preview */}
        {latestNote ? (
          <div className="bg-gray-50 rounded-xl p-2 mb-3">
            <p className="text-xs text-gray-600 line-clamp-2">{latestNote.note_text}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${latestNote.author_type === "admin" ? "bg-sky-100 text-sky-600" : "bg-emerald-100 text-emerald-600"}`}>
                {getNoteAuthorLabel(latestNote)}
              </span>
              {allNotes.length > 1 && (
                <span className="text-[10px] text-gray-400">+{allNotes.length - 1} הערות</span>
              )}
            </div>
          </div>
        ) : p.notes ? (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2">{p.notes}</p>
        ) : null}

        <button
          onClick={onEdit}
          className="w-full py-2 text-sm font-medium text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors"
        >
          עדכן סטטוס
        </button>
      </div>
    </div>
  );
}

/* ──────────────── No Image Placeholder ──────────────── */

function NoImage() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200">
      <svg
        className="w-12 h-12 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    </div>
  );
}

/* ──────────────── Candidate Avatar ──────────────── */

function CandidateAvatar({ src, name, size = 32 }: { src?: string | null; name: string; size?: number }) {
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

/* ──────────────── Candidate Picker (Autocomplete) ──────────────── */

function CandidatePicker({
  label,
  candidates,
  selected,
  onSelect,
  excludeId,
}: {
  label: string;
  candidates: CandidateOption[];
  selected: CandidateOption | null;
  onSelect: (c: CandidateOption | null) => void;
  excludeId?: number;
}) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showFullList, setShowFullList] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const available = useMemo(
    () => candidates.filter((c) => c.id !== excludeId),
    [candidates, excludeId]
  );

  const searchResults = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return available.filter((c) => c.full_name.toLowerCase().includes(q));
  }, [available, query]);

  const handleSelect = useCallback(
    (c: CandidateOption) => {
      onSelect(c);
      setQuery("");
      setShowDropdown(false);
      setShowFullList(false);
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    onSelect(null);
    setQuery("");
  }, [onSelect]);

  // Close dropdown on outside click
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
          <CandidateAvatar src={selected.image_urls?.[0]} name={selected.full_name} size={28} />
          <span className="text-sm font-medium text-gray-800 flex-1">
            {selected.full_name}
            {selected.age ? ` (${selected.age})` : ""}
            {selected.residence ? ` - ${selected.residence}` : ""}
          </span>
          <button
            type="button"
            onClick={handleClear}
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
      {/* Search input */}
      <input
        type="text"
        placeholder="הקלד לפחות 2 אותיות לחיפוש..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={handleBlur}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all"
      />

      {/* Search results dropdown */}
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
                <CandidateAvatar src={c.image_urls?.[0]} name={c.full_name} size={28} />
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

      {/* Expandable full list */}
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setShowFullList(!showFullList)}
          className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-colors"
        >
          <svg
            className={`w-3 h-3 transition-transform ${showFullList ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {showFullList ? "הסתר רשימה מלאה" : "בחירה מרשימה מלאה"}
          {` (${available.length})`}
        </button>
        {showFullList && (
          <div className="mt-1.5 max-h-56 overflow-y-auto border border-gray-200 rounded-xl bg-white">
            {available.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-sky-50 transition-colors border-b border-gray-50 last:border-b-0 text-right"
              >
                <CandidateAvatar src={c.image_urls?.[0]} name={c.full_name} size={28} />
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

/* ──────────────── Gender Filter Helper ──────────────── */

function getOppositeGender(gender: string | null): string | null {
  if (gender === "זכר") return "נקבה";
  if (gender === "נקבה") return "זכר";
  return null;
}

/* ──────────────── New Proposal Modal ──────────────── */

function NewProposalModal({
  candidates,
  onClose,
  onCreated,
}: {
  candidates: CandidateOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [selected1, setSelected1] = useState<CandidateOption | null>(null);
  const [selected2, setSelected2] = useState<CandidateOption | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // After selecting candidate 1, filter candidate 2 to opposite gender
  const candidates2 = useMemo(() => {
    if (!selected1?.gender) return candidates;
    const opposite = getOppositeGender(selected1.gender);
    if (!opposite) return candidates;
    return candidates.filter((c) => c.gender === opposite);
  }, [candidates, selected1]);

  // Clear candidate 2 if gender filter changes and selected2 no longer valid
  const handleSelect1 = useCallback(
    (c: CandidateOption | null) => {
      setSelected1(c);
      if (c && selected2) {
        const opposite = getOppositeGender(c.gender);
        if (opposite && selected2.gender !== opposite) {
          setSelected2(null);
        }
      }
    },
    [selected2]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selected1 || !selected2) {
      setError("יש לבחור שני מועמדים");
      return;
    }

    setSaving(true);
    const result = await createProposal(
      selected1.id,
      selected2.id,
      notes || undefined
    );

    if (result.error) {
      setError(result.error);
      setSaving(false);
    } else {
      onCreated();
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">הצעה חדשה</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors text-lg"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <CandidatePicker
            label={selected1?.gender === "נקבה" ? "מועמדת 1" : "מועמד 1"}
            candidates={candidates}
            selected={selected1}
            onSelect={handleSelect1}
            excludeId={selected2?.id}
          />

          <CandidatePicker
            label={selected1?.gender === "נקבה" ? "מועמד 2" : selected1?.gender === "זכר" ? "מועמדת 2" : "מועמד 2"}
            candidates={candidates2}
            selected={selected2}
            onSelect={setSelected2}
            excludeId={selected1?.id}
          />


          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              הערות
            </label>
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
  );
}

/* ──────────────── Edit Proposal Modal ──────────────── */

function EditProposalModal({
  proposal,
  onClose,
  onUpdated,
}: {
  proposal: Proposal;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [newStatus, setNewStatus] = useState(proposal.status);
  const [newNote, setNewNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const statusOptions = Object.entries(PROPOSAL_STATUSES);
  const allNotes = (proposal.proposal_notes ?? []).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    // Update status if changed
    if (newStatus !== proposal.status) {
      const result = await updateProposalStatus(proposal.id, newStatus);
      if (result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }
    }

    // Add note if provided
    if (newNote.trim()) {
      const result = await addProposalNote(proposal.id, newNote, "admin");
      if (result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }
    }

    onUpdated();
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteProposal(proposal.id);
    if (result.error) {
      setError(result.error);
      setDeleting(false);
    } else {
      onUpdated();
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">עדכון הצעה</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors text-lg"
          >
            &times;
          </button>
        </div>

        {/* Candidate names */}
        <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {proposal.candidate_1?.full_name}
          </span>
          <span className="text-gray-300 mx-2">&amp;</span>
          <span className="text-sm font-medium text-gray-700">
            {proposal.candidate_2?.full_name}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current status */}
          <div className="text-xs text-gray-400">
            סטטוס נוכחי:{" "}
            <span
              className={`px-2 py-0.5 rounded-full font-medium ${getStatusColor(proposal.status)}`}
            >
              {getStatusLabel(proposal.status)}
            </span>
          </div>

          {/* New status */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              סטטוס חדש
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all"
            >
              {statusOptions.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Warning for terminal statuses */}
          {isTerminalStatus(newStatus) && newStatus !== proposal.status && (
            <div className="text-amber-700 text-sm bg-amber-50 border border-amber-200 p-3 rounded-xl">
              שים לב: פעולה זו תעדכן את סטטוס שני המועמדים ל-
              {newStatus === "7" ? "\"התארסו\"" : "\"התחתנו\""} ותקפיא את
              הפרופילים שלהם.
            </div>
          )}

          {/* Add note */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              הוספת הערה
            </label>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={2}
              placeholder="כתוב הערה חדשה..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Notes log */}
          {allNotes.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                הערות קודמות ({allNotes.length})
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {allNotes.map((note) => (
                  <div key={note.id} className="bg-gray-50 rounded-xl p-2.5">
                    <p className="text-xs text-gray-600">{note.note_text}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${note.author_type === "admin" ? "bg-sky-100 text-sky-600" : "bg-emerald-100 text-emerald-600"}`}>
                        {getNoteAuthorLabel(note)}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(note.created_at).toLocaleString("he-IL")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legacy notes */}
          {proposal.notes && allNotes.length === 0 && (
            <div className="bg-gray-50 rounded-xl p-2.5">
              <p className="text-xs text-gray-500">{proposal.notes}</p>
            </div>
          )}

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
            {saving ? "שומר..." : "שמור שינויים"}
          </button>

          {/* Delete proposal */}
          <div className="pt-2 border-t border-gray-100">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                מחק הצעה
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs font-medium text-red-700 mb-2">
                  האם אתה בטוח שברצונך למחוק הצעה זו?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 rounded-lg transition-colors"
                  >
                    {deleting ? "מוחק..." : "כן, מחק"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
