import { describe, it, expect } from 'vitest';
import { canUploadDocuments, canDeleteDocuments } from './JobDetailSlideover';

describe('JobDetailSlideover Permissions', () => {
  it('viewer cannot upload or delete documents', () => {
    expect(canUploadDocuments('viewer')).toBe(false);
    expect(canDeleteDocuments('viewer')).toBe(false);
  });

  it('staff can upload documents but cannot delete', () => {
    expect(canUploadDocuments('staff')).toBe(true);
    expect(canDeleteDocuments('staff')).toBe(false);
  });

  it('admin can both upload and delete documents', () => {
    expect(canUploadDocuments('admin')).toBe(true);
    expect(canDeleteDocuments('admin')).toBe(true);
  });
});
