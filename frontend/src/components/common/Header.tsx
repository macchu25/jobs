import React, { useState } from 'react';
import { Bell, Search, Filter, Plus, ShieldAlert, Cpu, Sparkles, QrCode, Globe, Menu } from 'lucide-react';
import { useHmiStore } from '../../stores/hmiStore';
import { useClassifierStore } from '../../stores/classifierStore';
import { useLanguageStore } from '../../stores/languageStore';
import { useLocation } from 'react-router-dom';
import { PlcConnectModal } from './PlcConnectModal';

export const Header: React.FC = () => {
  const location = useLocation();
  const { machine, alarms, wsConnected, config, setMobileSidebarOpen } = useHmiStore();
  const { setIsDistrictModalOpen, sendManualSignal } = useClassifierStore();
  const { lang, toggleLang, t } = useLanguageStore();
  const [isPlcModalOpen, setIsPlcModalOpen] = useState(false);
  const activeAlarms = alarms.filter((a) => a.active);

  // Dynamic Page Title with i18n
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/vision':
        return t.header.titles.vision;
      case '/bins':
        return t.header.titles.bins;
      case '/manual':
        return t.header.titles.manual;
      case '/alarms':
        return t.header.titles.alarms;
      case '/history':
        return t.header.titles.history;
      case '/qr':
        return t.header.titles.qr;
      case '/settings':
        return t.header.titles.settings;
      default:
        return t.header.titles.dashboard;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#F5F6FA] border-b border-[#E8EAEF] px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
      {/* Top Banner if Emergency Stop is Active */}
      {machine.emergencyStop && (
        <div className="bg-rose-500 text-white text-xs font-bold py-1.5 px-4 rounded-xl mb-3 flex items-center justify-center gap-2 tracking-wider uppercase animate-pulse shadow-md">
          <ShieldAlert className="w-4 h-4" />
          <span>E-STOP ACTIVE - DÂY CHUYỀN ĐANG KHÓA AN TOÀN VẬT LÝ</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        {/* Left Page Title & Mobile Drawer Trigger */}
        <div className="flex items-center justify-between lg:justify-start gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Hamburger Button on Mobile & Tablet (< 1024px) */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white border border-[#E8EAEF] text-slate-700 hover:text-black shadow-xs cursor-pointer flex items-center justify-center shrink-0"
              title="Menu Điều Hướng"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-[#111827] font-sans m-0 truncate">
              {getPageTitle()}
            </h1>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D4F63D]/30 border border-[#D4F63D] text-[#111827] shrink-0">
              <Sparkles className="w-3 h-3 text-slate-800" />
              <span>{t.header.industrialPlc}</span>
            </span>
          </div>

          {/* Quick Language Toggle on Mobile Top Bar */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={toggleLang}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E8EAEF] text-xs font-bold text-slate-700 shadow-xs cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono text-[10px] font-extrabold uppercase">
                {lang === 'vi' ? '🇻🇳' : '🇬🇧'}
              </span>
            </button>
          </div>
        </div>

        {/* Right Controls matching Image */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Industrial Telemetry Badges */}
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {/* WS Status */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold shadow-xs ${
                wsConnected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
              <span>{wsConnected ? t.header.live : t.header.wsOffline}</span>
            </span>

            {/* PLC Status Interactive Button */}
            <button
              type="button"
              onClick={() => setIsPlcModalOpen(true)}
              title="Nhấn để cấu hình và kết nối PLC Modbus TCP"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold shadow-xs cursor-pointer transition-all hover:scale-105 ${
                machine.plcConnected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{machine.plcConnected ? t.header.plcConnected : t.header.plcDisconnected}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            </button>
          </div>

          {/* Language Switcher Pill */}
          <button
            onClick={toggleLang}
            title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E8EAEF] text-xs font-bold text-slate-700 hover:text-black hover:border-slate-400 transition-all shadow-xs cursor-pointer group"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-600 transition-colors" />
            <span className="font-mono text-[11px] font-extrabold uppercase">
              {lang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
            </span>
          </button>

          {/* Search Pill Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.header.searchPlaceholder}
              className="w-full bg-white border border-[#E8EAEF] rounded-full pl-9 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4F63D] focus:border-transparent shadow-xs transition-all"
            />
          </div>

          {/* Filter button */}
          <button
            title={t.header.filter}
            className="w-9 h-9 rounded-full bg-white border border-[#E8EAEF] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Filter className="w-4 h-4" />
          </button>

          {/* Notification Bell */}
          <button
            title={t.header.alarms}
            className="w-9 h-9 rounded-full bg-white border border-[#E8EAEF] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors relative shadow-xs"
          >
            <Bell className="w-4 h-4" />
            {activeAlarms.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2 ring-2 ring-white" />
            )}
          </button>

          {/* Primary Action Button: Black Pill with Plus */}
          <button
            onClick={() => setIsDistrictModalOpen(true)}
            className="inline-flex items-center gap-2 bg-[#141718] hover:bg-black text-white px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer group"
          >
            <span>{t.header.printQr5Districts}</span>
            <div className="w-4 h-4 rounded-full bg-[#D4F63D] text-[#141718] flex items-center justify-center text-[10px] font-black group-hover:rotate-90 transition-transform">
              <Plus className="w-3 h-3 stroke-[3]" />
            </div>
          </button>
        </div>
      </div>

      {/* Direct PLC Connection Modal */}
      <PlcConnectModal
        isOpen={isPlcModalOpen}
        onClose={() => setIsPlcModalOpen(false)}
      />
    </header>
  );
};
