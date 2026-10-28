import { describe, it, expect } from 'vitest';
import { getFilteredNavItems } from './DocFlowSidebar';

describe('DocFlow Navigation Role Filtering', () => {
  it('viewer should see only Search and Customers (strictly hides CSV Import and Users)', () => {
    const items = getFilteredNavItems(['viewer']);
    const hrefs = items.map(i => i.href);
    expect(hrefs).toEqual(['/', '/customers']);
  });

  it('staff should see Search, CSV Import, and Customers (strictly hides Users)', () => {
    const items = getFilteredNavItems(['staff']);
    const hrefs = items.map(i => i.href);
    expect(hrefs).toEqual(['/', '/import', '/customers']);
  });

  it('admin should see all 4 items', () => {
    const items = getFilteredNavItems(['admin']);
    const hrefs = items.map(i => i.href);
    expect(hrefs).toEqual(['/', '/import', '/customers', '/users']);
  });
});
