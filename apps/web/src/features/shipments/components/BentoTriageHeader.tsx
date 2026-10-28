import React, { useState } from 'react';
import { DocumentReadinessDonut } from './DocumentReadinessDonut';
import { WeeklyVolumeBarChart } from './WeeklyVolumeBarChart';
import { AlertCircle, CheckCircle2, PieChart, BarChart3, LayoutGrid } from 'lucide-react';

export interface BentoTriageHeaderProps {
  completeCount: number;
  missingBLCount: number;
  pendingCount: number;
  totalCount: number;
}

export const BentoTriageHeader: React.FC<BentoTriageHeaderProps> = ({
  completeCount,
  missingBLCount,
  pendingCount,
  totalCount,
}) => {
  const [chartMode, setChartMode] = useState<'donut' | 'bar' | 'hybrid'>('donut');

  return (
    <div className="space-y-4">
      {/* Top Chart Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setChartMode('donut')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              chartMode === 'donut' ? 'bg-white text-sky-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            วงแหวนความพร้อม (Donut)
          </button>
          <button
            type="button"
            onClick={() => setChartMode('bar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              chartMode === 'bar' ? 'bg-white text-sky-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            กราฟแท่งรายสัปดาห์ (Bar)
          </button>
          <button
            type="button"
            onClick={() => setChartMode('hybrid')}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              chartMode === 'hybrid' ? 'bg-white text-sky-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            แบบผสม (Hybrid)
          </button>
        </div>

        <span className="text-xs text-slate-500">
          อัปเดตสถานะงานเรียลไทม์ (CS Triage Hub)
        </span>
      </div>

      {/* Hero Visual Area */}
      {chartMode === 'donut' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6">
            <DocumentReadinessDonut
              completeCount={completeCount}
              missingBLCount={missingBLCount}
              pendingCount={pendingCount}
              totalCount={totalCount}
            />
          </div>
          {missingBLCount === 0 ? (
            <div className="lg:col-span-6 flex flex-col justify-between bg-emerald-50 border border-emerald-200 border-l-4 border-l-emerald-500 rounded-2xl p-4">
              <div>
                <div className="flex items-center justify-between text-emerald-800 font-bold text-sm">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ✓ เอกสารครบถ้วน ไม่มีงานค้างเร่งด่วนในขณะนี้
                  </span>
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    0 งาน
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  เอกสาร Bill of Lading (B/L) ครบถ้วนทุกรายการ ไม่มีความเสี่ยงตู้ตกค้างหรือค่าปรับสายเรือในขณะนี้
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs text-emerald-800">
                <span>ขาด House B/L รวม 0 งาน</span>
                <span className="font-semibold text-emerald-700">สถานะปกติ 🟢</span>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-6 flex flex-col justify-between bg-rose-50 border border-rose-200 border-l-4 border-l-rose-500 rounded-2xl p-4">
              <div>
                <div className="flex items-center justify-between text-rose-800 font-bold text-sm">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Action Required: เอกสารที่ต้องตามด่วนวันนี้
                  </span>
                  <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {missingBLCount} งาน
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  มีงานที่ยังขาด Bill of Lading (B/L) ต้องเร่งประสานสายเรือ (Evergreen, Maersk, ONE) ก่อนตัดรอบบ่ายนี้เพื่อป้องกันค่าปรับและตู้ตกค้างที่ท่าเรือ
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-rose-200/60 flex items-center justify-between text-xs text-rose-900">
                <span>ขาด House B/L รวม {missingBLCount} งาน</span>
                <span className="font-semibold text-rose-700">ลำดับความเร่งด่วนสูงสุด 🚨</span>
              </div>
            </div>
          )}
        </div>
      )}

      {chartMode === 'bar' && (
        <WeeklyVolumeBarChart />
      )}

      {chartMode === 'hybrid' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DocumentReadinessDonut
            completeCount={completeCount}
            missingBLCount={missingBLCount}
            pendingCount={pendingCount}
            totalCount={totalCount}
          />
          <WeeklyVolumeBarChart />
        </div>
      )}
    </div>
  );
};
