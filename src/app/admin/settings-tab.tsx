"use client";

import { useState } from "react";
import {
  saveMaxRecommendations,
  saveFollowupDelays,
  FOLLOWUP_DELAY_OPTIONS,
  type FollowupDelay,
} from "./settings-actions";

type Props = {
  initialValue: number | "all";
  initialFollowupFirst: FollowupDelay;
  initialFollowupSecond: FollowupDelay;
};

export function SettingsTab({ initialValue, initialFollowupFirst, initialFollowupSecond }: Props) {
  // ── Max recommendations ──────────────────────────────────────────────────
  const [mode, setMode] = useState<"count" | "all">(
    initialValue === "all" ? "all" : "count"
  );
  const [count, setCount] = useState<number>(
    initialValue === "all" ? 6 : (initialValue as number)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    const value = mode === "all" ? "all" : count;
    const res = await saveMaxRecommendations(value);
    setSaving(false);
    if (res.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(res.error ?? "שגיאה");
    }
  };

  // ── Follow-up email delays ───────────────────────────────────────────────
  const [firstDelay, setFirstDelay] = useState<FollowupDelay>(initialFollowupFirst);
  const [secondDelay, setSecondDelay] = useState<FollowupDelay>(initialFollowupSecond);
  const [savingDelays, setSavingDelays] = useState(false);
  const [savedDelays, setSavedDelays] = useState(false);
  const [delayError, setDelayError] = useState<string | null>(null);

  const handleSaveDelays = async () => {
    setSavingDelays(true);
    setSavedDelays(false);
    setDelayError(null);
    const res = await saveFollowupDelays(firstDelay, secondDelay);
    setSavingDelays(false);
    if (res.success) {
      setSavedDelays(true);
      setTimeout(() => setSavedDelays(false), 3000);
    } else {
      setDelayError(res.error ?? "שגיאה");
    }
  };

  return (
    <div className="max-w-lg space-y-5" dir="rtl">
      {/* Max recommendations */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-800 mb-1">הגדרות המלצות</h2>
        <p className="text-xs text-gray-400 mb-5">
          שליטה בכמה התאמות מומלצות יוצגו לכל מועמד בדף "הצעות מומלצות"
        </p>

        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="rec_mode"
              checked={mode === "count"}
              onChange={() => setMode("count")}
              className="mt-0.5 w-4 h-4 accent-sky-500 flex-shrink-0"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700">מספר קבוע</span>
              <p className="text-xs text-gray-400 mt-0.5">הצג רק את ה-N ההתאמות הטובות ביותר</p>
              {mode === "count" && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={count}
                    onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-sky-400 bg-gray-50"
                  />
                  <span className="text-xs text-gray-500">התאמות לכל מועמד</span>
                </div>
              )}
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="rec_mode"
              checked={mode === "all"}
              onChange={() => setMode("all")}
              className="mt-0.5 w-4 h-4 accent-sky-500 flex-shrink-0"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">הצג הכל</span>
              <p className="text-xs text-gray-400 mt-0.5">
                הצג את כל המועמדים הרלוונטיים (לפי גיל, רמה דתית, סטטוס וכו')
              </p>
            </div>
          </label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? "שומר..." : "שמור"}
          </button>
          {saved && <span className="text-sm text-emerald-600 font-medium">✓ נשמר בהצלחה</span>}
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>

        <div className="mt-4 bg-sky-50 border border-sky-100 rounded-xl p-3">
          <p className="text-xs text-sky-700 leading-relaxed">
            <strong>ברירת מחדל:</strong> 6 התאמות. השינוי ייכנס לתוקף מיידית עבור כל המועמדים.
          </p>
        </div>
      </div>

      {/* Follow-up email timing */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-800 mb-1">תזמון מיילי מעקב</h2>
        <p className="text-xs text-gray-400 mb-5">
          קבע מתי יישלחו מיילי המעקב האוטומטיים לאחר אישור הצעה
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              מייל מעקב ראשון — "האם נפגשתם?"
            </label>
            <p className="text-xs text-gray-400 mb-2">
              נשלח לאחר שסטטוס ההצעה עבר ל"התחלנו להפגש"
            </p>
            <select
              value={firstDelay}
              onChange={(e) => setFirstDelay(e.target.value as FollowupDelay)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-gray-50"
            >
              {FOLLOWUP_DELAY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              מייל מעקב שני — "איך הולך?"
            </label>
            <p className="text-xs text-gray-400 mb-2">
              נשלח לאחר שסטטוס ההצעה עבר ל"דייטים מתקדם"
            </p>
            <select
              value={secondDelay}
              onChange={(e) => setSecondDelay(e.target.value as FollowupDelay)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-gray-50"
            >
              {FOLLOWUP_DELAY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleSaveDelays}
            disabled={savingDelays}
            className="px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {savingDelays ? "שומר..." : "שמור"}
          </button>
          {savedDelays && <span className="text-sm text-emerald-600 font-medium">✓ נשמר בהצלחה</span>}
          {delayError && <span className="text-sm text-red-500">{delayError}</span>}
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3">
          <p className="text-xs text-amber-700 leading-relaxed">
            <strong>שים לב:</strong> הגדרת "דקה אחת" מיועדת לבדיקה בלבד. ברירת מחדל: שבוע / חודש.
          </p>
        </div>
      </div>
    </div>
  );
}
