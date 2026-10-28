import { useState, useCallback, useMemo } from 'react';
import { authApi } from '../api/authApi';
import { LoginCredentials, UserInfo } from '../types/auth';
import { isAdmin, isStaff, isViewer } from '../types/role';
import { getUserInfo } from '@/shared/lib/tokenStorage';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(() => getUserInfo());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = useMemo(() => currentUser?.roles || [], [currentUser]);
  const userRole = useMemo(() => roles[0] || 'viewer', [roles]);
  const admin = useMemo(() => isAdmin(roles), [roles]);
  const staff = useMemo(() => isStaff(roles), [roles]);
  const viewer = useMemo(() => isViewer(roles), [roles]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login(credentials);
      if (res?.access_token) {
        const info = getUserInfo();
        setCurrentUser(info);
        return res;
      } else {
        throw new Error('ไม่สามารถเข้าสู่ระบบได้ ไม่พบ Token');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authApi.logout();
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSession = useCallback(() => {
    const info = getUserInfo();
    setCurrentUser(info);
    return info;
  }, []);

  return {
    currentUser,
    roles,
    userRole,
    isAdmin: admin,
    isStaff: staff,
    isViewer: viewer,
    loading,
    error,
    login,
    logout,
    refreshSession,
  };
};
