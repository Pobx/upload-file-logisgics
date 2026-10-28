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

  it('renders red segment when invoice is missing', () => {
    const { container } = render(
      <MicroProgressBar hasInvoice={false} hasPackingList={true} hasBL={true} />
    );
    const redSegments = container.querySelectorAll('.bg-rose-500');
    expect(redSegments.length).toBe(1);
    expect(container.querySelectorAll('.bg-emerald-500').length).toBe(2);
  });

  it('renders amber segment when packing list is missing', () => {
    const { container } = render(
      <MicroProgressBar hasInvoice={true} hasPackingList={false} hasBL={true} />
    );
    const amberSegments = container.querySelectorAll('.bg-amber-500');
    expect(amberSegments.length).toBe(1);
    expect(container.querySelectorAll('.bg-emerald-500').length).toBe(2);
  });

  it('applies custom className and has role="progressbar"', () => {
    render(
      <MicroProgressBar hasInvoice={true} hasPackingList={true} hasBL={true} className="custom-class" />
    );
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeDefined();
    expect(bar.className).toContain('custom-class');
  });
});
