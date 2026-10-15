import React, { useState, useEffect } from 'react';
import { History, Filter, RefreshCw, Layers } from 'lucide-react';
import { apiService } from '../services/api';
import { EventLog } from '../types';
import { ConsoleLogPanel } from '../components/classifier/ConsoleLogPanel';

export const HistoryPage: React.FC = () => {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [selectedBin, setSelectedBin] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await apiService.getHistory({
        limit: 100,
        type: selectedType || undefined,
        bin: selectedBin || undefined,
      });
      setEvents(data);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [selectedType, selectedBin]);

  const getResultBadge = (res: string) => {
    switch (res) {
      case 'COMPLETED':
      case 'SUCCESS':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'FAILED':
      case 'ERROR':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'ACCEPTED':
      case 'ACTIVE':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E8EAEF] rounded-3xl p-6 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-500" />
            Operational & Audit History
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Traceability log of package sorting, outfeed calls, and operator control actions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Event Type Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent outline-none cursor-pointer"
            >
              <option value="">TẤT CẢ SỰ KIỆN</option>
              <option value="CALL_ITEM">CALL ITEM</option>
              <option value="ITEM_SORTED">ITEM SORTED</option>
              <option value="ALARM_CREATED">ALARM CREATED</option>
              <option value="ALARM_CLEARED">ALARM CLEARED</option>
              <option value="MANUAL_COMMAND">MANUAL COMMAND</option>
            </select>
          </div>

          {/* Bin Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedBin}
              onChange={(e) => setSelectedBin(e.target.value)}
              className="bg-transparent outline-none cursor-pointer"
            >
              <option value="">TẤT CẢ CỬA / BIN</option>
              <option value="A01">Cửa 1 - Hải Châu</option>
              <option value="A02">Cửa 2 - Thanh Khê</option>
              <option value="A03">Cửa 3 - Liên Chiểu</option>
              <option value="B01">Cửa 4 - Ngũ Hành Sơn</option>
              <option value="B02">Cửa 5 - Cẩm Lệ</option>
              <option value="REJECT">Cửa Loại (Reject)</option>
            </select>
          </div>

          <button
            onClick={loadHistory}
            disabled={loading}
            className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* History Log Table */}
      <div className="bg-white border border-[#E8EAEF] rounded-3xl shadow-xs overflow-hidden p-6">
        <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
          <table className="w-full min-w-[650px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-3">Timestamp</th>
                <th className="pb-3 px-3">Type</th>
                <th className="pb-3 px-3">Source</th>
                <th className="pb-3 px-3">Bin / Gate</th>
                <th className="pb-3 px-3">Description</th>
                <th className="pb-3 px-3 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 text-slate-500 font-sans">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-bold text-[#111827]">{event.eventType}</td>
                  <td className="py-3 px-3 text-slate-500">{event.source}</td>
                  <td className="py-3 px-3 font-bold text-indigo-600">{event.binId || '-'}</td>
                  <td className="py-3 px-3 font-sans text-xs text-slate-800">{event.description}</td>
                  <td className="py-3 px-3 text-right font-sans">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getResultBadge(event.result)}`}>
                      {event.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {events.length === 0 && (
          <div className="py-12 text-center text-slate-400 font-sans text-xs">
            Không có bản ghi lịch sử nào phù hợp với bộ lọc.
          </div>
        )}
      </div>

      {/* Real-time System Console Log from Vision Engine & PLC */}
      <ConsoleLogPanel />
    </div>
  );
};
