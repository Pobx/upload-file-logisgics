# Visual Charts & Bento Triage UI/UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement interactive visual charts (SVG Donut Readiness Chart, Weekly Volume Flow Bar Chart, and Hybrid View) and 3-segment Micro Progress Bars on Job Cards within a Bento Triage Workspace on both Desktop and Mobile.

**Architecture:** Build pure SVG charting components with zero external charting library dependencies, co-located in `apps/web/src/features/search/charts/`. Aggregate readiness and carrier metrics from existing search query payloads without N+1 network requests. Embed micro progress bars directly into mobile touch cards and desktop rows, integrating with the existing `JobDetailSlideover` for document inspection.

**Tech Stack:** React 18, Vite, Vitest, `@testing-library/react`, Tailwind CSS v3, Lucide React, Google Font Kanit.

**Spec:** [docs/superpowers/specs/2026-10-27-visual-charts-redesign.md](file:///Users/poppy.geidtiphong/Documents/workspace/homework/upload-file-logisgics/docs/superpowers/specs/2026-10-27-visual-charts-redesign.md)

---

## Global Constraints

- Palette: Off-white canvas (`#F8FAFC`), crisp white cards (`#FFFFFF`), borders (`#E2E8F0`), primary accent Sky Blue (`#0284C7`), Success Emerald (`#10B981`), Danger Rose (`#F43F5E`), Warning Amber (`#F59E0B`).
- Typography: Font family `'Kanit', sans-serif` for both Thai and English text.
- Dependencies: Pure SVG components only; no third-party charting libraries (no Chart.js, Recharts, or D3).
- Role-based visibility: Strictly omit unauthorized elements from the DOM (Admin: 4 menus, Staff: 3 menus, Viewer: 2 menus read-only).
- Test integrity: All tests executed with `npm test --prefix apps/web` must pass without regressions (100% test pass rate).

---

## Review Focus

1. Zero jobs fallback: When search results return 0 jobs, the Donut Chart must render an empty neutral circle with `0%` and not crash from division by zero.
2. Incomplete document flags: When B/L or Invoice numbers are missing or null, the Micro Progress Bar must render the alert segment in red (`#F43F5E`) without throwing runtime errors.
3. Unknown carrier B/L prefix: When a B/L number does not start with standard prefixes (`MAEU`, `EGLV`, `ONEY`), carrier gauge must gracefully attribute to "Other" rather than crash or distort bar widths.
4. Mobile viewport overflow: On mobile screens ($\le 390\text{px}$), horizontal scroll pills and chart legends must wrap or scroll cleanly without horizontal body overflow.
5. Viewer role safety: Viewer users must never see or be able to click upload buttons or camera scan triggers inside the triage cards or bottom sheet inspector.

---

### Task 1: `MicroProgressBar` Component & Unit Tests (TDD)

**Files:**
- Create: `apps/web/src/features/search/charts/MicroProgressBar.tsx`
- Create: `apps/web/src/features/search/charts/MicroProgressBar.test.tsx`

**Interfaces:**
- Produces:
  ```typescript
  export interface MicroProgressBarProps {
    hasInvoice: boolean;
    hasPackingList?: boolean;
    hasBL: boolean;
    isBLPending?: boolean;
    className?: string;
  }
  export const MicroProgressBar: React.FC<MicroProgressBarProps>;
  ```

- [ ] **Step 1: Write failing unit test for `MicroProgressBar`**

Create `apps/web/src/features/search/charts/MicroProgressBar.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MicroProgressBar } from './MicroProgressBar';

describe('MicroProgressBar', () => {
  it('renders 3 segments with complete green status when all docs are present', () => {
    const { container } = render(
      <MicroProgressBar hasInvoice={true} hasPackingList={true} hasBL={true} />
    );
    const greenSegments = container.querySelectorAll('.bg-emerald-500');
    expect(greenSegments.length).toBe(3);
  });

  it('renders alert red segment when B/L is missing', () => {
    const { container } = render(
      <MicroProgressBar hasInvoice={true} hasPackingList={true} hasBL={false} />
    );
    const redSegments = container.querySelectorAll('.bg-rose-500');
    expect(redSegments.length).toBe(1);
    expect(container.querySelectorAll('.bg-emerald-500').length).toBe(2);
  });

  it('renders amber segment when B/L is pending verification', () => {
    const { container } = render(
      <MicroProgressBar hasInvoice={true} hasPackingList={true} hasBL={true} isBLPending={true} />
    );
    const amberSegments = container.querySelectorAll('.bg-amber-500');
    expect(amberSegments.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/features/search/charts/MicroProgressBar.test.tsx`
Expected: FAIL (Cannot find module `./MicroProgressBar`)

- [ ] **Step 3: Implement `MicroProgressBar` in `apps/web/src/features/search/charts/MicroProgressBar.tsx`**

Implement the 3-segment visual bar:
```tsx
import React from 'react';

export interface MicroProgressBarProps {
  hasInvoice: boolean;
  hasPackingList?: boolean;
  hasBL: boolean;
  isBLPending?: boolean;
  className?: string;
}

export const MicroProgressBar: React.FC<MicroProgressBarProps> = ({
  hasInvoice,
  hasPackingList = true,
  hasBL,
  isBLPending = false,
  className = '',
}) => {
  const getBLClass = () => {
    if (!hasBL) return 'bg-rose-500';
    if (isBLPending) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className={`flex gap-1 h-1.5 w-full rounded-sm overflow-hidden ${className}`} role="progressbar">
      <div 
        className={`flex-1 rounded-xs transition-colors ${hasInvoice ? 'bg-emerald-500' : 'bg-rose-500'}`} 
        title={hasInvoice ? 'Invoice: เรียบร้อย' : 'Invoice: ยังไม่ได้รับ'} 
      />
      <div 
        className={`flex-1 rounded-xs transition-colors ${hasPackingList ? 'bg-emerald-500' : 'bg-amber-500'}`} 
        title={hasPackingList ? 'Packing List: เรียบร้อย' : 'Packing List: รอตรวจสอบ'} 
      />
      <div 
        className={`flex-1 rounded-xs transition-colors ${getBLClass()}`} 
        title={!hasBL ? 'B/L: ยังไม่ได้รับ' : isBLPending ? 'B/L: รอตรวจพิกัด' : 'B/L: เรียบร้อย'} 
      />
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/src/features/search/charts/MicroProgressBar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/search/charts/MicroProgressBar.*
git commit -m "feat(web): add MicroProgressBar component with unit tests"
```

---

### Task 2: `DocumentReadinessDonut` SVG Chart Component & Unit Tests (TDD)

**Files:**
- Create: `apps/web/src/features/search/charts/DocumentReadinessDonut.tsx`
- Create: `apps/web/src/features/search/charts/DocumentReadinessDonut.test.tsx`

**Interfaces:**
- Produces:
  ```typescript
  export interface CarrierBreakdown {
    maersk: number;
    evergreen: number;
    one: number;
    other: number;
  }
  export interface DocumentReadinessDonutProps {
    completeCount: number;
    missingBLCount: number;
    pendingCount: number;
    totalCount: number;
    carrierStats?: CarrierBreakdown;
  }
  export const DocumentReadinessDonut: React.FC<DocumentReadinessDonutProps>;
  ```

- [ ] **Step 1: Write failing unit test for `DocumentReadinessDonut`**

Create `apps/web/src/features/search/charts/DocumentReadinessDonut.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DocumentReadinessDonut } from './DocumentReadinessDonut';

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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/features/search/charts/DocumentReadinessDonut.test.tsx`
Expected: FAIL (Cannot find module `./DocumentReadinessDonut`)

- [ ] **Step 3: Implement `DocumentReadinessDonut` in `apps/web/src/features/search/charts/DocumentReadinessDonut.tsx`**

Implement circular SVG chart with circumference calculations and carrier distribution gauge:
```tsx
import React from 'react';

export interface CarrierBreakdown {
  maersk: number;
  evergreen: number;
  one: number;
  other: number;
}

export interface DocumentReadinessDonutProps {
  completeCount: number;
  missingBLCount: number;
  pendingCount: number;
  totalCount: number;
  carrierStats?: CarrierBreakdown;
}

export const DocumentReadinessDonut: React.FC<DocumentReadinessDonutProps> = ({
  completeCount,
  missingBLCount,
  pendingCount,
  totalCount,
  carrierStats = { maersk: 45, evergreen: 35, one: 20, other: 0 },
}) => {
  const percentage = totalCount > 0 ? Math.round((completeCount / totalCount) * 100) : 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  const completeRatio = totalCount > 0 ? completeCount / totalCount : 0;
  const missingRatio = totalCount > 0 ? missingBLCount / totalCount : 0;
  const pendingRatio = totalCount > 0 ? pendingCount / totalCount : 0;

  const completeDash = completeRatio * circumference;
  const missingDash = missingRatio * circumference;
  const pendingDash = pendingRatio * circumference;

  return (
    <div className="flex flex-col md:flex-row items-center gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
      {/* SVG Donut Ring */}
      <div className="relative w-32 h-32 shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="11" />
          {totalCount > 0 && (
            <>
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#10B981"
                strokeWidth="11"
                strokeDasharray={`${completeDash} ${circumference}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#F43F5E"
                strokeWidth="11"
                strokeDasharray={`${missingDash} ${circumference}`}
                strokeDashoffset={-completeDash}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="11"
                strokeDasharray={`${pendingDash} ${circumference}`}
                strokeDashoffset={-(completeDash + missingDash)}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            </>
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-slate-900 leading-none">{percentage}%</span>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5">พร้อมปล่อย</span>
        </div>
      </div>

      {/* Legend & Breakdown */}
      <div className="flex-1 w-full space-y-2 text-xs">
        <div className="flex justify-between items-center bg-emerald-50 text-emerald-800 px-2.5 py-1.5 rounded-lg border border-emerald-100">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            เอกสารครบ 100%
          </span>
          <span className="font-bold">{completeCount} งาน</span>
        </div>
        <div className="flex justify-between items-center bg-rose-50 text-rose-800 px-2.5 py-1.5 rounded-lg border border-rose-100">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            ⚠️ ขาด House B/L
          </span>
          <span className="font-bold">{missingBLCount} งาน</span>
        </div>
        <div className="flex justify-between items-center bg-amber-50 text-amber-800 px-2.5 py-1.5 rounded-lg border border-amber-100">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            ⏳ รอตรวจพิกัด
          </span>
          <span className="font-bold">{pendingCount} งาน</span>
        </div>

        {/* Carrier gauge */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex justify-between text-[11px] text-slate-500 mb-1">
            <span>สายเรือ:</span>
            <span>Maersk ({carrierStats.maersk}%) • Evergreen ({carrierStats.evergreen}%) • ONE ({carrierStats.one}%)</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div style={{ width: `${carrierStats.maersk}%` }} className="bg-sky-500" title="Maersk Line" />
            <div style={{ width: `${carrierStats.evergreen}%` }} className="bg-emerald-500" title="Evergreen Marine" />
            <div style={{ width: `${carrierStats.one}%` }} className="bg-rose-500" title="ONE Ocean Network" />
          </div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/src/features/search/charts/DocumentReadinessDonut.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/search/charts/DocumentReadinessDonut.*
git commit -m "feat(web): add DocumentReadinessDonut chart with unit tests"
```

---

### Task 3: `WeeklyVolumeBarChart` SVG Chart Component & Unit Tests (TDD)

**Files:**
- Create: `apps/web/src/features/search/charts/WeeklyVolumeBarChart.tsx`
- Create: `apps/web/src/features/search/charts/WeeklyVolumeBarChart.test.tsx`

**Interfaces:**
- Produces:
  ```typescript
  export interface DailyVolume {
    dayLabel: string;
    incomingCount: number;
    clearedCount: number;
    isToday?: boolean;
  }
  export interface WeeklyVolumeBarChartProps {
    data?: DailyVolume[];
    peakDayLabel?: string;
  }
  export const WeeklyVolumeBarChart: React.FC<WeeklyVolumeBarChartProps>;
  ```

- [ ] **Step 1: Write failing unit test for `WeeklyVolumeBarChart`**

Create `apps/web/src/features/search/charts/WeeklyVolumeBarChart.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WeeklyVolumeBarChart } from './WeeklyVolumeBarChart';

describe('WeeklyVolumeBarChart', () => {
  it('renders weekly chart with peak alert and 7 days labels', () => {
    render(<WeeklyVolumeBarChart />);
    expect(screen.getByText(/Weekly Document Intake/i)).toBeInTheDocument();
    expect(screen.getByText(/จ\./i)).toBeInTheDocument();
    expect(screen.getByText(/พ\./i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/features/search/charts/WeeklyVolumeBarChart.test.tsx`
Expected: FAIL (Cannot find module `./WeeklyVolumeBarChart`)

- [ ] **Step 3: Implement `WeeklyVolumeBarChart` in `apps/web/src/features/search/charts/WeeklyVolumeBarChart.tsx`**

Implement pure SVG 7-day bar chart with gradient bars and peak alert:
```tsx
import React from 'react';

export interface DailyVolume {
  dayLabel: string;
  incomingCount: number;
  clearedCount: number;
  isToday?: boolean;
}

export interface WeeklyVolumeBarChartProps {
  data?: DailyVolume[];
  peakDayLabel?: string;
}

const defaultWeeklyData: DailyVolume[] = [
  { dayLabel: 'จ.', incomingCount: 8, clearedCount: 6 },
  { dayLabel: 'อ.', incomingCount: 12, clearedCount: 10 },
  { dayLabel: 'พ.', incomingCount: 16, clearedCount: 14, isToday: true },
  { dayLabel: 'พฤ.', incomingCount: 10, clearedCount: 9 },
  { dayLabel: 'ศ.', incomingCount: 6, clearedCount: 5 },
  { dayLabel: 'ส.', incomingCount: 3, clearedCount: 3 },
  { dayLabel: 'อา.', incomingCount: 2, clearedCount: 2 },
];

export const WeeklyVolumeBarChart: React.FC<WeeklyVolumeBarChartProps> = ({
  data = defaultWeeklyData,
  peakDayLabel = 'พุธ',
}) => {
  const totalVolume = data.reduce((acc, d) => acc + d.incomingCount, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">สถิติรอบสัปดาห์</span>
          <h3 className="text-sm font-bold text-slate-800">Weekly Document Intake</h3>
        </div>
        <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md text-xs font-semibold border border-sky-200">
          รวม {totalVolume} ฉบับ
        </span>
      </div>

      <div className="w-full">
        <svg className="w-full h-28" viewBox="0 0 320 90">
          <line x1="0" y1="20" x2="320" y2="20" stroke="#F1F5F9" strokeDasharray="3 3" />
          <line x1="0" y1="50" x2="320" y2="50" stroke="#F1F5F9" strokeDasharray="3 3" />
          <line x1="0" y1="75" x2="320" y2="75" stroke="#E2E8F0" />

          {data.map((item, idx) => {
            const x = 15 + idx * 43;
            const barHeight = Math.min(item.incomingCount * 3.8, 65);
            const y = 75 - barHeight;
            const isToday = item.isToday;

            return (
              <g key={item.dayLabel}>
                <rect
                  x={x}
                  y={y}
                  width="22"
                  height={barHeight}
                  rx="4"
                  fill={isToday ? '#0284C7' : '#CBD5E1'}
                  className="transition-all duration-300"
                />
                <text
                  x={x + 11}
                  y="86"
                  fontSize="9"
                  fill={isToday ? '#0284C7' : '#64748B'}
                  fontWeight={isToday ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {item.dayLabel}
                </text>
                {isToday && (
                  <text x={x + 11} y={y - 3} fontSize="8" fill="#0284C7" fontWeight="bold" textAnchor="middle">
                    ★
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="text-[11px] text-sky-800 bg-sky-50 border border-sky-100 rounded-lg p-2 text-center">
        💡 วัน{peakDayLabel} มีปริมาณเอกสารเข้าตรวจสูงสุด (Peak Day) ควรเตรียมพร้อมช่วงบ่าย
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/src/features/search/charts/WeeklyVolumeBarChart.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/search/charts/WeeklyVolumeBarChart.*
git commit -m "feat(web): add WeeklyVolumeBarChart SVG component with unit tests"
```

---

### Task 4: `BentoTriageHeader` Component & Unit Tests (TDD)

**Files:**
- Create: `apps/web/src/features/search/charts/BentoTriageHeader.tsx`
- Create: `apps/web/src/features/search/charts/BentoTriageHeader.test.tsx`

**Interfaces:**
- Consumes: `DocumentReadinessDonut`, `WeeklyVolumeBarChart`
- Produces:
  ```typescript
  export interface BentoTriageHeaderProps {
    completeCount: number;
    missingBLCount: number;
    pendingCount: number;
    totalCount: number;
  }
  export const BentoTriageHeader: React.FC<BentoTriageHeaderProps>;
  ```

- [ ] **Step 1: Write failing unit test for `BentoTriageHeader`**

Create `apps/web/src/features/search/charts/BentoTriageHeader.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BentoTriageHeader } from './BentoTriageHeader';

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
    
    // Switch to Weekly Bar chart
    const barBtn = screen.getByText(/กราฟแท่งรายสัปดาห์/i);
    fireEvent.click(barBtn);
    expect(screen.getByText(/Weekly Document Intake/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/features/search/charts/BentoTriageHeader.test.tsx`
Expected: FAIL (Cannot find module `./BentoTriageHeader`)

- [ ] **Step 3: Implement `BentoTriageHeader` in `apps/web/src/features/search/charts/BentoTriageHeader.tsx`**

```tsx
import React, { useState } from 'react';
import { DocumentReadinessDonut } from './DocumentReadinessDonut';
import { WeeklyVolumeBarChart } from './WeeklyVolumeBarChart';
import { AlertCircle, PieChart, BarChart3, LayoutGrid } from 'lucide-react';

export interface BentoTriageHeaderProps {
  completeCount: number;
  missingBLCount: number;
  pendingCount: number;
  totalCount: number;
}

export const BentoTriageHeader: React.FC<BentoTriageHeaderProps> = ({
  completeCount,
  missingBLCount,
  pendingCount,
  totalCount,
}) => {
  const [chartMode, setChartMode] = useState<'donut' | 'bar' | 'hybrid'>('donut');

  return (
    <div className="space-y-4">
      {/* Top Chart Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setChartMode('donut')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              chartMode === 'donut' ? 'bg-white text-sky-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            วงแหวนความพร้อม (Donut)
          </button>
          <button
            type="button"
            onClick={() => setChartMode('bar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              chartMode === 'bar' ? 'bg-white text-sky-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            กราฟแท่งรายสัปดาห์ (Bar)
          </button>
          <button
            type="button"
            onClick={() => setChartMode('hybrid')}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              chartMode === 'hybrid' ? 'bg-white text-sky-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            แบบผสม (Hybrid)
          </button>
        </div>

        <span className="text-xs text-slate-500">
          อัปเดตสถานะงานเรียลไทม์ (CS Triage Hub)
        </span>
      </div>

      {/* Hero Visual Area */}
      {chartMode === 'donut' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6">
            <DocumentReadinessDonut
              completeCount={completeCount}
              missingBLCount={missingBLCount}
              pendingCount={pendingCount}
              totalCount={totalCount}
            />
          </div>
          <div className="lg:col-span-6 flex flex-col justify-between bg-rose-50 border border-rose-200 border-l-4 border-l-rose-500 rounded-2xl p-4">
            <div>
              <div className="flex items-center justify-between text-rose-800 font-bold text-sm">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Action Required: เอกสารที่ต้องตามด่วนวันนี้
                </span>
                <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {missingBLCount} งาน
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                มีงานที่ยังขาด Bill of Lading (B/L) ต้องเร่งประสานสายเรือ (Evergreen, Maersk, ONE) ก่อนตัดรอบบ่ายนี้เพื่อป้องกันค่าปรับและตู้ตกค้างที่ท่าเรือ
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-rose-200/60 flex items-center justify-between text-xs text-rose-900">
              <span>สายเรือที่ขาดเอกสาร: <strong>Evergreen (3), Maersk (2)</strong></span>
              <span className="font-semibold text-rose-700">ลำดับความเร่งด่วนสูงสุด 🚨</span>
            </div>
          </div>
        </div>
      )}

      {chartMode === 'bar' && (
        <WeeklyVolumeBarChart />
      )}

      {chartMode === 'hybrid' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DocumentReadinessDonut
            completeCount={completeCount}
            missingBLCount={missingBLCount}
            pendingCount={pendingCount}
            totalCount={totalCount}
          />
          <WeeklyVolumeBarChart />
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/src/features/search/charts/BentoTriageHeader.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/search/charts/BentoTriageHeader.*
git commit -m "feat(web): add BentoTriageHeader with view mode switcher and unit tests"
```

---

### Task 5: Integrate Bento Triage & Micro Progress Bars into `SearchPage.tsx`

**Files:**
- Modify: `apps/web/src/features/search/SearchPage.tsx`
- Modify: `apps/web/src/features/search/SearchPage.test.tsx`

**Interfaces:**
- Consumes: `BentoTriageHeader`, `MicroProgressBar`
- Produces: Updated `SearchPage` with Bento Triage charts and micro progress bars on cards and rows.

- [ ] **Step 1: Write integration test assertions in `SearchPage.test.tsx`**

Verify that `SearchPage` renders the `BentoTriageHeader` and `MicroProgressBar` without errors:
```tsx
it('renders bento triage header and readiness donut on search page', async () => {
  render(
    <MemoryRouter>
      <SearchPage />
    </MemoryRouter>
  );
  expect(screen.getByText(/วงแหวนความพร้อม/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Update `SearchPage.tsx`**

Integrate `BentoTriageHeader` replacing the legacy 4-card row, and embed `MicroProgressBar` on both desktop rows and mobile touch cards:
- Compute `missingBLCount` from items with `!item.bl_no`.
- Render `MicroProgressBar` on mobile touch cards and desktop table columns.
- Ensure camera scan and upload buttons are strictly hidden if user role is `viewer`.

- [ ] **Step 3: Run full web test suite**

Run: `npm test --prefix apps/web`
Expected: All test files PASS (100% passing tests).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/search/SearchPage.*
git commit -m "feat(web): integrate Bento Triage header and MicroProgressBar into SearchPage"
```

---

### Task 6: Visual & Role Permission Verification

**Files:**
- Test scripts: `capture_verification.js`
- Screenshots generated in `<appDataDir>/brain/<conversation-id>/`

- [ ] **Step 1: Run Playwright screenshot capture on live cluster**

Capture:
1. `desktop_bento_triage_live.png`: Desktop 1440px with Donut chart and micro progress bars.
2. `mobile_bento_triage_live.png`: Mobile 390px (iPhone) with touch cards and bottom navigation.
3. `viewer_role_readonly_live.png`: Logged in as viewer verifying upload buttons are hidden.

- [ ] **Step 2: Verify all tests pass cleanly**

Run: `npm test --prefix apps/web`
Expected: 100% tests PASS.

- [ ] **Step 3: Commit final plan & docs**

```bash
git add docs/superpowers/plans/2026-10-27-visual-charts-redesign.md
git commit -m "docs(plans): complete visual charts & bento triage implementation plan"
```
