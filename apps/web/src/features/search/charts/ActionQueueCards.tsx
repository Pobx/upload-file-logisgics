import React from 'react';
import { 
  ChevronRight, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  FileUp, 
  CheckSquare, 
  Eye 
} from 'lucide-react';
import { MicroProgressBar } from './MicroProgressBar';
import type { SearchItem } from '../SearchPage';

export interface ActionQueueCardsProps {
  items: SearchItem[];
  onSelectJob: (item: SearchItem) => void;
  allowUpload: boolean;
  className?: string;
}

type JobStatus = 'missing-bl' | 'pending' | 'ready';

interface StatusConfig {
  type: JobStatus;
  badgeLabel: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
  actionLabel: string;
  actionClass: string;
  isWriteAction: boolean;
  actionIcon: React.ComponentType<{ className?: string }>;
}

export const getJobStatusConfig = (item: SearchItem): StatusConfig => {
  if (!item.bl_no) {
    return {
      type: 'missing-bl',
      badgeLabel: 'ขาด House B/L',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: AlertTriangle,
      actionLabel: 'แนบ B/L',
      actionClass: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200',
      isWriteAction: true,
      actionIcon: FileUp,
    };
  }

  if (item.document_count < 4) {
    return {
      type: 'pending',
      badgeLabel: 'รอตรวจพิกัด',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock,
      actionLabel: 'ยืนยันพิกัด',
      actionClass: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
      isWriteAction: true,
      actionIcon: CheckSquare,
    };
  }

  return {
    type: 'ready',
    badgeLabel: 'พร้อมปล่อยตู้',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    actionLabel: 'ดูเอกสาร',
    actionClass: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
    isWriteAction: false,
    actionIcon: Eye,
  };
};

export const ActionQueueCards: React.FC<ActionQueueCardsProps> = ({
  items,
  onSelectJob,
  allowUpload,
  className = '',
}) => {
  if (items.length === 0) {
    return (
      <div className={`py-12 text-center text-slate-400 text-sm ${className}`}>
        ไม่พบรายการข้อมูลตามเงื่อนไขที่ค้นหา
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile Touch Cards View (< 768px: md:hidden) */}
      <div className="md:hidden p-3 space-y-3">
        {items.map((item) => {
          const config = getJobStatusConfig(item);
          const StatusIcon = config.icon;
          const ActionIcon = config.actionIcon;
          const showActionButton = allowUpload || !config.isWriteAction;

          return (
            <div
              key={item.id}
              data-testid="job-card-mobile"
              onClick={() => onSelectJob(item)}
              className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs hover:border-slate-300 transition-all cursor-pointer space-y-2.5"
            >
              {/* Row 1: ID + Status Badge */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-sky-600 text-sm tracking-tight truncate">
                  {item.job_no}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${config.badgeClass}`}>
                  <StatusIcon className="w-3 h-3" />
                  {config.badgeLabel}
                </span>
              </div>

              {/* Row 2: Customer Name + Invoice/BL Info (Zero horizontal overflow) */}
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-800 text-xs truncate">
                  {item.customer_name}
                </div>
                <div className="text-[11px] text-slate-500 font-mono truncate">
                  {item.invoice_no ? `INV: ${item.invoice_no}` : 'ไม่มี Invoice'} • B/L: {item.bl_no || '-'}
                </div>
              </div>

              {/* Row 3: Micro Progress Bar + 1-Click Action */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span>ความพร้อมเอกสาร</span>
                    <span className="font-medium text-slate-600">{item.document_count}/4</span>
                  </div>
                  <MicroProgressBar
                    hasInvoice={!!item.invoice_no}
                    hasPackingList={item.document_count >= 2}
                    hasBL={!!item.bl_no}
                    isBLPending={item.document_count < 4}
                  />
                </div>

                {showActionButton && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectJob(item);
                    }}
                    className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shrink-0 shadow-2xs ${config.actionClass}`}
                  >
                    <ActionIcon className="w-3.5 h-3.5" />
                    <span>{config.actionLabel}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Rows View (>= 768px: hidden md:block) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Job Order #</th>
              <th className="py-3 px-4">ลูกค้า (Customer)</th>
              <th className="py-3 px-4">B/L / Booking</th>
              <th className="py-3 px-4">Invoice</th>
              <th className="py-3 px-4">ความพร้อมเอกสาร</th>
              <th className="py-3 px-4">สถานะ</th>
              <th className="py-3 px-4 text-right">การกระทำ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const config = getJobStatusConfig(item);
              const StatusIcon = config.icon;
              const ActionIcon = config.actionIcon;
              const showActionButton = allowUpload || !config.isWriteAction;

              return (
                <tr
                  key={item.id}
                  data-testid="job-row-desktop"
                  onClick={() => onSelectJob(item)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4 font-mono font-semibold text-sky-600 group-hover:text-sky-700 whitespace-nowrap">
                    {item.job_no}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 max-w-[220px] truncate" title={item.customer_name}>
                    {item.customer_name}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono whitespace-nowrap">
                    {item.bl_no || '-'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                    {item.invoice_no || '-'}
                  </td>
                  <td className="py-3 px-4 min-w-[140px]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>ความพร้อม</span>
                        <span>{item.document_count}/4</span>
                      </div>
                      <MicroProgressBar
                        hasInvoice={!!item.invoice_no}
                        hasPackingList={item.document_count >= 2}
                        hasBL={!!item.bl_no}
                        isBLPending={item.document_count < 4}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${config.badgeClass}`}>
                      <StatusIcon className="w-3 h-3" />
                      {config.badgeLabel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {showActionButton ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectJob(item);
                        }}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer shadow-2xs ${config.actionClass}`}
                      >
                        <ActionIcon className="w-3 h-3" />
                        <span>{config.actionLabel}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
