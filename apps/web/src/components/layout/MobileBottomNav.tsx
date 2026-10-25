import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUserInfo } from '../../lib/api-client';
import { getFilteredNavItems } from './DocFlowSidebar';

export const MobileBottomNav: React.FC = () => {
  const { t } = useTranslation();
  const userInfo = getUserInfo();
  const roles = userInfo?.roles || ['staff'];
  const navItems = getFilteredNavItems(roles);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 safe-area-pb shadow-lg">
      <div className="flex items-center justify-around h-15 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.key}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-sky-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-[70px]">{t(item.labelKey, item.defaultLabel)}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
