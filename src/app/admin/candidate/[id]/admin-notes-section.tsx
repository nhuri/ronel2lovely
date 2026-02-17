"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addAdminNote } from "./actions";

interface AdminNote {
  id: number;
  note_text: string;
  created_at: string;
}

interface Props {
  candidateId: number;
  notes: AdminNote[];
}

export function AdminNotesSection({ candidateId, notes }: Props) {
  const router = useRouter();
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!noteText.trim()) return;
    setError(null);
    setSaving(true);

    const result = await addAdminNote(candidateId, noteText);
    if (result.error) {
      setError(result.error);
      setSaving(false);
    } else {
      setNoteText("");
      setSaving(false);
      router.refresh();
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
      <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="w-1 h-4 bg-amber-500 rounded-full inline-block" />
        הערות מנהל ({notes.length})
      </h2>

      {/* Add note form */}
      <div className="mb-4">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={2}
          placeholder="כתוב הערה חדשה..."
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent focus:bg-white transition-all resize-none"
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleAdd}
            disabled={saving || !noteText.trim()}
            className="px-4 py-1.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-lg transition-colors"
          >
            {saving ? "שומר..." : "הוסף הערה"}
          </button>
          {error && (
            <span className="text-xs text-red-600">{error}</span>
          )}
        </div>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">אין הערות עדיין</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-amber-50 border border-amber-100 rounded-xl p-3"
            >
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {note.note_text}
              </p>
              <p className="text-[11px] text-amber-600 mt-2">
                {new Date(note.created_at).toLocaleString("he-IL")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
