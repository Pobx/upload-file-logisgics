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
  it('renders weekly chart with default data, peak alert, paired bars, and 7 day labels', () => {
    const { container } = render(<WeeklyVolumeBarChart />);

    expect(screen.getByText(/Weekly Document Intake/i)).toBeInTheDocument();
    expect(screen.getByText(/สถิติรอบสัปดาห์/i)).toBeInTheDocument();
    expect(screen.getByText(/รวม 57 ฉบับ/i)).toBeInTheDocument();
    expect(screen.getAllByText(/เข้าตรวจ/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/ปล่อยแล้ว/i)).toBeInTheDocument();

    // 7 day labels
    ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });

    // Dynamic peak alert (default data max incoming is Wednesday 'พ.' -> 'พุธ')
    expect(
      screen.getByText(/วันพุธ มีปริมาณเอกสารเข้าตรวจสูงสุด \(Peak Day\) ควรเตรียมพร้อมช่วงบ่าย/i)
    ).toBeInTheDocument();

    // Star on today
    expect(screen.getByText('★')).toBeInTheDocument();

    // Paired SVG bars: 7 days * 2 bars = 14 rects
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(14);

    const incomingBars = container.querySelectorAll('rect[data-type="incoming"]');
    const clearedBars = container.querySelectorAll('rect[data-type="cleared"]');
    expect(incomingBars.length).toBe(7);
    expect(clearedBars.length).toBe(7);

    // Grid lines (3 horizontal lines)
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(3);
  });

  it('renders with custom data and calculates total volume correctly with paired bars', () => {
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

    // 3 items * 2 bars = 6 rects
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(6);

    // Mon (index 0): incoming is sky-500 (#0EA5E9), cleared is emerald-500 (#10B981)
    expect(rects[0].getAttribute('fill')).toBe('#0EA5E9');
    expect(rects[1].getAttribute('fill')).toBe('#10B981');

    // Tue (index 1, isToday): incoming is #0284C7, cleared is #059669
    expect(rects[2].getAttribute('fill')).toBe('#0284C7');
    expect(rects[3].getAttribute('fill')).toBe('#059669');
  });

  it('computes peak day dynamically from data when peakDayLabel is omitted', () => {
    const customData: DailyVolume[] = [
      { dayLabel: 'จ.', incomingCount: 5, clearedCount: 4 },
      { dayLabel: 'ศ.', incomingCount: 25, clearedCount: 20 },
      { dayLabel: 'อ.', incomingCount: 10, clearedCount: 8 },
    ];

    render(<WeeklyVolumeBarChart data={customData} />);

    // Max incomingCount is 25 on Friday 'ศ.' -> 'ศุกร์'
    expect(
      screen.getByText(/วันศุกร์ มีปริมาณเอกสารเข้าตรวจสูงสุด/i)
    ).toBeInTheDocument();
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
    expect(rects.length).toBe(4);

    // 0 count should have height 0, y = 75
    expect(rects[0].getAttribute('height')).toBe('0');
    expect(rects[0].getAttribute('y')).toBe('75');
    expect(rects[1].getAttribute('height')).toBe('0');
    expect(rects[1].getAttribute('y')).toBe('75');

    // 100 count should be capped at 65, y = 75 - 65 = 10
    expect(rects[2].getAttribute('height')).toBe('65');
    expect(rects[2].getAttribute('y')).toBe('10');
    // 90 count capped at 65
    expect(rects[3].getAttribute('height')).toBe('65');
    expect(rects[3].getAttribute('y')).toBe('10');
  });

  it('dynamically spaces bars so arrays with > 7 elements do not overflow the viewBox', () => {
    // 14 days of data (e.g. 2-week sprint)
    const fortnightData: DailyVolume[] = Array.from({ length: 14 }, (_, i) => ({
      dayLabel: `D${i + 1}`,
      incomingCount: (i % 5) + 3,
      clearedCount: (i % 5) + 2,
    }));

    const { container } = render(<WeeklyVolumeBarChart data={fortnightData} />);

    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(28); // 14 * 2

    // Verify all bars are within [0, 320]
    rects.forEach((rect) => {
      const x = parseFloat(rect.getAttribute('x') || '0');
      const width = parseFloat(rect.getAttribute('width') || '0');
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + width).toBeLessThanOrEqual(320);
    });
  });
});
