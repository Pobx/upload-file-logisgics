import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BentoTriageHeader } from './BentoTriageHeader';

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

describe('BentoTriageHeader', () => {
  it('renders triage action alert and toggles between donut and weekly charts', () => {
    render(
      <BentoTriageHeader 
        completeCount={14} 
        missingBLCount={5} 
        pendingCount={3} 
        totalCount={22} 
      />
    );
    expect(screen.getByText(/Action Required/i)).toBeInTheDocument();
    expect(screen.getByText(/อัปเดตสถานะงานเรียลไทม์ \(CS Triage Hub\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('5 งาน').length).toBe(2); // One in donut stats, one in urgent badge
    
    // Switch to Weekly Bar chart
    const barBtn = screen.getByText(/กราฟแท่งรายสัปดาห์/i);
    fireEvent.click(barBtn);
    expect(screen.getByText(/Weekly Document Intake/i)).toBeInTheDocument();
    // Donut and action required alert should not be visible in bar mode
    expect(screen.queryByText(/Action Required/i)).toBeNull();
  });

  it('toggles to hybrid mode showing both donut and weekly volume charts', () => {
    render(
      <BentoTriageHeader 
        completeCount={14} 
        missingBLCount={5} 
        pendingCount={3} 
        totalCount={22} 
      />
    );

    const hybridBtn = screen.getByText(/แบบผสม/i);
    fireEvent.click(hybridBtn);

    // Hybrid should show both DocumentReadinessDonut and WeeklyVolumeBarChart
    expect(screen.getByText(/Weekly Document Intake/i)).toBeInTheDocument();
    expect(screen.getByText('64%')).toBeInTheDocument();
    // In hybrid mode, action required alert card is omitted
    expect(screen.queryByText(/Action Required/i)).toBeNull();
  });

  it('can switch back to donut mode from another view', () => {
    render(
      <BentoTriageHeader 
        completeCount={14} 
        missingBLCount={5} 
        pendingCount={3} 
        totalCount={22} 
      />
    );

    // First go to bar mode
    fireEvent.click(screen.getByText(/กราฟแท่งรายสัปดาห์/i));
    expect(screen.getByText(/Weekly Document Intake/i)).toBeInTheDocument();

    // Now switch back to donut mode
    fireEvent.click(screen.getByText(/วงแหวนความพร้อม/i));
    expect(screen.getByText(/Action Required/i)).toBeInTheDocument();
    expect(screen.queryByText(/Weekly Document Intake/i)).toBeNull();
  });

  it('displays correct missing B/L badge count when 0', () => {
    render(
      <BentoTriageHeader 
        completeCount={10} 
        missingBLCount={0} 
        pendingCount={0} 
        totalCount={10} 
      />
    );
    // Both Donut legend and triage alert badge show "0 งาน"
    const zeroBadges = screen.getAllByText('0 งาน');
    expect(zeroBadges.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Action Required: เอกสารที่ต้องตามด่วนวันนี้/i)).toBeInTheDocument();
  });

  it('applies active styling to the currently selected mode button', () => {
    render(
      <BentoTriageHeader 
        completeCount={14} 
        missingBLCount={5} 
        pendingCount={3} 
        totalCount={22} 
      />
    );

    const donutBtn = screen.getByText(/วงแหวนความพร้อม/i);
    const barBtn = screen.getByText(/กราฟแท่งรายสัปดาห์/i);

    expect(donutBtn.className).toContain('bg-white');
    expect(donutBtn.className).toContain('text-sky-700');
    expect(barBtn.className).toContain('text-slate-600');

    fireEvent.click(barBtn);
    expect(barBtn.className).toContain('bg-white');
    expect(barBtn.className).toContain('text-sky-700');
    expect(donutBtn.className).toContain('text-slate-600');
  });
});
