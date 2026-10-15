import React, { useState, useEffect } from 'react';
import { Settings, Server, Cpu, AlertTriangle, Shield, Check, Info } from 'lucide-react';
import { useHmiStore } from '../stores/hmiStore';
import { apiService } from '../services/api';
import { TabRulesConfig } from '../components/classifier/TabRulesConfig';
import { TabColorCalibration } from '../components/classifier/TabColorCalibration';
import { PlcConnectModal } from '../components/common/PlcConnectModal';

export const SettingsPage: React.FC = () => {
  const { machine, config, setConfig, addToast } = useHmiStore();
  const [healthData, setHealthData] = useState<{ uptime: number; websocketClients: number } | null>(null);
  const [switching, setSwitching] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'simulation' | 'real' | null>(null);
  const [isPlcModalOpen, setIsPlcModalOpen] = useState(false);

  useEffect(() => {
    apiService.getPublicConfig().then(setConfig).catch(() => {});
    apiService.getHealth().then(setHealthData).catch(() => {});
  }, []);

  const handleSwitchMode = async (targetMode: 'simulation' | 'real') => {
    setConfirmMode(null);
    setSwitching(true);
    try {
      await apiService.setMode(targetMode);
      addToast('success', `Switched mode to ${targetMode.toUpperCase()}`);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to switch mode');
    } finally {
      setSwitching(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title */}
      <div className="bg-white border border-[#E8EAEF] rounded-3xl p-6 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500" />
          System Settings & Hardware Diagnostics
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Operational mode configuration, fieldbus parameters, and network status
        </p>
      </div>

      {/* Mode Switch Card */}
      <div className="bg-white border border-[#E8EAEF] rounded-3xl p-6 shadow-xs">
        <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wider mb-3">
          Operation Mode Switcher
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Simulation Option */}
          <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            machine.mode === 'simulation'
              ? 'border-indigo-500 bg-indigo-50/40 shadow-xs'
              : 'border-[#E8EAEF] bg-slate-50/50'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-indigo-900">🧪 SIMULATION MODE</span>
                {machine.mode === 'simulation' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Runs internal high-fidelity state machine without requiring hardware PLC. Simulates photo-eyes, conveyor travel, pneumatic pushers, and inventory counts.
              </p>
            </div>

            {machine.mode !== 'simulation' && (
              <button
                onClick={() => setConfirmMode('simulation')}
                disabled={switching}
                className="py-2 px-4 rounded-full bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 shadow-xs transition-colors cursor-pointer"
              >
                SWITCH TO SIMULATION
              </button>
            )}
          </div>

          {/* Real PLC Option */}
          <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            machine.mode === 'real'
              ? 'border-amber-500 bg-amber-50/40 shadow-xs'
              : 'border-[#E8EAEF] bg-slate-50/50'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-amber-900">🏭 REAL PLC MODE</span>
                {machine.mode === 'real' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Connects directly to physical PLC over industrial Ethernet (Modbus TCP). Reads real digital inputs and registers. Write commands respect the safety interlock.
              </p>
            </div>

            {machine.mode !== 'real' && (
              <button
                onClick={() => setConfirmMode('real')}
                disabled={switching}
                className="py-2 px-4 rounded-full bg-[#141718] hover:bg-black text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                SWITCH TO REAL PLC
              </button>
            )}
          </div>
        </div>

        {/* Real PLC Write Status Banner */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-500" />
            <span className="text-slate-700">Hardware Write Permissions:</span>
          </div>
          {config?.enableRealPLCWrites ? (
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[11px]">
              REAL CONTROL ENABLED (Writes Allowed)
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700 text-[11px]">
              READ ONLY / REAL PLC WRITE LOCKED
            </span>
          )}
        </div>
      </div>

      {/* Diagnostics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* PLC Diagnostics */}
        <div className="bg-white border border-[#E8EAEF] rounded-3xl p-6 shadow-xs space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-[#111827] font-bold uppercase pb-2 border-b border-slate-100 font-sans">
            <Cpu className="w-4 h-4 text-indigo-500" />
            Fieldbus & PLC Configuration
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Protocol:</span>
            <span className="text-slate-900 font-bold uppercase">{config?.plcProtocol || 'Modbus TCP'}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Target Host IP:</span>
            <span className="text-slate-900 font-bold">{config?.plcHost || '192.168.1.20'}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>TCP Port:</span>
            <span className="text-slate-900 font-bold">{config?.plcPort || 502}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Poll Interval:</span>
            <span className="text-slate-900 font-bold">{config?.pollIntervalMs || 250} ms</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Current Status:</span>
            <span className={`font-bold ${machine.plcConnected ? 'text-emerald-600' : 'text-rose-600'}`}>
              {machine.plcStatus}
            </span>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setIsPlcModalOpen(true)}
              className="w-full py-2 px-3 rounded-full bg-[#141718] hover:bg-black text-white font-sans text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Cpu className="w-3.5 h-3.5 text-[#D4F63D]" />
              <span>Chỉnh Sửa & Kết Nối PLC Trực Tiếp</span>
            </button>
          </div>
        </div>

        {/* Server & Network Diagnostics */}
        <div className="bg-white border border-[#E8EAEF] rounded-3xl p-6 shadow-xs space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-[#111827] font-bold uppercase pb-2 border-b border-slate-100 font-sans">
            <Server className="w-4 h-4 text-indigo-500" />
            HMI Web Server Diagnostics
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Server Version:</span>
            <span className="text-slate-900 font-bold">v2.0 (FastAPI + React Vault)</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Connected Clients:</span>
            <span className="text-slate-900 font-bold">{healthData?.websocketClients ?? 1} active WebSocket(s)</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Server Uptime:</span>
            <span className="text-slate-900 font-bold">{healthData ? formatUptime(healthData.uptime) : 'Online'}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Host Origin:</span>
            <span className="text-slate-900 font-bold truncate max-w-[200px]">{window.location.origin}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Vision Engine:</span>
            <span className="text-emerald-600 font-bold">OpenCV 30 FPS OK</span>
          </div>
        </div>
      </div>

      {/* Rules and Color Thresholds Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E8EAEF] rounded-3xl p-6 shadow-xs">
          <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wider mb-4">
            Bảng Quy Tắc Phân Loại Sản Phẩm (Mapping Rules)
          </h2>
          <TabRulesConfig />
        </div>

        <div className="bg-white border border-[#E8EAEF] rounded-3xl p-6 shadow-xs">
          <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wider mb-4">
            Hiệu Chuẩn Ngưỡng Màu Camera (HSV Calibration)
          </h2>
          <TabColorCalibration />
        </div>
      </div>

      {/* Confirmation Modal for Mode Switch */}
      {confirmMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-industrial-card border-2 border-amber-500 rounded-xl max-w-md w-full p-6 shadow-2xl glow-yellow">
            <div className="flex items-center gap-3 mb-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold font-mono uppercase">
                Confirm Mode Transition
              </h3>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed font-sans">
              You are switching the operational backend mode to{' '}
              <span className="font-bold text-amber-400 font-mono uppercase">
                {confirmMode}
              </span>
              .
            </p>
            {confirmMode === 'real' && config?.enableRealPLCWrites && (
              <div className="p-3 bg-red-950/60 border border-red-600 rounded-lg text-xs text-red-300 font-mono mb-4">
                WARNING: Physical PLC writes are ENABLED in server configuration. Commands sent will physically energize actuators!
              </div>
            )}
            <div className="flex items-center justify-end gap-3 font-mono text-xs font-bold">
              <button
                onClick={() => setConfirmMode(null)}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                CANCEL
              </button>
              <button
                onClick={() => handleSwitchMode(confirmMode)}
                className="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white border border-amber-400 glow-yellow"
              >
                PROCEED
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct PLC Connection Modal */}
      <PlcConnectModal
        isOpen={isPlcModalOpen}
        onClose={() => setIsPlcModalOpen(false)}
      />
    </div>
  );
};
