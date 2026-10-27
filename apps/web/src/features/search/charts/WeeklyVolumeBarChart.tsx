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

export const WeeklyVolumeBarChart: React.FC<WeeklyVolumeBarChartProps> = ({
  data = defaultWeeklyData,
  peakDayLabel = 'พุธ',
}) => {
  const totalVolume = data.reduce((acc, d) => acc + d.incomingCount, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">สถิติรอบสัปดาห์</span>
          <h3 className="text-sm font-bold text-slate-800">Weekly Document Intake</h3>
        </div>
        <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md text-xs font-semibold border border-sky-200">
          รวม {totalVolume} ฉบับ
        </span>
      </div>

      <div className="w-full">
        <svg className="w-full h-28" viewBox="0 0 320 90">
          <line x1="0" y1="20" x2="320" y2="20" stroke="#F1F5F9" strokeDasharray="3 3" />
          <line x1="0" y1="50" x2="320" y2="50" stroke="#F1F5F9" strokeDasharray="3 3" />
          <line x1="0" y1="75" x2="320" y2="75" stroke="#E2E8F0" />

          {data.map((item, idx) => {
            const x = 15 + idx * 43;
            const barHeight = Math.max(0, Math.min(item.incomingCount * 3.8, 65));
            const y = 75 - barHeight;
            const isToday = item.isToday;

            return (
              <g key={item.dayLabel}>
                <rect
                  x={x}
                  y={y}
                  width="22"
                  height={barHeight}
                  rx="4"
                  fill={isToday ? '#0284C7' : '#CBD5E1'}
                  className="transition-all duration-300"
                />
                <text
                  x={x + 11}
                  y="86"
                  fontSize="9"
                  fill={isToday ? '#0284C7' : '#64748B'}
                  fontWeight={isToday ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {item.dayLabel}
                </text>
                {isToday && (
                  <text x={x + 11} y={y - 3} fontSize="8" fill="#0284C7" fontWeight="bold" textAnchor="middle">
                    ★
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="text-[11px] text-sky-800 bg-sky-50 border border-sky-100 rounded-lg p-2 text-center">
        💡 วัน{peakDayLabel} มีปริมาณเอกสารเข้าตรวจสูงสุด (Peak Day) ควรเตรียมพร้อมช่วงบ่าย
      </div>
    </div>
  );
};
