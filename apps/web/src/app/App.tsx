import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { onServiceStatusChange } from '../lib/api-client';
import { UserManagementPage } from '../features/user/UserManagementPage';
import { Search, FileText, Upload, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [serviceAlert, setServiceAlert] = useState<string | null>(null);

  useEffect(() => {
    return onServiceStatusChange((status, message) => {
      if (status === 'DEGRADED' || status === 'DOWN') {
        setServiceAlert(message || t('systemDegraded'));
      } else {
        setServiceAlert(null);
      }
    });
  }, [t]);

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'th' ? 'en' : 'th';
    i18n.changeLanguage(nextLang);
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        {/* System Degraded Alert Banner */}
        {serviceAlert && (
          <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium shadow-sm transition-all">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              <span>{serviceAlert}</span>
            </div>
            <button
              onClick={() => setServiceAlert(null)}
              className="text-xs underline hover:text-amber-100"
            >
              ปิดการแจ้งเตือน
            </button>
          </div>
        )}

        {/* Global Navigation Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2 font-bold text-lg text-slate-800">
                <FileText className="w-6 h-6 text-indigo-600" />
                <span>{t('appName')}</span>
              </Link>

              <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600">
                <Link to="/" className="hover:text-indigo-600 flex items-center gap-1.5 py-1">
                  <Search className="w-4 h-4" />
                  {t('search')}
                </Link>
                <Link to="/import" className="hover:text-indigo-600 flex items-center gap-1.5 py-1">
                  <Upload className="w-4 h-4" />
                  {t('importCSV')}
                </Link>
                <Link to="/users" className="hover:text-indigo-600 flex items-center gap-1.5 py-1">
                  <Users className="w-4 h-4" />
                  {t('users')}
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleLanguage}
                className="px-2.5 py-1 text-xs font-semibold rounded border border-slate-300 hover:bg-slate-100"
              >
                {i18n.language.toUpperCase()}
              </button>
              <div className="flex items-center gap-2 text-xs font-medium bg-slate-100 px-3 py-1.5 rounded-full text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Admin User</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
          <Routes>
            <Route
              path="/"
              element={
                <div className="space-y-6">
                  {/* Hero Search Section */}
                  <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center max-w-3xl mx-auto mt-6">
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">
                      {t('search')}
                    </h1>
                    <p className="text-slate-500 text-sm mb-6">
                      ค้นหาเอกสาร Job Order, B/L, Invoice หรือชื่อลูกค้า
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder={t('searchPlaceholder')}
                          className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                      <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm">
                        {t('search')}
                      </button>
                    </div>
                  </div>

                  {/* Dashboard Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                      <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        {t('recentDocuments')}
                      </h2>
                      <p className="text-xs text-slate-400 italic">ยังไม่มีเอกสารอัปโหลดล่าสุด</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                      <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                        {t('workQueue')}
                      </h2>
                      <p className="text-xs text-slate-400 italic">ไม่มีรายการเอกสารตกค้าง</p>
                    </div>
                  </div>
                </div>
              }
            />
            <Route
              path="/import"
              element={
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-2xl mx-auto mt-6">
                  <h1 className="text-xl font-bold text-slate-800 mb-2">{t('importCSV')}</h1>
                  <p className="text-sm text-slate-500 mb-6">
                    อัปโหลดไฟล์ CSV รายการ Job Order (รองรับ 100,000 แถว พร้อมระบบ Reconcile อัตโนมัติ)
                  </p>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 cursor-pointer transition-colors">
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-700">ลากไฟล์ CSV มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
                    <p className="text-xs text-slate-400 mt-1">UTF-8, คั่นด้วย comma (,), ขนาดไฟล์ไม่เกิน 50 MB</p>
                  </div>
                </div>
              }
            />
            <Route path="/users" element={<UserManagementPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};
