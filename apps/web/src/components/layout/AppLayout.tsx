import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { onServiceStatusChange } from '../../lib/api-client';
import { DocFlowSidebar } from './DocFlowSidebar';
import { DocFlowHeader } from './DocFlowHeader';
import { MobileBottomNav } from './MobileBottomNav';

export const AppLayout: React.FC = () => {
  const { t } = useTranslation();
  const [serviceAlert, setServiceAlert] = useState<string | null>(null);

  useEffect(() => {
    return onServiceStatusChange((status, message) => {
      if (status === 'DEGRADED' || status === 'DOWN') {
        setServiceAlert(message || t('systemDegraded', 'ระบบทำงานด้วยประสิทธิภาพลดลงชั่วคราว'));
      } else {
        setServiceAlert(null);
      }
    });
  }, [t]);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Desktop Left Sidebar */}
      <DocFlowSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <DocFlowHeader 
          serviceAlert={serviceAlert} 
          onDismissAlert={() => setServiceAlert(null)} 
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Native Bottom Nav */}
      <MobileBottomNav />
    </div>
  );
};
