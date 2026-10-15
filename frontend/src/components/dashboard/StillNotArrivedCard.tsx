import React from 'react';
import { ArrowUpRight, Inbox, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useHmiStore } from '../../stores/hmiStore';
import { useLanguageStore } from '../../stores/languageStore';

export const StillNotArrivedCard: React.FC = () => {
  const { bins } = useHmiStore();
  const { t } = useLanguageStore();

  // Map real gates and their remaining capacities
  const gateItems = bins.slice(0, 4).map((b) => {
    const remaining = Math.max(0, b.capacity - b.quantity);
    return {
      id: b.id,
      name: b.name,
      sku: b.productCode || `#Gate-${b.gateNumber || 1}`,
      remaining: `${remaining} ${t.stillNotArrived.slotsRemaining}`,
      colorHex: b.colorHex || '#34C759',
      char: b.name.includes(' - ') ? b.name.split(' - ')[1]?.[0] || 'C' : b.name[0],
    };
  });

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#E8EAEF] shadow-xs flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-[#111827] tracking-tight">
            {t.stillNotArrived.title}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.stillNotArrived.subtitle}
          </p>
        </div>
      </div>

      {/* Table of Gates & Remaining Capacity */}
      <div className="space-y-2.5 my-1">
        {gateItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-none">
            {/* Avatar & Details */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs"
                style={{ backgroundColor: item.colorHex }}
              >
                {item.char}
              </div>
              <div>
                <div className="font-bold text-xs text-[#111827] leading-tight">
                  {item.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {item.sku}
                </div>
              </div>
            </div>

            {/* Remaining Slots */}
            <div className="text-xs font-semibold text-slate-500 font-mono">
              {item.remaining}
            </div>

            {/* Action View Button */}
            <Link
              to="/bins"
              className="py-1 px-3 rounded-full border border-slate-200 hover:border-slate-800 text-[11px] font-semibold text-slate-700 hover:text-black transition-colors"
            >
              Chute
            </Link>
          </div>
        ))}
      </div>

      {/* Full-width Black Button at Bottom */}
      <div className="pt-3 border-t border-slate-100">
        <Link
          to="/bins"
          className="w-full py-2.5 px-4 rounded-xl bg-[#141718] hover:bg-black text-white text-xs font-bold text-center transition-all shadow-xs flex items-center justify-center gap-1"
        >
          <span>{bins.length} {t.stillNotArrived.gatesReady}</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
        </Link>
      </div>
    </div>
  );
};
