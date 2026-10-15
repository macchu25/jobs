import React from 'react';
import { ShoppingCart, Truck, AlertTriangle, RotateCcw, ArrowUpRight } from 'lucide-react';
import { useClassifierStore } from '../../stores/classifierStore';
import { useHmiStore } from '../../stores/hmiStore';
import { useLanguageStore } from '../../stores/languageStore';

export const StatCards: React.FC = () => {
  const { counters } = useClassifierStore();
  const { machine } = useHmiStore();
  const { t } = useLanguageStore();

  const total = counters.TOTAL || 0;
  const reject = counters.REJECT || 0;
  const passed = Math.max(0, total - reject);
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '100';
  const rejectRate = total > 0 ? ((reject / total) * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CARD 1: HERO BLACK CARD (Total Orders / Tổng Sản Phẩm Đã Quét) */}
      <div className="bg-[#141718] rounded-3xl p-5 text-white flex flex-col justify-between shadow-lg relative overflow-hidden group hover:scale-[1.01] transition-transform">
        {/* Background glow effect */}
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[#D4F63D]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#D4F63D] flex items-center justify-center text-[#141718] font-bold shadow-[0_0_15px_rgba(212,246,61,0.4)]">
            <ShoppingCart className="w-5 h-5 fill-current" />
          </div>
          <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Subtitle & Big Number */}
        <div className="space-y-1 mb-4">
          <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
            {t.stats.totalOrders}
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
            {total.toLocaleString()}
          </div>
        </div>

        {/* Bottom Change Pill */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D4F63D]/20 text-[#D4F63D]">
            +10%
          </span>
          <span className="text-xs text-slate-400">{t.stats.sinceLastMonth}</span>
        </div>
      </div>

      {/* CARD 2: WHITE CARD (Already Delivered / Đã Đạt Chuẩn Pass) */}
      <div className="bg-white rounded-3xl p-5 border border-[#E8EAEF] flex flex-col justify-between shadow-xs hover:shadow-md transition-all group hover:scale-[1.01]">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#D4F63D]/20 border border-[#D4F63D]/40 flex items-center justify-center text-emerald-800 font-bold">
            <Truck className="w-5 h-5 text-emerald-700" />
          </div>
          <button className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Subtitle & Big Number */}
        <div className="space-y-1 mb-4">
          <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
            {t.stats.alreadyDelivered}
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono text-[#111827] tracking-tight">
            {passed.toLocaleString()}
          </div>
        </div>

        {/* Bottom Change Pill */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
            +{passRate}%
          </span>
          <span className="text-xs text-slate-500">{t.stats.passRate}</span>
        </div>
      </div>

      {/* CARD 3: WHITE CARD WITH CIRCULAR GAUGE (Product Return / Hàng Lỗi Loại) */}
      <div className="bg-white rounded-3xl p-5 border border-[#E8EAEF] flex flex-col justify-between shadow-xs hover:shadow-md transition-all group hover:scale-[1.01]">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Middle Content with Circular Ring Gauge */}
        <div className="flex items-center justify-between gap-2 my-2">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase block">
              {t.stats.productReturn}
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-[#111827] tracking-tight">
              {rejectRate}%
            </div>
            <div className="text-xs text-slate-400 font-mono">
              ({reject} items)
            </div>
          </div>

          {/* Circular Ring Gauge */}
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#D4F63D]"
                strokeDasharray={`${Math.min(100, Math.max(8, Number(rejectRate)))}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-[10px] font-extrabold text-slate-700 block leading-none">
                {reject}
              </span>
              <span className="text-[8px] text-slate-400 block uppercase leading-none mt-0.5">
                Reject
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Change Pill */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            {rejectRate}%
          </span>
          <span className="text-xs text-slate-500">{t.stats.rejectRate}</span>
        </div>
      </div>

      {/* CARD 4: WHITE CARD WITH SPEED / TURNOVER RATE GAUGE */}
      <div className="bg-white rounded-3xl p-5 border border-[#E8EAEF] flex flex-col justify-between shadow-xs hover:shadow-md transition-all group hover:scale-[1.01]">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 font-bold">
            <RotateCcw className="w-5 h-5" />
          </div>
          <button className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Middle Content with Speed Circular Gauge */}
        <div className="flex items-center justify-between gap-2 my-2">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase block">
              {t.stats.turnoverRate}
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-[#111827] tracking-tight">
              1.2 m/s
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {machine.conveyorRunning ? 'Motor ON' : 'Motor OFF'}
            </div>
          </div>

          {/* Circular Ring Gauge */}
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-500"
                strokeDasharray="92, 100"
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-[10px] font-extrabold text-emerald-600 block leading-none">
                98%
              </span>
              <span className="text-[7px] text-slate-400 block uppercase leading-none mt-0.5">
                SPEED
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Change Pill */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
            +98%
          </span>
          <span className="text-xs text-slate-500">{t.stats.efficiency}</span>
        </div>
      </div>
    </div>
  );
};
