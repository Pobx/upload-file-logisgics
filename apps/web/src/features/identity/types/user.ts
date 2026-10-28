export type UserRole = 'admin' | 'staff' | 'viewer';

export interface User {
  sub: string;
  username: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  department?: string;
  employee_id?: string;
  email?: string;
  source: string;
  is_active: boolean;
  synced_at?: string;
  roles?: string[];
  // Clean domain model aliases
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  isActive?: boolean;
  syncedAt?: string;
}

export type UserProfile = User;
