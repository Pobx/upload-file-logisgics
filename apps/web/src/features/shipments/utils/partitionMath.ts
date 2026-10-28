import { Shipment } from '../types/shipment';
import { KPICounts } from '../types/triage';

export function calculatePartitionCounts(items: Shipment[]): KPICounts {
  const totalCount = items.length;
  const missingBLCount = items.filter(i => !i.bl_no).length;
  const completeCount = items.filter(i => !!i.bl_no && i.document_count >= 4).length;
  const pendingCount = items.filter(i => !!i.bl_no && i.document_count < 4).length;
  const missingCount = items.filter(i => i.document_count < 4).length;

  return {
    totalCount,
    missingBLCount,
    completeCount,
    pendingCount,
    missingCount,
  };
}

export function filterShipmentItems(items: Shipment[], tab: string): Shipment[] {
  if (tab === 'missing') {
    return items.filter(item => item.document_count < 4);
  }
  if (tab === 'complete') {
    return items.filter(item => item.document_count >= 4);
  }
  return items;
}
