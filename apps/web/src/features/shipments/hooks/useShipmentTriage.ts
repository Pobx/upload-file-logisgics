import { useState, useMemo } from 'react';
import { Shipment } from '../types/shipment';
import { ChartMode, KPICounts } from '../types/triage';
import { calculatePartitionCounts } from '../utils/partitionMath';

export function useShipmentTriage(items: Shipment[]) {
  const [chartMode, setChartMode] = useState<ChartMode>('donut');

  const counts: KPICounts = useMemo(() => {
    return calculatePartitionCounts(items);
  }, [items]);

  return {
    chartMode,
    setChartMode,
    ...counts,
  };
}
