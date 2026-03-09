"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { sendBulkMessage, type BulkMessageResult } from "./send-message-actions";

type Candidate = {
  id: number;
  full_name: string;
  gender?: string | null;
  phone_number?: string | null;
  email?: string | null;
  image_urls?: string[] | null;
};

export function SendMessageTab({ candidates }: { candidates: Candidate[] }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [genderFilter, setGenderFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BulkMessageResult | null>(null);

  const genders = useMemo(
    () => [...new Set(candidates.map((c) => c.gender).filter(Boolean))] as string[],
    [candidates]
  );

  const filtered = useMemo(
    () => candidates.filter((c) => {
      if (genderFilter && c.gender !== genderFilter) return false;
      if (search && !c.full_name?.includes(search)) return false;
      return true;
    }),
    [candidates, genderFilter, search]
  );

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const someSelected = filtered.some((c) => selected.has(c.id));

  function toggleAll() {
    if (allSelected) {
      const next = new Set(selected);
      filtered.forEach((c) => next.delete(c.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach((c) => next.add(c.id));
      setSelected(next);
    }
  }

  function toggleOne(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function handleSend() {
    if (selected.size === 0) return;
    if (!message.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await sendBulkMessage([...selected], message.trim(), channel);
      setResult(res);
    } finally {
      setSending(false);
    }
  }

  const selectedCount = [...selected].filter((id) =>
    candidates.some((c) => c.id === id)
  ).length;

  return (
    <div dir="rtl" className="space-y-5">
      {/* Channel + Filter row */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-4 items-center">
        {/* Channel Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">ערוץ:</span>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setChannel("sms")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${channel === "sms" ? "bg-sky-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              SMS
            </button>
            <button
              onClick={() => setChannel("email")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${channel === "email" ? "bg-sky-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              מייל
            </button>
          </div>
        </div>

        {/* Gender Filter */}
        {genders.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">מין:</span>
            <select
              value={genderFilter}
              onChange={(e) => { setGenderFilter(e.target.value); setSelected(new Set()); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="">הכל</option>
              {genders.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        )}

        <div className="mr-auto text-sm text-gray-500">
          {selectedCount > 0 ? (
            <span className="font-medium text-sky-600">{selectedCount} נבחרו</span>
          ) : (
            <span>לא נבחרו מועמדים</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Candidates list */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 space-y-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all"
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded accent-sky-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  {allSelected ? "בטל הכל" : "בחר הכל"}
                </span>
              </label>
              <span className="text-xs text-gray-400">{filtered.length} מועמדים</span>
            </div>
          </div>
          <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
            {filtered.map((c) => {
              const img = c.image_urls?.[0];
              const hasContact = channel === "sms" ? !!c.phone_number : !!(c.email && !c.email.endsWith("@sms.ronellovely.co.il"));
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${selected.has(c.id) ? "bg-sky-50" : "hover:bg-gray-50"} ${!hasContact ? "opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleOne(c.id)}
                    disabled={!hasContact}
                    className="w-4 h-4 rounded accent-sky-500 flex-shrink-0"
                  />
                  <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    {img ? (
                      <Image src={img} alt={c.full_name} fill className="object-cover" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-500">
                        {c.full_name?.[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.full_name}</p>
                    {!hasContact && (
                      <p className="text-[10px] text-red-400">{channel === "sms" ? "אין מספר טלפון" : "אין כתובת מייל"}</p>
                    )}
                  </div>
                </label>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">אין מועמדים</p>
            )}
          </div>
        </div>

        {/* Message composer */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">תוכן ההודעה</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder={channel === "sms" ? "כתוב את ההודעה שתישלח ב-SMS..." : "כתוב את ההודעה שתישלח במייל..."}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all resize-none"
            />
            {channel === "sms" && (
              <p className="text-xs text-gray-400 mt-1.5">{message.length} תווים</p>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={sending || selected.size === 0 || !message.trim()}
            className="w-full py-3 text-base font-semibold text-white bg-sky-500 hover:bg-sky-600 active:bg-sky-700 disabled:bg-sky-300 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
          >
            {sending
              ? "שולח..."
              : `שלח ${channel === "sms" ? "SMS" : "מייל"} ל-${selectedCount} מועמדים`}
          </button>

          {/* Results */}
          {result && (
            <div className={`rounded-2xl border p-4 space-y-2 ${result.failed === 0 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
              <p className="text-sm font-bold text-gray-800">תוצאות שליחה</p>
              <div className="flex gap-4 text-sm">
                {result.sent > 0 && (
                  <span className="text-green-700">✓ {result.sent} נשלחו בהצלחה</span>
                )}
                {result.skipped > 0 && (
                  <span className="text-gray-500">◦ {result.skipped} דולגו (אין {channel === "sms" ? "טלפון" : "מייל"})</span>
                )}
                {result.failed > 0 && (
                  <span className="text-red-600">✕ {result.failed} נכשלו</span>
                )}
              </div>
              {result.errors.length > 0 && (
                <details className="text-xs text-red-600">
                  <summary className="cursor-pointer font-medium">פרטי שגיאות</summary>
                  <ul className="mt-1 space-y-0.5 pr-3">
                    {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
