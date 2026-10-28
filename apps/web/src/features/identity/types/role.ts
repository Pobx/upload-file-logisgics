import type { UserRole } from './user';

export function canUploadDocuments(role: UserRole | string): boolean {
  const norm = (role || '').toLowerCase();
  return norm === 'admin' || norm === 'staff';
}

export function canDeleteDocuments(role: UserRole | string): boolean {
  return (role || '').toLowerCase() === 'admin';
}

export function isAdmin(role?: UserRole | string | (UserRole | string)[]): boolean {
  if (!role) return false;
  if (Array.isArray(role)) {
    return role.some((r) => r.toLowerCase() === 'admin');
  }
  return role.toLowerCase() === 'admin';
}

export function isStaff(role?: UserRole | string | (UserRole | string)[]): boolean {
  if (!role) return false;
  if (Array.isArray(role)) {
    return role.some((r) => r.toLowerCase() === 'staff');
  }
  return role.toLowerCase() === 'staff';
}

export function isViewer(role?: UserRole | string | (UserRole | string)[]): boolean {
  if (!role) return false;
  if (Array.isArray(role)) {
    return role.some((r) => r.toLowerCase() === 'viewer');
  }
  return role.toLowerCase() === 'viewer';
}
