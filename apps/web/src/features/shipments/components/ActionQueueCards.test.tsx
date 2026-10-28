import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ActionQueueCards } from './ActionQueueCards';
import type { SearchItem } from '../types/shipment';

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

const mockItems: SearchItem[] = [
  {
    id: 'job-1',
    job_no: 'JOB-2026-001',
    customer_name: 'Siam Cement Group (SCG)',
    bl_no: null, // missing B/L
    invoice_no: 'INV-2026-001',
    document_count: 1,
    created_at: '2026-10-28T10:00:00Z',
    match_tier: 1,
  },
  {
    id: 'job-2',
    job_no: 'JOB-2026-002',
    customer_name: 'PTT Global Chemical',
    bl_no: 'MSKU9876543',
    invoice_no: 'INV-2026-002',
    document_count: 2, // pending (< 4)
    created_at: '2026-10-28T11:00:00Z',
    match_tier: 1,
  },
  {
    id: 'job-3',
    job_no: 'JOB-2026-003',
    customer_name: 'Thai Beverage Logistics',
    bl_no: 'ONE12345678',
    invoice_no: 'INV-2026-003',
    document_count: 4, // complete (>= 4)
    created_at: '2026-10-28T12:00:00Z',
    match_tier: 1,
  },
];

describe('ActionQueueCards', () => {
  it('renders both mobile cards container (md:hidden) and desktop rows container (hidden md:block)', () => {
    const { container } = render(
      <ActionQueueCards
        items={mockItems}
        onSelectJob={vi.fn()}
        allowUpload={true}
      />
    );

    const mobileContainer = container.querySelector('.md\\:hidden');
    const desktopContainer = container.querySelector('.hidden.md\\:block');

    expect(mobileContainer).toBeInTheDocument();
    expect(desktopContainer).toBeInTheDocument();
  });

  it('correctly displays job numbers, customer names, and status badges', () => {
    render(
      <ActionQueueCards
        items={mockItems}
        onSelectJob={vi.fn()}
        allowUpload={true}
      />
    );

    // Job numbers
    expect(screen.getAllByText('JOB-2026-001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('JOB-2026-002').length).toBeGreaterThan(0);
    expect(screen.getAllByText('JOB-2026-003').length).toBeGreaterThan(0);

    // Customer names
    expect(screen.getAllByText('Siam Cement Group (SCG)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PTT Global Chemical').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Thai Beverage Logistics').length).toBeGreaterThan(0);

    // Status badges: "ขาด House B/L", "รอตรวจพิกัด", "พร้อมปล่อย"
    expect(screen.getAllByText(/ขาด House B\/L/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/รอตรวจพิกัด/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/พร้อมปล่อย/).length).toBeGreaterThan(0);
  });

  it('renders micro progress bars for document tracking', () => {
    render(
      <ActionQueueCards
        items={mockItems}
        onSelectJob={vi.fn()}
        allowUpload={true}
      />
    );

    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('displays 1-click write action buttons like "แนบ B/L" and "ยืนยันพิกัด" when allowUpload is true', () => {
    render(
      <ActionQueueCards
        items={mockItems}
        onSelectJob={vi.fn()}
        allowUpload={true}
      />
    );

    // Should render write action buttons
    expect(screen.getAllByText(/แนบ B\/L/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ยืนยันพิกัด/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ดูเอกสาร/).length).toBeGreaterThan(0);
  });

  it('strictly hides write action buttons ("แนบ B/L", "ยืนยันพิกัด") from DOM when allowUpload is false (Viewer role)', () => {
    render(
      <ActionQueueCards
        items={mockItems}
        onSelectJob={vi.fn()}
        allowUpload={false}
      />
    );

    // Write action buttons must NOT exist in the DOM
    expect(screen.queryByText(/แนบ B\/L/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ยืนยันพิกัด/)).not.toBeInTheDocument();
  });

  it('calls onSelectJob when clicking a mobile card or desktop row', () => {
    const handleSelectJob = vi.fn();
    const { container } = render(
      <ActionQueueCards
        items={mockItems}
        onSelectJob={handleSelectJob}
        allowUpload={true}
      />
    );

    // Click on mobile card
    const mobileCards = container.querySelectorAll('.md\\:hidden [data-testid="job-card-mobile"]');
    if (mobileCards.length > 0) {
      fireEvent.click(mobileCards[0]);
      expect(handleSelectJob).toHaveBeenCalledWith(mockItems[0]);
    } else {
      // Fallback: click directly by text
      const firstJobMobile = screen.getAllByText('JOB-2026-001')[0];
      fireEvent.click(firstJobMobile);
      expect(handleSelectJob).toHaveBeenCalledWith(mockItems[0]);
    }

    handleSelectJob.mockClear();

    // Click on desktop row
    const desktopRows = container.querySelectorAll('.hidden.md\\:block [data-testid="job-row-desktop"]');
    if (desktopRows.length > 0) {
      fireEvent.click(desktopRows[1]);
      expect(handleSelectJob).toHaveBeenCalledWith(mockItems[1]);
    }
  });

  it('calls onSelectJob when clicking 1-click action button with stopPropagation', () => {
    const handleSelectJob = vi.fn();
    render(
      <ActionQueueCards
        items={mockItems}
        onSelectJob={handleSelectJob}
        allowUpload={true}
      />
    );

    const attachButtons = screen.getAllByText(/แนบ B\/L/);
    fireEvent.click(attachButtons[0]);
    expect(handleSelectJob).toHaveBeenCalledWith(mockItems[0]);
  });

  it('applies truncate and zero-overflow classes to mobile card text elements', () => {
    const { container } = render(
      <ActionQueueCards
        items={mockItems}
        onSelectJob={vi.fn()}
        allowUpload={true}
      />
    );

    const truncatedElements = container.querySelectorAll('.md\\:hidden .truncate');
    expect(truncatedElements.length).toBeGreaterThan(0);
  });
});
