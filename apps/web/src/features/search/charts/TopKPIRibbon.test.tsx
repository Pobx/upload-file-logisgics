import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TopKPIRibbon } from './TopKPIRibbon';

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

describe('TopKPIRibbon', () => {
  it('renders all 4 KPI cards with Thai labels and counts', () => {
    render(
      <TopKPIRibbon
        totalCount={24}
        missingBLCount={5}
        pendingCount={4}
        readyCount={15}
      />
    );

    // Verify 4 Thai labels
    expect(screen.getByText('งานทั้งหมดวันนี้')).toBeInTheDocument();
    expect(screen.getByText('ขาด House B/L')).toBeInTheDocument();
    expect(screen.getByText('รอตรวจพิกัด')).toBeInTheDocument();
    expect(screen.getByText('พร้อมปล่อยตู้')).toBeInTheDocument();

    // Verify counts
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('calculates and displays readiness percentage correctly when totalCount > 0', () => {
    render(
      <TopKPIRibbon
        totalCount={20}
        missingBLCount={4}
        pendingCount={2}
        readyCount={14}
      />
    );

    // 14 / 20 = 70%
    expect(screen.getByText(/70%/)).toBeInTheDocument();
  });

  it('handles fallback safely when totalCount is 0 without NaN', () => {
    render(
      <TopKPIRibbon
        totalCount={0}
        missingBLCount={0}
        pendingCount={0}
        readyCount={0}
      />
    );

    expect(screen.getByText(/0%/)).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it('applies semantic color classes for sky, rose, amber, and emerald themes', () => {
    const { container } = render(
      <TopKPIRibbon
        totalCount={10}
        missingBLCount={2}
        pendingCount={3}
        readyCount={5}
      />
    );

    // Verify presence of semantic color tokens
    const skyElements = container.querySelectorAll('.text-sky-600, .text-sky-700, .bg-sky-50, .border-sky-200');
    expect(skyElements.length).toBeGreaterThan(0);

    const roseElements = container.querySelectorAll('.text-rose-600, .text-rose-700, .bg-rose-50, .border-rose-200');
    expect(roseElements.length).toBeGreaterThan(0);

    const amberElements = container.querySelectorAll('.text-amber-600, .text-amber-700, .bg-amber-50, .border-amber-200');
    expect(amberElements.length).toBeGreaterThan(0);

    const emeraldElements = container.querySelectorAll('.text-emerald-600, .text-emerald-700, .bg-emerald-50, .border-emerald-200');
    expect(emeraldElements.length).toBeGreaterThan(0);
  });

  it('renders responsive grid layout (grid-cols-2 md:grid-cols-4)', () => {
    const { container } = render(
      <TopKPIRibbon
        totalCount={10}
        missingBLCount={2}
        pendingCount={3}
        readyCount={5}
      />
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toMatch(/grid/);
    expect(grid.className).toMatch(/grid-cols-2/);
    expect(grid.className).toMatch(/md:grid-cols-4/);
  });
});
