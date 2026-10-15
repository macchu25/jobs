import React from 'react';
import { Search, Filter, Calendar, Eye, Lock, ArrowUpRight, CheckCircle2, QrCode, AlertCircle, Clock } from 'lucide-react';
import { useClassifierStore } from '../../stores/classifierStore';
import { useLanguageStore } from '../../stores/languageStore';

export const RecentSalesOrderCard: React.FC = () => {
  const { history, liveDetection } = useClassifierStore();
  const { t } = useLanguageStore();

  // Map live history from Python backend if available
  const hasHistory = history && history.length > 0;

  const displayItems = hasHistory
    ? history.slice(0, 5).map((h: any, idx: number) => {
        const isReject = h.gate_id === 99 || String(h.gate_id).includes('99');
        const colorName = h.color || 'UNKNOWN';
        const avatarBg =
          colorName === 'RED'
            ? 'bg-rose-100 text-rose-600'
            : colorName === 'BLUE'
            ? 'bg-blue-100 text-blue-600'
            : colorName === 'GREEN'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-100 text-slate-700';

        return {
          id: `hist-${idx}-${h.timestamp}`,
          name: h.rule_name || `Cửa ${h.gate_id}`,
          code: `QR: ${h.qr_data && h.qr_data !== 'NONE' ? h.qr_data : 'N/A'} • ${colorName}`,
          time: h.timestamp || '--:--',
          gate: isReject ? t.salesOrder.rejected : `Cửa ${h.gate_id}`,
          priority: isReject ? t.salesOrder.rejected : t.salesOrder.sorted,
          priorityColor: isReject
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200',
          avatarBg,
          iconChar: isReject ? '⚠️' : '📦',
        };
      })
    : [
        {
          id: 'item-1',
          name: 'Quận Hải Châu',
          code: 'QR: HAI_CHAU • RED',
          time: '14:20:15',
          gate: 'Cửa 1',
          priority: t.salesOrder.sorted,
          priorityColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          avatarBg: 'bg-rose-100 text-rose-600',
          iconChar: '📦',
        },
        {
          id: 'item-2',
          name: 'Quận Thanh Khê',
          code: 'QR: THANH_KHE • GREEN',
          time: '14:19:42',
          gate: 'Cửa 2',
          priority: t.salesOrder.sorted,
          priorityColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          avatarBg: 'bg-emerald-100 text-emerald-700',
          iconChar: '📦',
        },
        {
          id: 'item-3',
          name: 'Quận Liên Chiểu',
          code: 'QR: LIEN_CHIEU • BLUE',
          time: '14:18:05',
          gate: 'Cửa 3',
          priority: t.salesOrder.sorted,
          priorityColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          avatarBg: 'bg-blue-100 text-blue-700',
          iconChar: '📦',
        },
        {
          id: 'item-4',
          name: 'Quận Ngũ Hành Sơn',
          code: 'QR: NGU_HANH_SON • UNKNOWN',
          time: '14:16:30',
          gate: 'Cửa 4',
          priority: t.salesOrder.sorted,
          priorityColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          avatarBg: 'bg-purple-100 text-purple-700',
          iconChar: '📦',
        },
      ];

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#E8EAEF] shadow-xs flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#111827] tracking-tight">
            {t.salesOrder.title}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.salesOrder.subtitle}
          </p>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <button className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors">
            <Search className="w-3.5 h-3.5" />
          </button>
          <button className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors">
            <Filter className="w-3.5 h-3.5" />
          </button>
          <button className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors">
            <Calendar className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
        <table className="w-full min-w-[440px] text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="pb-2.5 font-semibold">{t.salesOrder.productName}</th>
              <th className="pb-2.5 text-center font-semibold">{t.salesOrder.scanTime}</th>
              <th className="pb-2.5 text-center font-semibold">{t.salesOrder.priority}</th>
              <th className="pb-2.5 text-right font-semibold">{t.salesOrder.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {displayItems.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                {/* Product Name with Avatar Icon */}
                <td className="py-2.5 pr-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full ${item.avatarBg} flex items-center justify-center text-base shrink-0`}>
                      {item.iconChar}
                    </div>
                    <div>
                      <div className="font-bold text-[#111827] leading-tight">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.code}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Scan Timestamp */}
                <td className="py-2.5 text-center font-bold font-mono text-[#111827]">
                  <div className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-600">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{item.time}</span>
                  </div>
                </td>

                {/* Priority Status Pill */}
                <td className="py-2.5 text-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${item.priorityColor}`}>
                    {item.priority}
                  </span>
                </td>

                {/* Action icons */}
                <td className="py-2.5 text-right text-slate-400">
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-1 hover:text-[#111827] transition-colors" title="Xem chi tiết">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1 hover:text-[#111827] transition-colors" title="Khóa">
                      <Lock className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
