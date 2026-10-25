import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { onServiceStatusChange } from '../lib/api-client';
import { UserManagementPage } from '../features/user/UserManagementPage';
import { CustomerManagementPage } from '../features/customer/CustomerManagementPage';
import { CSVImportPage } from '../features/import/CSVImportPage';
import { SearchPage } from '../features/search/SearchPage';
import { Search, FileText, Upload, Users, Building2, ShieldAlert, CheckCircle2 } from 'lucide-react';

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
                <Link to="/customers" className="hover:text-indigo-600 flex items-center gap-1.5 py-1">
                  <Building2 className="w-4 h-4" />
                  {t('customers')}
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
            <Route path="/" element={<SearchPage />} />
            <Route path="/import" element={<CSVImportPage />} />
            <Route path="/customers" element={<CustomerManagementPage />} />
            <Route path="/users" element={<UserManagementPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};
