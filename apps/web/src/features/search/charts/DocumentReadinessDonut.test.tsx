import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DocumentReadinessDonut } from './DocumentReadinessDonut';

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

describe('DocumentReadinessDonut', () => {
  it('calculates readiness percentage correctly and renders counts', () => {
    render(
      <DocumentReadinessDonut 
        completeCount={14} 
        missingBLCount={5} 
        pendingCount={3} 
        totalCount={22} 
      />
    );
    expect(screen.getByText('64%')).toBeInTheDocument();
    expect(screen.getByText('14 งาน')).toBeInTheDocument();
    expect(screen.getByText('5 งาน')).toBeInTheDocument();
  });

  it('handles 0 total jobs gracefully without NaN', () => {
    render(
      <DocumentReadinessDonut 
        completeCount={0} 
        missingBLCount={0} 
        pendingCount={0} 
        totalCount={0} 
      />
    );
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders default carrier distribution gauge', () => {
    render(
      <DocumentReadinessDonut 
        completeCount={10} 
        missingBLCount={2} 
        pendingCount={1} 
        totalCount={13} 
      />
    );
    expect(screen.getByText(/Maersk \(45%\) • Evergreen \(35%\) • ONE \(20%\)/)).toBeInTheDocument();
  });

  it('renders custom carrier distribution gauge when provided', () => {
    render(
      <DocumentReadinessDonut 
        completeCount={10} 
        missingBLCount={2} 
        pendingCount={1} 
        totalCount={13} 
        carrierStats={{
          maersk: 50,
          evergreen: 30,
          one: 20,
          other: 0,
        }}
      />
    );
    expect(screen.getByText(/Maersk \(50%\) • Evergreen \(30%\) • ONE \(20%\)/)).toBeInTheDocument();
  });

  it('renders 3 colored circle segments when totalCount > 0', () => {
    const { container } = render(
      <DocumentReadinessDonut 
        completeCount={14} 
        missingBLCount={5} 
        pendingCount={3} 
        totalCount={22} 
      />
    );
    // 1 background circle + 3 colored segment circles = 4 circles total
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(4);

    const greenSegment = container.querySelector('circle[stroke="#10B981"]');
    const redSegment = container.querySelector('circle[stroke="#F43F5E"]');
    const amberSegment = container.querySelector('circle[stroke="#F59E0B"]');

    expect(greenSegment).toBeInTheDocument();
    expect(redSegment).toBeInTheDocument();
    expect(amberSegment).toBeInTheDocument();
  });

  it('renders only the background track circle when totalCount is 0', () => {
    const { container } = render(
      <DocumentReadinessDonut 
        completeCount={0} 
        missingBLCount={0} 
        pendingCount={0} 
        totalCount={0} 
      />
    );
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(1);
    expect(circles[0].getAttribute('stroke')).toBe('#F1F5F9');
  });
});
