import React from 'react';

export interface CarrierBreakdown {
  maersk: number;
  evergreen: number;
  one: number;
  other: number;
}

export interface DocumentReadinessDonutProps {
  completeCount: number;
  missingBLCount: number;
  pendingCount: number;
  totalCount: number;
  carrierStats?: CarrierBreakdown;
}

export const DocumentReadinessDonut: React.FC<DocumentReadinessDonutProps> = ({
  completeCount,
  missingBLCount,
  pendingCount,
  totalCount,
  carrierStats = { maersk: 45, evergreen: 35, one: 20, other: 0 },
}) => {
  const percentage = totalCount > 0 ? Math.round((completeCount / totalCount) * 100) : 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  const completeRatio = totalCount > 0 ? completeCount / totalCount : 0;
  const missingRatio = totalCount > 0 ? missingBLCount / totalCount : 0;
  const pendingRatio = totalCount > 0 ? pendingCount / totalCount : 0;

  const completeDash = completeRatio * circumference;
  const missingDash = missingRatio * circumference;
  const pendingDash = pendingRatio * circumference;

  return (
    <div className="flex flex-col md:flex-row items-center gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
      {/* SVG Donut Ring */}
      <div className="relative w-32 h-32 shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="11" />
          {totalCount > 0 && (
            <>
              {completeCount > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="11"
                  strokeDasharray={`${completeDash} ${circumference}`}
                  strokeDashoffset={0}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              )}
              {missingBLCount > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="11"
                  strokeDasharray={`${missingDash} ${circumference}`}
                  strokeDashoffset={-completeDash}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              )}
              {pendingCount > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="11"
                  strokeDasharray={`${pendingDash} ${circumference}`}
                  strokeDashoffset={-(completeDash + missingDash)}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              )}
            </>
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-slate-900 leading-none">{percentage}%</span>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5">พร้อมปล่อย</span>
        </div>
      </div>

      {/* Legend & Breakdown */}
      <div className="flex-1 w-full space-y-2 text-xs">
        <div className="flex justify-between items-center bg-emerald-50 text-emerald-800 px-2.5 py-1.5 rounded-lg border border-emerald-100">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            เอกสารครบ 100%
          </span>
          <span className="font-bold">{completeCount} งาน</span>
        </div>
        <div className="flex justify-between items-center bg-rose-50 text-rose-800 px-2.5 py-1.5 rounded-lg border border-rose-100">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            ⚠️ ขาด House B/L
          </span>
          <span className="font-bold">{missingBLCount} งาน</span>
        </div>
        <div className="flex justify-between items-center bg-amber-50 text-amber-800 px-2.5 py-1.5 rounded-lg border border-amber-100">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            ⏳ รอตรวจพิกัด
          </span>
          <span className="font-bold">{pendingCount} งาน</span>
        </div>

        {/* Carrier gauge */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex justify-between text-[11px] text-slate-500 mb-1">
            <span>สายเรือ:</span>
            <span>Maersk ({carrierStats.maersk}%) • Evergreen ({carrierStats.evergreen}%) • ONE ({carrierStats.one}%)</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div style={{ width: `${carrierStats.maersk}%` }} className="bg-sky-500" title="Maersk Line" />
            <div style={{ width: `${carrierStats.evergreen}%` }} className="bg-emerald-500" title="Evergreen Marine" />
            <div style={{ width: `${carrierStats.one}%` }} className="bg-rose-500" title="ONE Ocean Network" />
          </div>
        </div>
      </div>
    </div>
  );
};
