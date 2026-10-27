import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WeeklyVolumeBarChart, DailyVolume } from './WeeklyVolumeBarChart';

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

describe('WeeklyVolumeBarChart', () => {
  it('renders weekly chart with default data, peak alert and 7 day labels', () => {
    const { container } = render(<WeeklyVolumeBarChart />);

    expect(screen.getByText(/Weekly Document Intake/i)).toBeInTheDocument();
    expect(screen.getByText(/สถิติรอบสัปดาห์/i)).toBeInTheDocument();
    expect(screen.getByText(/รวม 57 ฉบับ/i)).toBeInTheDocument();

    // 7 day labels
    ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });

    // Peak alert
    expect(
      screen.getByText(/วันพุธ มีปริมาณเอกสารเข้าตรวจสูงสุด \(Peak Day\) ควรเตรียมพร้อมช่วงบ่าย/i)
    ).toBeInTheDocument();

    // Star on today
    expect(screen.getByText('★')).toBeInTheDocument();

    // SVG bars
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(7);

    // Grid lines (3 horizontal lines)
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(3);
  });

  it('renders with custom data and calculates total volume correctly', () => {
    const customData: DailyVolume[] = [
      { dayLabel: 'Mon', incomingCount: 10, clearedCount: 8 },
      { dayLabel: 'Tue', incomingCount: 20, clearedCount: 18, isToday: true },
      { dayLabel: 'Wed', incomingCount: 15, clearedCount: 12 },
    ];

    const { container } = render(
      <WeeklyVolumeBarChart data={customData} peakDayLabel="อังคาร" />
    );

    expect(screen.getByText(/รวม 45 ฉบับ/i)).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText(/วันอังคาร มีปริมาณเอกสารเข้าตรวจสูงสุด/i)).toBeInTheDocument();

    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(3);

    // Tue is today, fill should be #0284C7
    expect(rects[1].getAttribute('fill')).toBe('#0284C7');
    // Mon is not today, fill should be #CBD5E1
    expect(rects[0].getAttribute('fill')).toBe('#CBD5E1');
  });

  it('handles empty data gracefully', () => {
    const { container } = render(<WeeklyVolumeBarChart data={[]} />);

    expect(screen.getByText(/รวม 0 ฉบับ/i)).toBeInTheDocument();
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(0);
  });

  it('handles data with no isToday specified (no star indicator)', () => {
    const customData: DailyVolume[] = [
      { dayLabel: 'จ.', incomingCount: 5, clearedCount: 4 },
      { dayLabel: 'อ.', incomingCount: 7, clearedCount: 7 },
    ];

    render(<WeeklyVolumeBarChart data={customData} />);

    expect(screen.queryByText('★')).toBeNull();
  });

  it('clamps bar heights correctly without negative or out-of-bounds values', () => {
    const extremeData: DailyVolume[] = [
      { dayLabel: 'Zero', incomingCount: 0, clearedCount: 0 },
      { dayLabel: 'Huge', incomingCount: 100, clearedCount: 90 },
    ];

    const { container } = render(<WeeklyVolumeBarChart data={extremeData} />);

    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(2);

    // 0 count should have height 0, y = 75
    expect(rects[0].getAttribute('height')).toBe('0');
    expect(rects[0].getAttribute('y')).toBe('75');

    // 100 count should be capped at 65, y = 75 - 65 = 10
    expect(rects[1].getAttribute('height')).toBe('65');
    expect(rects[1].getAttribute('y')).toBe('10');
  });
});
