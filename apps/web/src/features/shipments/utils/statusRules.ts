import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  FileUp, 
  CheckSquare, 
  Eye 
} from 'lucide-react';
import { Shipment } from '../types/shipment';
import { StatusConfig } from '../types/status';

export const getJobStatusConfig = (item: Shipment): StatusConfig => {
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

export function calculateReadinessPercent(readyCount: number, totalCount: number): number {
  return totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;
}
