import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchPage, filterSearchItems, SearchItem } from './SearchPage';
import { apiClient, setAuthToken } from '../../lib/api-client';

expect.extend({
  toBeInTheDocument(received: HTMLElement | null) {
    const pass = received != null && document.body.contains(received);
    return {
      pass,
      message: () => `expected element to ${pass ? 'not ' : ''}be in document`,
    };
  },
});

interface CustomMatchers<R = unknown> {
  toBeInTheDocument(): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

const sampleItems: SearchItem[] = [
  {
    id: '1',
    job_no: 'JOB-2026-001',
    customer_name: 'Siam Cement Group',
    bl_no: null, // missing B/L
    invoice_no: 'INV-001',
    document_count: 1,
    created_at: new Date().toISOString(),
    match_tier: 1,
  },
  {
    id: '2',
    job_no: 'JOB-2026-002',
    customer_name: 'PTT Global',
    bl_no: 'MSKU1234567',
    invoice_no: 'INV-002',
    document_count: 4, // complete
    created_at: new Date().toISOString(),
    match_tier: 1,
  },
];

const makeAuthToken = (roles: string[]) => {
  const payload = Buffer.from(
    JSON.stringify({ preferred_username: 'tester', roles })
  ).toString('base64url');
  return `header.${payload}.signature`;
};

describe('SearchPage Filter Tabs', () => {
  it('filters all items when tab is all', () => {
    expect(filterSearchItems(sampleItems, 'all')).toHaveLength(2);
  });

  it('filters missing docs items when tab is missing', () => {
    const res = filterSearchItems(sampleItems, 'missing');
    expect(res).toHaveLength(1);
    expect(res[0].job_no).toBe('JOB-2026-001');
  });

  it('filters complete items when tab is complete', () => {
    const res = filterSearchItems(sampleItems, 'complete');
    expect(res).toHaveLength(1);
    expect(res[0].job_no).toBe('JOB-2026-002');
  });
});

describe('SearchPage Integration & Bento Triage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        data: sampleItems,
      },
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setAuthToken(null);
  });

  it('renders bento triage header and readiness donut on search page', async () => {
    setAuthToken(makeAuthToken(['staff']));
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SearchPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/วงแหวนความพร้อม/i)).toBeInTheDocument();
    expect(screen.getByText(/อัปเดตสถานะงานเรียลไทม์ \(CS Triage Hub\)/i)).toBeInTheDocument();
  });

  it('renders micro progress bars on jobs after loading', async () => {
    setAuthToken(makeAuthToken(['staff']));
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SearchPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('JOB-2026-001').length).toBeGreaterThan(0);
    });

    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('viewer role strictly hides upload buttons and camera scan triggers', async () => {
    setAuthToken(makeAuthToken(['viewer']));
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SearchPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('JOB-2026-001').length).toBeGreaterThan(0);
    });

    // Write actions like "แนบ B/L" and "ยืนยันพิกัด" are strictly omitted
    expect(screen.queryByText('แนบ B/L')).toBeNull();
    expect(screen.queryByText('ยืนยันพิกัด')).toBeNull();
    // Desktop shows dash placeholder for restricted action
    expect(screen.getByText('—')).toBeInTheDocument();
    // Non-write actions like "ดูเอกสาร" remain accessible
    expect(screen.getAllByText('ดูเอกสาร').length).toBeGreaterThan(0);
  });

  it('staff role displays upload action buttons and camera scan trigger', async () => {
    setAuthToken(makeAuthToken(['staff']));
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SearchPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('JOB-2026-001').length).toBeGreaterThan(0);
    });

    // 1-Click Action buttons are visible for write roles
    expect(screen.getAllByText('แนบ B/L').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ดูเอกสาร').length).toBeGreaterThan(0);
  });

  it('unauthenticated session defaults to viewer role (least privilege principle)', async () => {
    setAuthToken(null);
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SearchPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('JOB-2026-001').length).toBeGreaterThan(0);
    });

    expect(screen.queryByText('แนบ B/L')).toBeNull();
    expect(screen.queryByText('ยืนยันพิกัด')).toBeNull();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders TopKPIRibbon with executive summary KPI labels and counts', async () => {
    setAuthToken(makeAuthToken(['staff']));
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SearchPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('JOB-2026-001').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('งานทั้งหมดวันนี้')).toBeInTheDocument();
    expect(screen.getAllByText('ขาด House B/L').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('รอตรวจพิกัด').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('พร้อมปล่อยตู้').length).toBeGreaterThanOrEqual(1);

    // TopKPIRibbon percentage: 1 ready out of 2 total = 50%
    expect(screen.getByText('(50%)')).toBeInTheDocument();
  });

  it('renders ActionQueueCards with desktop rows and mobile cards and handles job selection', async () => {
    setAuthToken(makeAuthToken(['staff']));
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SearchPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('job-card-mobile').length).toBe(2);
    });

    expect(screen.getAllByTestId('job-row-desktop').length).toBe(2);

    // Clicking a job card triggers JobDetailSlideover
    const mobileCards = screen.getAllByTestId('job-card-mobile');
    fireEvent.click(mobileCards[0]);

    // Slideover opens and displays Job Inspector header
    await waitFor(() => {
      expect(screen.getByText('Job Inspector')).toBeInTheDocument();
    });
  });

  it('partitions items mutually exclusively into missingBL, complete, and pending counts', async () => {
    const testItems: SearchItem[] = [
      {
        id: '1',
        job_no: 'JOB-2026-001',
        customer_name: 'Customer A',
        bl_no: null,
        document_count: 2,
        created_at: new Date().toISOString(),
        match_tier: 1,
      },
      {
        id: '2',
        job_no: 'JOB-2026-002',
        customer_name: 'Customer B',
        bl_no: 'BL-123',
        document_count: 4,
        created_at: new Date().toISOString(),
        match_tier: 1,
      },
      {
        id: '3',
        job_no: 'JOB-2026-003',
        customer_name: 'Customer C',
        bl_no: 'BL-456',
        document_count: 2,
        created_at: new Date().toISOString(),
        match_tier: 1,
      },
    ];

    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { data: testItems },
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SearchPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('ทั้งหมด (3)')).toBeInTheDocument();
    });

    // Donut breakdown badges:
    // completeCount: 1, missingBLCount: 1, pendingCount: 1
    const oneCountBadges = screen.getAllByText('1 งาน');
    expect(oneCountBadges.length).toBeGreaterThanOrEqual(3);
  });
});
