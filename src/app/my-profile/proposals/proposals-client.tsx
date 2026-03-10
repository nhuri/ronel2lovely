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
  updateProposalStatus,
  addProposalNote,
  deleteProposal,
} from "@/app/admin/proposals/actions";
import {
  updateProposalStatusByCandidate,
  addProposalNoteByCandidate,
  createProposalByCandidate,
} from "@/app/my-profile/actions";

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

interface Props {
  proposals: Proposal[];
  candidateId: number;
  isAdmin?: boolean;
  candidateInfo?: CandidateBasic;
  activeCandidates?: CandidateBasic[];
}

function getNoteAuthorLabel(note: ProposalNote): string {
  if (note.author_type === "admin") return "מנהל";
  if (note.author_type === "candidate") return "מועמד";
  return note.author_type;
}

function NoImage() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200">
      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </div>
  );
}

export function MyProposalsClient({ proposals, candidateId, isAdmin = false, candidateInfo, activeCandidates }: Props) {
  const [showNewProposal, setShowNewProposal] = useState(false);

  return (
    <div className="space-y-5">
      {/* Create new proposal button - for candidates */}
      {!isAdmin && activeCandidates && candidateInfo && (
        <button
          onClick={() => setShowNewProposal(true)}
          className="w-full py-3 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-2xl transition-colors shadow-sm"
        >
          + הצעה חדשה
        </button>
      )}

      {showNewProposal && candidateInfo && activeCandidates && (
        <NewProposalModal
          candidateInfo={candidateInfo}
          activeCandidates={activeCandidates}
          onClose={() => setShowNewProposal(false)}
        />
      )}

      {proposals.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-1">אין הצעות שידוך כרגע</p>
          <p className="text-sm">כשיהיו הצעות חדשות, הן יופיעו כאן</p>
        </div>
      ) : (
        proposals.map((p) => (
          <ProposalCard
            key={p.id}
            proposal={p}
            candidateId={candidateId}
            isAdmin={isAdmin}
          />
        ))
      )}
    </div>
  );
}

