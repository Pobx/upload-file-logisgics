import { describe, it, expect } from 'vitest';
import { filterSearchItems, SearchItem } from './SearchPage';

describe('SearchPage Filter Tabs', () => {
  const sampleItems: SearchItem[] = [
    {
      id: '1',
      job_no: 'JOB-001',
      customer_name: 'Customer A',
      document_count: 2, // missing docs
      created_at: new Date().toISOString(),
      match_tier: 1,
    },
    {
      id: '2',
      job_no: 'JOB-002',
      customer_name: 'Customer B',
      document_count: 4, // complete
      created_at: new Date().toISOString(),
      match_tier: 1,
    },
  ];

  it('filters all items when tab is all', () => {
    expect(filterSearchItems(sampleItems, 'all')).toHaveLength(2);
  });

  it('filters missing docs items when tab is missing', () => {
    const res = filterSearchItems(sampleItems, 'missing');
    expect(res).toHaveLength(1);
    expect(res[0].job_no).toBe('JOB-001');
  });

  it('filters complete items when tab is complete', () => {
    const res = filterSearchItems(sampleItems, 'complete');
    expect(res).toHaveLength(1);
    expect(res[0].job_no).toBe('JOB-002');
  });
});
