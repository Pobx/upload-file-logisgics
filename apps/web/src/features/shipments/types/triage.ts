export type TriageFilter = 'all' | 'missing' | 'complete' | 'unattached' | 'conflict' | 'verified';

export interface KPICounts {
  totalCount: number;
  missingBLCount: number;
  pendingCount: number;
  completeCount: number;
  missingCount: number;
}

export type ChartMode = 'donut' | 'bar' | 'hybrid';
