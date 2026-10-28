import React from 'react';

export interface DailyVolume {
  dayLabel: string;
  incomingCount: number;
  clearedCount: number;
  isToday?: boolean;
}

export interface WeeklyVolumeBarChartProps {
  data?: DailyVolume[];
  peakDayLabel?: string;
}

export const defaultWeeklyData: DailyVolume[] = [
  { dayLabel: 'จ.', incomingCount: 8, clearedCount: 6 },
  { dayLabel: 'อ.', incomingCount: 12, clearedCount: 10 },
  { dayLabel: 'พ.', incomingCount: 16, clearedCount: 14, isToday: true },
  { dayLabel: 'พฤ.', incomingCount: 10, clearedCount: 9 },
  { dayLabel: 'ศ.', incomingCount: 6, clearedCount: 5 },
  { dayLabel: 'ส.', incomingCount: 3, clearedCount: 3 },
  { dayLabel: 'อา.', incomingCount: 2, clearedCount: 2 },
];

const DAY_NAME_MAP: Record<string, string> = {
  'จ.': 'จันทร์',
  'จ': 'จันทร์',
  'อ.': 'อังคาร',
  'อ': 'อังคาร',
  'พ.': 'พุธ',
  'พ': 'พุธ',
  'พฤ.': 'พฤหัสบดี',
  'พฤ': 'พฤหัสบดี',
  'ศ.': 'ศุกร์',
  'ศ': 'ศุกร์',
  'ส.': 'เสาร์',
  'ส': 'เสาร์',
  'อา.': 'อาทิตย์',
  'อา': 'อาทิตย์',
};

export const WeeklyVolumeBarChart: React.FC<WeeklyVolumeBarChartProps> = ({
  data = defaultWeeklyData,
  peakDayLabel,
}) => {
  const totalVolume = data.reduce((acc, d) => acc + d.incomingCount, 0);

  // Compute peak day dynamically by finding the day with max incomingCount
  const computedPeakDay = React.useMemo(() => {
    if (!data || data.length === 0) return '';
    const maxDay = data.reduce(
      (prev, curr) => (curr.incomingCount > prev.incomingCount ? curr : prev),
      data[0]
    );
    return DAY_NAME_MAP[maxDay.dayLabel] || maxDay.dayLabel;
  }, [data]);

  const activePeakDay = peakDayLabel ?? computedPeakDay;

  // Dynamic layout calculations to support arrays > 7 elements without overflowing viewBox
  const n = data.length;
  const paddingX = 14;
  const availableWidth = 320 - paddingX * 2;
  const slotWidth = n > 0 ? availableWidth / n : 0;
  const barWidth = Math.max(3, Math.min(10, Math.floor((slotWidth * 0.7 - 2) / 2)));
  const pairGap = Math.max(1, Math.min(2, Math.floor(barWidth / 4)));

  const calcHeight = (count: number) => Math.max(0, Math.min(count * 3.8, 65));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">สถิติรอบสัปดาห์</span>
          <h3 className="text-sm font-bold text-slate-800">Weekly Document Intake</h3>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-xs bg-sky-500 inline-block" /> เข้าตรวจ
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-xs bg-emerald-500 inline-block" /> ปล่อยแล้ว
            </span>
          </div>
          <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md text-xs font-semibold border border-sky-200">
            รวม {totalVolume} ฉบับ
          </span>
        </div>
      </div>

      <div className="w-full">
        <svg className="w-full h-28" viewBox="0 0 320 90">
          <line x1="0" y1="20" x2="320" y2="20" stroke="#F1F5F9" strokeDasharray="3 3" />
          <line x1="0" y1="50" x2="320" y2="50" stroke="#F1F5F9" strokeDasharray="3 3" />
          <line x1="0" y1="75" x2="320" y2="75" stroke="#E2E8F0" />

          {data.map((item, idx) => {
            const centerX = paddingX + (idx + 0.5) * slotWidth;
            const incomingX = centerX - barWidth - pairGap / 2;
            const clearedX = centerX + pairGap / 2;

            const incomingHeight = calcHeight(item.incomingCount);
            const clearedHeight = calcHeight(item.clearedCount);

            const incomingY = 75 - incomingHeight;
            const clearedY = 75 - clearedHeight;
            const isToday = item.isToday;
            const maxBarY = Math.min(incomingY, clearedY);

            return (
              <g key={`${item.dayLabel}-${idx}`}>
                {/* Incoming Bar (sky-500) */}
                <rect
                  x={incomingX}
                  y={incomingY}
                  width={barWidth}
                  height={incomingHeight}
                  rx="3"
                  fill={isToday ? '#0284C7' : '#0EA5E9'}
                  className="transition-all duration-300"
                  data-type="incoming"
                />
                {/* Cleared Bar (emerald-500) */}
                <rect
                  x={clearedX}
                  y={clearedY}
                  width={barWidth}
                  height={clearedHeight}
                  rx="3"
                  fill={isToday ? '#059669' : '#10B981'}
                  className="transition-all duration-300"
                  data-type="cleared"
                />
                {/* Day label */}
                <text
                  x={centerX}
                  y="86"
                  fontSize="9"
                  fill={isToday ? '#0284C7' : '#64748B'}
                  fontWeight={isToday ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {item.dayLabel}
                </text>
                {/* Star on today */}
                {isToday && (
                  <text
                    x={centerX}
                    y={maxBarY - 3}
                    fontSize="8"
                    fill="#0284C7"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    ★
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {activePeakDay && (
        <div className="text-[11px] text-sky-800 bg-sky-50 border border-sky-100 rounded-lg p-2 text-center">
          💡 วัน{activePeakDay} มีปริมาณเอกสารเข้าตรวจสูงสุด (Peak Day) ควรเตรียมพร้อมช่วงบ่าย
        </div>
      )}
    </div>
  );
};
