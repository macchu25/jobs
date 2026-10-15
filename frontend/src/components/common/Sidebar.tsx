import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Camera,
  Sliders,
  QrCode,
  FileBarChart,
  Settings,
  Bell,
  Cpu,
  Zap,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useHmiStore } from '../../stores/hmiStore';
import { useLanguageStore } from '../../stores/languageStore';

export const Sidebar: React.FC = () => {
  const { alarms, machine, config, isMobileSidebarOpen, setMobileSidebarOpen } = useHmiStore();
  const { t } = useLanguageStore();
  const activeAlarmCount = alarms.filter((a) => a.active).length;

  const menuItems = [
    { to: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { to: '/bins', label: t.nav.inventory, icon: Layers },
    { to: '/vision', label: t.nav.visionAi, icon: Camera },
    { to: '/manual', label: t.nav.manualPlc, icon: Sliders },
    { to: '/qr', label: t.nav.qrGen, icon: QrCode },
    { to: '/history', label: t.nav.history, icon: FileBarChart },
  ];

  const generalItems = [
    { to: '/alarms', label: t.nav.alarms, icon: Bell, hasBadge: true },
    { to: '/settings', label: t.nav.settings, icon: Settings },
  ];

  const renderContent = (isMobile = false) => (
    <div className="flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="p-6 pb-4 flex items-center justify-between border-b border-[#22252A]/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#D4F63D] flex items-center justify-center text-[#121316] font-black text-lg shadow-[0_0_15px_rgba(212,246,61,0.35)]">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white font-sans">vault</span>
            <span className="text-[10px] block text-[#D4F63D] font-mono tracking-widest uppercase -mt-1 font-bold">
              PLC HMI v2.0
            </span>
          </div>
        </div>

        {isMobile && (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        {/* Section 1: MENU */}
        <div>
          <div className="text-[10px] font-bold text-slate-500 tracking-wider uppercase px-3 mb-2 font-mono">
            MENU
          </div>
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => isMobile && setMobileSidebarOpen(false)}
                  className={({ isActive }) => `
                    flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group
                    ${
                      isActive
                        ? 'bg-[#1E2024] text-white font-bold relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-[#D4F63D] before:rounded-r shadow-xs'
                        : 'text-slate-400 hover:bg-[#1B1D22] hover:text-slate-100'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span>{item.label}</span>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Section 2: GENERAL */}
        <div>
          <div className="text-[10px] font-bold text-slate-500 tracking-wider uppercase px-3 mb-2 font-mono">
            GENERAL
          </div>
          <div className="space-y-1">
            {generalItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => isMobile && setMobileSidebarOpen(false)}
                  className={({ isActive }) => `
                    flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group
                    ${
                      isActive
                        ? 'bg-[#1E2024] text-white font-bold relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-[#D4F63D] before:rounded-r shadow-xs'
                        : 'text-slate-400 hover:bg-[#1B1D22] hover:text-slate-100'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span>{item.label}</span>
                  </div>
                  {item.hasBadge && activeAlarmCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500 text-white animate-pulse">
                      {activeAlarmCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Industrial Status Card */}
      <div className="p-4 pt-2 border-t border-[#22252A]/60">
        <div className="bg-[#181A1E] border border-[#272B32] rounded-2xl p-3.5 text-center space-y-1.5 shadow-lg">
          <div className="w-7 h-7 rounded-full bg-[#D4F63D]/15 border border-[#D4F63D]/30 flex items-center justify-center mx-auto text-[#D4F63D]">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-bold text-white tracking-wide">
            {machine.plcConnected ? 'PLC Modbus Online' : 'PLC Offline'}
          </h4>
          <p className="text-[10px] text-slate-400 leading-snug font-mono">
            {config?.plcHost || '127.0.0.1'}:{config?.plcPort || 503}
          </p>
          <div className="pt-1">
            <span className="inline-block w-full py-1 px-2 rounded-lg bg-black text-[#D4F63D] text-[10px] font-bold border border-[#2A2E35]">
              {machine.mode === 'simulation' ? 'Simulator Active' : 'Real Hardware'}
            </span>
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="mt-3 pt-2.5 border-t border-[#22252A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-[#D4F63D] flex items-center justify-center text-slate-950 font-bold text-xs ring-2 ring-slate-800">
              OP
            </div>
            <div>
              <div className="text-xs font-bold text-white leading-tight">Operator</div>
              <div className="text-[9px] text-slate-500 font-mono">PLC Supervisor</div>
            </div>
          </div>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Sticky Full Sidebar (>= 1024px) */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#121316] text-slate-300 shrink-0 h-screen sticky top-0 border-r border-[#22252A] z-40">
        {renderContent(false)}
      </aside>

      {/* 2. Mobile / Tablet Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity animate-in fade-in"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 3. Mobile / Tablet Slide-in Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#121316] text-slate-300 flex flex-col border-r border-[#22252A] shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderContent(true)}
      </aside>
    </>
  );
};
