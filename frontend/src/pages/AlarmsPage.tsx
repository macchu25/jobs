import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, RotateCcw, AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { useHmiStore } from '../stores/hmiStore';
import { apiService } from '../services/api';
import { Alarm } from '../types';

export const AlarmsPage: React.FC = () => {
  const { alarms: storeAlarms, addToast } = useHmiStore();
  const [activeOnly, setActiveOnly] = useState(false);
  const [allAlarms, setAllAlarms] = useState<Alarm[]>([]);

  useEffect(() => {
    loadAlarms();
  }, [activeOnly, storeAlarms]);

  const loadAlarms = async () => {
    try {
      const data = await apiService.getAlarms(activeOnly);
      setAllAlarms(data);
    } catch {
      setAllAlarms(storeAlarms);
    }
  };

  const handleAck = async (id: string) => {
    try {
      await apiService.ackAlarm(id);
      addToast('info', 'Alarm acknowledged');
      loadAlarms();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleReset = async () => {
    try {
      await apiService.resetAlarms();
      addToast('success', 'Active alarms reset');
      loadAlarms();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
      case 'ERROR':
        return 'bg-rose-50 text-rose-600 border-rose-200';
      case 'WARNING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const activeCount = allAlarms.filter((a) => a.active).length;

  return (
    <div className="space-y-6">
      {/* Header & Global Reset */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E8EAEF] rounded-3xl p-6 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-rose-500" />
            Alarm & Diagnostic Fault Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Active industrial warnings, safety interlocks, and historical fault log
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded border-slate-300 text-[#141718] focus:ring-[#D4F63D]"
            />
            <span>Active Only</span>
          </label>

          <button
            onClick={handleReset}
            disabled={activeCount === 0}
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeCount === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESET ALL ALARMS</span>
          </button>
        </div>
      </div>

      {/* Alarms Table */}
      <div className="bg-white border border-[#E8EAEF] rounded-3xl shadow-xs overflow-hidden p-6">
        <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
          <table className="w-full min-w-[650px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-3">Severity</th>
                <th className="pb-3 px-3">Fault Code</th>
                <th className="pb-3 px-3">Description</th>
                <th className="pb-3 px-3">Source</th>
                <th className="pb-3 px-3">Timestamp</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {allAlarms.map((alarm) => (
                <tr
                  key={alarm.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    alarm.active ? 'bg-rose-50/40' : ''
                  }`}
                >
                  <td className="py-3 px-3 font-sans">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getSeverityBadge(alarm.severity)}`}>
                      {alarm.severity}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-[#111827]">{alarm.code}</td>
                  <td className="py-3 px-3 font-sans text-xs text-slate-800">{alarm.message}</td>
                  <td className="py-3 px-3 text-slate-500">{alarm.source}</td>
                  <td className="py-3 px-3 text-slate-500">
                    {new Date(alarm.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-sans">
                    {alarm.active ? (
                      <span className="inline-flex items-center gap-1.5 text-rose-600 font-bold text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium text-[11px]">CLEARED</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-sans">
                    {alarm.active && !alarm.acknowledged && (
                      <button
                        onClick={() => handleAck(alarm.id)}
                        className="px-3 py-1 rounded-full bg-[#141718] hover:bg-black text-white font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        ACK
                      </button>
                    )}
                    {alarm.active && alarm.acknowledged && (
                      <span className="text-[10px] text-slate-400 italic">ACKED</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {allAlarms.length === 0 && (
          <div className="py-12 text-center text-slate-400 font-sans text-xs">
            Hệ thống an toàn, không có cảnh báo nào được ghi nhận.
          </div>
        )}
      </div>
    </div>
  );
};
