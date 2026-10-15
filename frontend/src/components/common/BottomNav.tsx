import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Layers, Sliders, Bell, History, Camera, QrCode } from 'lucide-react';
import { useHmiStore } from '../../stores/hmiStore';
import { useLanguageStore } from '../../stores/languageStore';

export const BottomNav: React.FC = () => {
  const { alarms } = useHmiStore();
  const { t } = useLanguageStore();
  const activeAlarms = alarms.filter((a) => a.active).length;

  const mobileNavItems = [
    { to: '/dashboard', label: t.nav.dashboard.split(' ')[0] || 'Dash', icon: LayoutDashboard },
    { to: '/vision', label: 'Vision', icon: Camera },
    { to: '/bins', label: t.nav.inventory.split(' ')[0] || 'Cửa', icon: Layers },
    { to: '/manual', label: 'PLC', icon: Sliders },
    { to: '/qr', label: 'QR', icon: QrCode },
    { to: '/alarms', label: t.nav.alarms.split(' ')[0] || 'Alerts', icon: Bell },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121316]/95 backdrop-blur-md border-t border-[#23272F] safe-area-pb shadow-2xl">
      <div className="grid grid-cols-6 h-16 items-center px-1">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                relative flex flex-col items-center justify-center py-1.5 text-[11px] font-medium transition-all duration-200
                ${isActive ? 'text-[#D4F63D] font-bold' : 'text-slate-400 hover:text-slate-200'}
              `}
            >
              <div className="relative">
                <Icon className="w-5 h-5 mb-0.5" />
                {item.to === '/alarms' && activeAlarms > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#121316] animate-pulse" />
                )}
              </div>
              <span className="truncate max-w-full px-0.5 tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

