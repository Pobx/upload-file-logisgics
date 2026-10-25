import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient, setAuthToken } from '../../lib/api-client';
import { FileText, LogIn, ShieldAlert, UserCheck, Shield, Eye, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans antialiased">
      <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Brand Header */}
        <div className="bg-gradient-to-br from-sky-600 to-sky-700 p-7 text-white text-center">
          <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">DocFlow Logistics</h1>
          <p className="text-xs text-sky-100 mt-1">
            ระบบจัดเก็บและสืบค้นเอกสารโลจิสติกส์
          </p>
        </div>

        <div className="p-6 md:p-8 space-y-5">
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
                  กรุณาเข้าสู่ระบบใหม่อีกครั้งเพื่อเริ่มทำงาน
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              เลือกบัญชีจำลองเพื่อทดสอบด่วน:
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setUsername('admin_user');
                  setPassword('Admin1234!');
                  handleLogin('admin_user', 'Admin1234!');
                }}
                className="flex flex-col items-center p-2.5 rounded-lg border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 transition-all text-center group cursor-pointer"
              >
                <Shield className="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-800">Admin</span>
                <span className="text-[10px] text-slate-400">4 เมนู</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsername('staff_user');
                  setPassword('Staff1234!');
                  handleLogin('staff_user', 'Staff1234!');
                }}
                className="flex flex-col items-center p-2.5 rounded-lg border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 transition-all text-center group cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-sky-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-800">CS Staff</span>
                <span className="text-[10px] text-slate-400">3 เมนู</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsername('viewer_user');
                  setPassword('Viewer1234!');
                  handleLogin('viewer_user', 'Viewer1234!');
                }}
                className="flex flex-col items-center p-2.5 rounded-lg border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 transition-all text-center group cursor-pointer"
              >
                <Eye className="w-4 h-4 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-800">Viewer</span>
                <span className="text-[10px] text-slate-400">2 เมนู</span>
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-2.5 text-[11px] text-slate-400 uppercase font-medium absolute">
              หรือเข้าสู่ระบบด้วยตนเอง
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ชื่อผู้ใช้งาน (Username)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                placeholder="ระบุชื่อผู้ใช้งาน..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                รหัสผ่าน (Password)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                placeholder="ระบุรหัสผ่าน..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังเข้าสู่ระบบ...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบ (Sign In)</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
