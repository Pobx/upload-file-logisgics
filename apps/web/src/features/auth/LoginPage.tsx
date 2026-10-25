import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient, setAuthToken } from '../../lib/api-client';
import { Lock, LogIn, ShieldAlert, CheckCircle2, UserCheck, Shield } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  const [username, setUsername] = useState('admin_user');
  const [password, setPassword] = useState('Admin1234!');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (u: string, p: string) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', {
        username: u,
        password: p,
      });
      const token = res.data?.data?.access_token;
      if (token) {
        setAuthToken(token);
        navigate('/');
      } else {
        setErrorMsg('ไม่สามารถเข้าสู่ระบบได้ ไม่พบ Token');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(username, password);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white text-center">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold">เข้าสู่ระบบจัดการเอกสาร</h1>
          <p className="text-xs text-indigo-100 mt-1">
            Logistics Document Upload & Search System
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Reason Notification Banner */}
          {reason && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl flex items-start gap-2.5 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  {reason === 'token_revoked'
                    ? 'โทเค็นถูกเพิกถอน (Token Revoked)'
                    : 'เซสชันการใช้งานหมดอายุ (Session Expired)'}
                </p>
                <p className="text-amber-700 mt-0.5">
                  กรุณาเข้าสู่ระบบใหม่อีกครั้งเพื่อดำเนินการต่อ
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Quick Login Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              เข้าสู่ระบบด่วน (Quick Presets)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setUsername('admin_user');
                  setPassword('Admin1234!');
                  handleLogin('admin_user', 'Admin1234!');
                }}
                className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-center transition-all group"
              >
                <Shield className="w-4 h-4 text-indigo-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-slate-800">Admin</div>
                <div className="text-[10px] text-slate-400">สิทธิ์เต็ม</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsername('staff_user');
                  setPassword('Staff1234!');
                  handleLogin('staff_user', 'Staff1234!');
                }}
                className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-center transition-all group"
              >
                <UserCheck className="w-4 h-4 text-blue-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-slate-800">Staff</div>
                <div className="text-[10px] text-slate-400">ปฏิบัติการ</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsername('viewer_user');
                  setPassword('Viewer1234!');
                  handleLogin('viewer_user', 'Viewer1234!');
                }}
                className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-center transition-all group"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-slate-800">Viewer</div>
                <div className="text-[10px] text-slate-400">อ่านเท่านั้น</div>
              </button>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-xs text-slate-400 font-medium">หรือกรอกชื่อผู้ใช้</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ชื่อผู้ใช้งาน (Username)
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น admin_user, staff_user"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                รหัสผ่าน (Password)
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
