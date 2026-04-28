import type { AnalyticsStats } from "./analytics-actions";

type StatCardProps = {
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
};

function StatCard({ label, value, sub, color = "sky" }: StatCardProps) {
  const colorMap: Record<string, string> = {
    sky: "bg-sky-50 border-sky-100 text-sky-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    purple: "bg-purple-50 border-purple-100 text-purple-700",
  };
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${colorMap[color] ?? colorMap.sky}`}>
      <span className="text-[11px] font-medium opacity-70">{label}</span>
      <span className="text-3xl font-bold">{value}</span>
      {sub && <span className="text-[11px] opacity-60">{sub}</span>}
    </div>
  );
}

export function AnalyticsTab({ stats }: { stats: AnalyticsStats }) {
  return (
    <div className="space-y-6" dir="rtl">
      {/* Visitors */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">מבקרים באתר</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="מבקרים ייחודיים היום"
            value={stats.uniqueVisitorsToday}
            sub={`${stats.totalVisitsToday} כניסות כולל`}
            color="sky"
          />
          <StatCard
            label="מבקרים ייחודיים השבוע"
            value={stats.uniqueVisitorsThisWeek}
            sub={`${stats.totalVisitsThisWeek} כניסות כולל`}
            color="sky"
          />
          <StatCard
            label="הצעות חדשות היום"
            value={stats.newProposalsToday}
            color="amber"
          />
          <StatCard
            label="הצעות חדשות השבוע"
            value={stats.newProposalsThisWeek}
            color="amber"
          />
        </div>
      </section>

      {/* Proposals */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">סטטיסטיקת הצעות שידוך</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label="סה״כ הצעות"
            value={stats.totalProposals}
            color="purple"
          />
          <StatCard
            label="הצעות שהגיעו לפגישה"
            value={stats.successfulProposals}
            sub="סטטוס 4, 6, 8 או 9"
            color="emerald"
          />
          <StatCard
            label="אחוז הצלחה"
            value={`${stats.successRate}%`}
            sub="הצעות שהגיעו לפגישה מתוך הכלל"
            color="emerald"
          />
        </div>
      </section>

      {/* Progress bar */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-2">המרת הצעות לפגישות</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>הצעות שהגיעו לפגישה</span>
            <span>{stats.successfulProposals} / {stats.totalProposals}</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${stats.successRate}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            פגישה = הצעה שהגיעה לסטטוס &quot;נפגשו&quot; (4), &quot;דייטים מתקדם&quot; (6), &quot;התארסו&quot; (8) או &quot;התחתנו&quot; (9)
          </p>
        </div>
      </section>
    </div>
  );
}