function ProposalCard({
  proposal: p,
  candidateId,
  isAdmin,
}: {
  proposal: Proposal;
  candidateId: number;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const c1 = p.candidate_1;
  const c2 = p.candidate_2;
  const img1 = c1?.image_urls?.[0];
  const img2 = c2?.image_urls?.[0];
  const date = new Date(p.created_at).toLocaleDateString("he-IL");

  const [showEdit, setShowEdit] = useState(false);
  const [newStatus, setNewStatus] = useState(p.status);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);

  const isMeFirst = p.candidate_id_1 === candidateId;
  const allNotes = (p.proposal_notes ?? []).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  async function handleSave() {
    setError(null);
    setSaving(true);

    // Update status if changed
    if (newStatus !== p.status) {
      const result = isAdmin
        ? await updateProposalStatus(p.id, newStatus)
        : await updateProposalStatusByCandidate(p.id, newStatus, candidateId);
      if (result.error) { setError(result.error); setSaving(false); return; }
    }

    // Add note if text is provided
    if (newNote.trim()) {
      const result = isAdmin
        ? await addProposalNote(p.id, newNote, "admin")
        : await addProposalNoteByCandidate(p.id, newNote, candidateId);
      if (result.error) { setError(result.error); setSaving(false); return; }
    }

    setSaving(false);
    setShowEdit(false);
    setNewNote("");
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteProposal(p.id);
    if (result.error) {
      setError(result.error);
      setDeleting(false);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Two candidate photos side by side */}
      <div className="flex h-44">
        <div className="relative w-1/2 bg-gray-100">
          {img1 ? (
            <Image src={img1} alt={c1?.full_name ?? ""} fill className="object-contain" />
          ) : (
            <NoImage />
          )}
          {isMeFirst && !isAdmin && (
            <div className="absolute bottom-1 right-1 bg-sky-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">אני</div>
          )}
        </div>
        <div className="relative w-1/2 bg-gray-100 border-r border-white">
          {img2 ? (
            <Image src={img2} alt={c2?.full_name ?? ""} fill className="object-contain" />
          ) : (
            <NoImage />
          )}
          {!isMeFirst && !isAdmin && (
            <div className="absolute bottom-1 right-1 bg-sky-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">אני</div>
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

        {/* Status badge + date */}
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${getStatusColor(p.status)}`}>
            {getStatusLabel(p.status)}
          </span>
          <span className="text-[11px] text-gray-400">{date}</span>
        </div>

        {/* Notes log */}
        {allNotes.length > 0 && (
          <div className="mb-3">
            {/* Show latest note always */}
            <div className="bg-gray-50 rounded-xl p-2.5 mb-1">
              <p className="text-xs text-gray-600">{allNotes[0].note_text}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${allNotes[0].author_type === "admin" ? "bg-sky-100 text-sky-600" : "bg-emerald-100 text-emerald-600"}`}>
                  {getNoteAuthorLabel(allNotes[0])}
                </span>
                <span className="text-[10px] text-gray-400">
                  {new Date(allNotes[0].created_at).toLocaleString("he-IL")}
                </span>
              </div>
            </div>

            {/* Show/hide older notes */}
            {allNotes.length > 1 && (
              <>
                <button
                  onClick={() => setShowAllNotes(!showAllNotes)}
                  className="text-[11px] text-sky-600 hover:text-sky-700 transition-colors"
                >
                  {showAllNotes ? "הסתר הערות קודמות" : `עוד ${allNotes.length - 1} הערות`}
                </button>
                {showAllNotes && (
                  <div className="space-y-1 mt-1">
                    {allNotes.slice(1).map((note) => (
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
                )}
              </>
            )}
          </div>
        )}

        {/* Legacy notes (from old single-field) */}
        {p.notes && allNotes.length === 0 && (
          <p className="text-xs text-gray-500 mb-2 line-clamp-2">{p.notes}</p>
        )}

        {/* Action buttons - available for both admin and candidate */}
        {!showEdit && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setShowEdit(true)}
              className="flex-1 py-1.5 text-sm font-medium text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors"
            >
              עדכון
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 text-sm text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
              >
                מחק
              </button>
            )}
          </div>
        )}

        {/* Delete confirmation - admin only */}
        {isAdmin && showDeleteConfirm && !showEdit && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-2">
            <p className="text-xs font-medium text-red-700 mb-2">
              האם אתה בטוח שברצונך למחוק הצעה זו?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 rounded-lg transition-colors"
              >
                {deleting ? "מוחק..." : "כן, מחק"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        )}

        {/* Edit form - available for both admin and candidate */}
        {showEdit && (
          <div className="border-t border-gray-100 mt-3 pt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">סטטוס</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all"
              >
                {Object.entries(PROPOSAL_STATUSES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {isTerminalStatus(newStatus) && newStatus !== p.status && (
              <div className="text-amber-700 text-xs bg-amber-50 border border-amber-200 p-2 rounded-xl">
                שים לב: פעולה זו תעדכן את סטטוס שני המועמדים ותקפיא את הפרופילים שלהם.
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">הוספת הערה</label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
                placeholder="כתוב הערה חדשה..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all resize-none"
              />
            </div>

            {error && (
              <div className="text-red-600 text-xs bg-red-50 border border-red-100 p-2 rounded-xl">{error}</div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 rounded-xl transition-colors"
              >
                {saving ? "שומר..." : "שמור"}
              </button>
              <button
                onClick={() => { setShowEdit(false); setNewStatus(p.status); setNewNote(""); setError(null); }}
                className="px-4 py-2 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NewProposalModal({
  candidateInfo,
  activeCandidates,
  onClose,
}: {
  candidateInfo: CandidateBasic;
  activeCandidates: CandidateBasic[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateBasic | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter out self, show only opposite gender, and search
  const oppositeGender = candidateInfo.gender === "זכר" ? "נקבה" : candidateInfo.gender === "נקבה" ? "זכר" : null;
  const filteredCandidates = useMemo(() => {
    return activeCandidates
      .filter((c) => c.id !== candidateInfo.id)
      .filter((c) => !oppositeGender || c.gender === oppositeGender)
      .filter((c) => {
        if (!search.trim()) return true;
        const s = search.trim().toLowerCase();
        return c.full_name.toLowerCase().includes(s) ||
          (c.residence && c.residence.toLowerCase().includes(s));
      });
  }, [activeCandidates, candidateInfo.id, oppositeGender, search]);

  const handleSelect = useCallback((c: CandidateBasic) => {
    setSelectedCandidate(c);
    setSearch("");
    setShowDropdown(false);
  }, []);

  async function handleCreate() {
    if (!selectedCandidate) return;
    setError(null);
    setSaving(true);

    const result = await createProposalByCandidate(selectedCandidate.id, notes || undefined, candidateInfo.id);
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <h3 className="text-lg font-bold text-gray-800 mb-4">הצעה חדשה</h3>

          {/* Me chip */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">צד א׳</label>
            <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2">
              {candidateInfo.image_urls?.[0] && (
                <Image
                  src={candidateInfo.image_urls[0]}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full object-cover"
                />
              )}
              <span className="text-sm font-medium text-sky-700">{candidateInfo.full_name}</span>
              {candidateInfo.age && (
                <span className="text-xs text-sky-500">({candidateInfo.age})</span>
              )}
            </div>
          </div>

          {/* Candidate 2 picker */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">צד ב׳</label>
            {selectedCandidate ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                {selectedCandidate.image_urls?.[0] && (
                  <Image
                    src={selectedCandidate.image_urls[0]}
                    alt=""
                    width={28}
                    height={28}
                    className="rounded-full object-cover"
                  />
                )}
                <span className="text-sm font-medium text-emerald-700">{selectedCandidate.full_name}</span>
                {selectedCandidate.age && (
                  <span className="text-xs text-emerald-500">({selectedCandidate.age})</span>
                )}
                {selectedCandidate.residence && (
                  <span className="text-xs text-emerald-400">{selectedCandidate.residence}</span>
                )}
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="mr-auto text-gray-400 hover:text-red-400 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="חיפוש לפי שם או עיר..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all"
                />
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-10">
                    {filteredCandidates.length === 0 ? (
                      <div className="p-3 text-center text-sm text-gray-400">לא נמצאו תוצאות</div>
                    ) : (
                      filteredCandidates.slice(0, 20).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelect(c)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-right"
                        >
                          <div className="w-7 h-7 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                            {c.image_urls?.[0] ? (
                              <Image src={c.image_urls[0]} alt="" width={28} height={28} className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                {c.full_name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-700 block truncate">{c.full_name}</span>
                            <span className="text-[11px] text-gray-400">
                              {[c.gender === "זכר" ? "ז׳" : c.gender === "נקבה" ? "נ׳" : "", c.age, c.residence].filter(Boolean).join(" · ")}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">הערות (אופציונלי)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="הערות להצעה..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all resize-none"
            />
          </div>

          {error && (
            <div className="text-red-600 text-xs bg-red-50 border border-red-100 p-2 rounded-xl mb-3">{error}</div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!selectedCandidate || saving}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 rounded-xl transition-colors"
            >
              {saving ? "שומר..." : "צור הצעה"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
