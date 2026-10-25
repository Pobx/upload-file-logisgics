import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Upload, 
  Building2, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  FileText 
} from 'lucide-react';
import { getUserInfo } from '../../lib/api-client';

export interface NavItemDef {
  key: string;
  labelKey: string;
  defaultLabel: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRoles?: string[];
}

export const ALL_NAV_ITEMS: NavItemDef[] = [
  {
    key: 'search',
    labelKey: 'search',
    defaultLabel: 'ค้นหาเอกสาร',
    href: '/',
    icon: Search,
    requiredRoles: ['admin', 'staff', 'viewer'],
  },
  {
    key: 'import',
    labelKey: 'importCSV',
    defaultLabel: 'นำเข้า CSV',
    href: '/import',
    icon: Upload,
    requiredRoles: ['admin', 'staff'],
  },
  {
    key: 'customers',
    labelKey: 'customers',
    defaultLabel: 'จัดการลูกค้า',
    href: '/customers',
    icon: Building2,
    requiredRoles: ['admin', 'staff', 'viewer'],
  },
  {
    key: 'users',
    labelKey: 'users',
    defaultLabel: 'จัดการผู้ใช้',
    href: '/users',
    icon: Users,
    requiredRoles: ['admin'],
  },
];

export function getFilteredNavItems(roles: string[]): NavItemDef[] {
  const normRoles = roles.map(r => r.toLowerCase());
  return ALL_NAV_ITEMS.filter(item => {
    if (!item.requiredRoles || item.requiredRoles.length === 0) return true;
    return item.requiredRoles.some(r => normRoles.includes(r));
  });
}

export const DocFlowSidebar: React.FC = () => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const userInfo = getUserInfo();
  const roles = userInfo?.roles || ['staff'];
  const navItems = getFilteredNavItems(roles);

  const primaryRole = roles.includes('admin') 
    ? 'Admin' 
    : roles.includes('staff') 
    ? 'CS Staff' 
    : 'Viewer';

  return (
    <aside 
      className={`hidden md:flex flex-col justify-between bg-white border-r border-slate-200 transition-all duration-200 z-20 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="font-bold text-slate-900 text-sm tracking-tight block">DocFlow</span>
                <span className="text-[10px] text-sky-600 font-semibold uppercase tracking-wider block">Logistics Hub</span>
              </div>
            )}
          </div>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            title={collapsed ? 'ขยายแถบเมนู' : 'พับแถบเมนู'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.key}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 font-semibold shadow-xs border border-sky-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  } ${collapsed ? 'justify-center px-0' : ''}`
                }
                title={collapsed ? t(item.labelKey, item.defaultLabel) : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${collapsed ? 'mx-auto' : ''}`} />
                {!collapsed && <span className="truncate">{t(item.labelKey, item.defaultLabel)}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Footer Card */}
      <div className="p-3 border-t border-slate-100">
        <div className={`flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
            {userInfo?.username ? userInfo.username.substring(0, 2).toUpperCase() : 'CS'}
          </div>
          {!collapsed && (
            <div className="overflow-hidden truncate text-left">
              <div className="font-semibold text-xs text-slate-800 truncate">{userInfo?.username || 'CS Officer'}</div>
              <div className="text-[10px] text-sky-600 font-medium">{primaryRole}</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
