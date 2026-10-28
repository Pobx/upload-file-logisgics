import React from 'react';
import { Ship, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

export interface TopKPIRibbonProps {
  totalCount: number;
  missingBLCount: number;
  pendingCount: number;
  readyCount: number;
}

export const TopKPIRibbon: React.FC<TopKPIRibbonProps> = ({
  totalCount,
  missingBLCount,
  pendingCount,
  readyCount,
}) => {
  const readinessPercent = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;

  const cards = [
    {
      id: 'total',
      label: 'งานทั้งหมดวันนี้',
      count: totalCount,
      extraText: null,
      icon: Ship,
      theme: {
        bg: 'bg-sky-50/60 hover:bg-sky-50',
        border: 'border-sky-200',
        iconBg: 'bg-sky-100 text-sky-600',
        text: 'text-sky-900',
        subtext: 'text-sky-600',
        countColor: 'text-sky-700',
      },
    },
    {
      id: 'missing-bl',
      label: 'ขาด House B/L',
      count: missingBLCount,
      extraText: null,
      icon: AlertTriangle,
      theme: {
        bg: 'bg-rose-50/60 hover:bg-rose-50',
        border: 'border-rose-200',
        iconBg: 'bg-rose-100 text-rose-600',
        text: 'text-rose-900',
        subtext: 'text-rose-600',
        countColor: 'text-rose-700',
      },
    },
    {
      id: 'pending',
      label: 'รอตรวจพิกัด',
      count: pendingCount,
      extraText: null,
      icon: Clock,
      theme: {
        bg: 'bg-amber-50/60 hover:bg-amber-50',
        border: 'border-amber-200',
        iconBg: 'bg-amber-100 text-amber-600',
        text: 'text-amber-900',
        subtext: 'text-amber-600',
        countColor: 'text-amber-700',
      },
    },
    {
      id: 'ready',
      label: 'พร้อมปล่อยตู้',
      count: readyCount,
      extraText: `(${readinessPercent}%)`,
      icon: CheckCircle2,
      theme: {
        bg: 'bg-emerald-50/60 hover:bg-emerald-50',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-100 text-emerald-600',
        text: 'text-emerald-900',
        subtext: 'text-emerald-600',
        countColor: 'text-emerald-700',
      },
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`flex items-center justify-between p-3 rounded-xl border ${card.theme.border} ${card.theme.bg} transition-colors shadow-2xs`}
          >
            <div className="min-w-0 pr-2">
              <div className="text-xs font-medium text-slate-600 truncate">
                {card.label}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className={`text-xl font-bold tracking-tight ${card.theme.countColor}`}>
                  {card.count}
                </span>
                {card.extraText && (
                  <span className={`text-xs font-semibold ${card.theme.subtext}`}>
                    {card.extraText}
                  </span>
                )}
              </div>
            </div>
            <div className={`p-2 rounded-lg shrink-0 ${card.theme.iconBg}`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
