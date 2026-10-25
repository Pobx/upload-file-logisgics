import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Globe, LogOut, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { apiClient, setAuthToken, getUserInfo } from '../../lib/api-client';

interface DocFlowHeaderProps {
  serviceAlert: string | null;
  onDismissAlert: () => void;
}

export const DocFlowHeader: React.FC<DocFlowHeaderProps> = ({ serviceAlert, onDismissAlert }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userInfo = getUserInfo();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = searchInputRef.current?.value.trim();
    if (query) {
      navigate(`/?q=${encodeURIComponent(query)}`);
    } else {
      navigate('/');
    }
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'th' ? 'en' : 'th';
    i18n.changeLanguage(nextLang);
  };

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (_) {}
    setAuthToken(null);
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      {/* Degraded Alert Banner */}
      {serviceAlert && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-xs font-medium shadow-sm transition-all">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{serviceAlert}</span>
          </div>
          <button
            onClick={onDismissAlert}
            className="text-xs underline hover:text-amber-100 cursor-pointer"
          >
            ปิด
          </button>
        </div>
      )}

      {/* Main Bar */}
      <div className="h-16 px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Global Omni-Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="ค้นหา Job No., B/L, หรือชื่อลูกค้า... (กด ⌘K)"
              className="w-full pl-9 pr-14 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs md:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            />
            <div className="absolute right-2.5 hidden sm:flex items-center">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
                ⌘K
              </kbd>
            </div>
          </div>
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Language Switch */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
            title="เปลี่ยนภาษา (Change Language)"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>{i18n.language.toUpperCase()}</span>
          </button>

          {/* User Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-medium text-emerald-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>{userInfo?.username || 'Online'}</span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title={t('logout', 'ออกจากระบบ')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
