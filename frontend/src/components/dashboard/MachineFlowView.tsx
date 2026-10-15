import React from 'react';
import { ArrowDown, ArrowRight, Eye, Activity, QrCode } from 'lucide-react';
import { useHmiStore } from '../../stores/hmiStore';

const GATE_COLORS: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  GATE_1: { border: 'border-[#FF3B30]', bg: 'bg-[#FF3B30]/20', text: 'text-[#FF3B30]', glow: 'glow-red' },
  GATE_2: { border: 'border-[#34C759]', bg: 'bg-[#34C759]/20', text: 'text-[#34C759]', glow: 'glow-green' },
  GATE_3: { border: 'border-[#007AFF]', bg: 'bg-[#007AFF]/20', text: 'text-[#007AFF]', glow: 'glow-blue' },
  GATE_4: { border: 'border-[#FF9500]', bg: 'bg-[#FF9500]/20', text: 'text-[#FF9500]', glow: 'glow-yellow' },
  GATE_5: { border: 'border-[#AF52DE]', bg: 'bg-[#AF52DE]/20', text: 'text-[#AF52DE]', glow: 'glow-blue' },
  GATE_REJECT: { border: 'border-[#8E8E93]', bg: 'bg-[#8E8E93]/20', text: 'text-[#8E8E93]', glow: '' },
};

export const MachineFlowView: React.FC = () => {
  const { machine, sensors, bins } = useHmiStore();

  const isInputActive = sensors.some((s) => s.id === 'input_sensor' && s.active);
  const isOutputActive = sensors.some((s) => s.id === 'output_sensor' && s.active);

  return (
    <div className="bg-industrial-card border border-industrial-border rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00E5FF]" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-200 tracking-wider uppercase font-mono">
            Sơ Đồ Dây Chuyền Băng Tải & Cửa Phân Loại PLC (5 Quận Đà Nẵng)
          </h2>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isInputActive ? 'bg-amber-400 glow-yellow' : 'bg-slate-700'
              }`}
            />
            <span className="text-slate-400">Infeed Sensor (Vào)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isOutputActive ? 'bg-emerald-400 glow-green' : 'bg-slate-700'
              }`}
            />
            <span className="text-slate-400">Outfeed Sensor (Ra)</span>
          </div>
        </div>
      </div>

      {/* Schematic Layout */}
      <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 sm:p-6 overflow-x-auto">
        <div className="min-w-[650px] flex flex-col gap-5">
          {/* Top Level: Infeed + Main Conveyor */}
          <div className="flex items-center gap-3">
            {/* Input Station */}
            <div
              className={`flex flex-col items-center justify-center w-24 h-16 rounded-lg border-2 transition-all shrink-0 ${
                isInputActive
                  ? 'border-amber-500 bg-amber-950/40 text-amber-300 glow-yellow'
                  : 'border-slate-700 bg-slate-900 text-slate-400'
              }`}
            >
              <Eye
                className={`w-4 h-4 mb-0.5 ${
                  isInputActive ? 'text-amber-400 animate-bounce' : 'text-slate-500'
                }`}
              />
              <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Infeed</span>
              <span className="text-[9px] text-slate-500">
                {isInputActive ? 'CÓ KIỆN HÀNG' : 'SẴN SÀNG'}
              </span>
            </div>

            <ArrowRight
              className={`w-5 h-5 shrink-0 transition-colors ${
                machine.conveyorRunning ? 'text-[#00E5FF] animate-pulse' : 'text-slate-600'
              }`}
            />

            {/* Main Sorting Conveyor */}
            <div className="flex-1 relative">
              <div
                className={`h-12 rounded-lg border flex items-center justify-between px-4 transition-all conveyor-belt ${
                  machine.conveyorRunning ? 'running border-[#00E5FF]/70' : 'border-slate-700'
                }`}
              >
                <span className="text-[11px] font-black tracking-widest text-slate-300 uppercase font-mono z-10">
                  === BĂNG CHUYỀN PHÂN LOẠI CHÍNH ===
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono z-10 ${
                    machine.conveyorRunning
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-600/50'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {machine.conveyorRunning ? 'ĐANG CHẠY (RUNNING)' : 'DỪNG (STOP)'}
                </span>
              </div>
            </div>

            <ArrowRight
              className={`w-5 h-5 shrink-0 transition-colors ${
                machine.conveyorRunning ? 'text-[#00E5FF] animate-pulse' : 'text-slate-600'
              }`}
            />

            {/* Output Discharge Station */}
            <div
              className={`flex flex-col items-center justify-center w-24 h-16 rounded-lg border-2 transition-all shrink-0 ${
                isOutputActive
                  ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 glow-green'
                  : 'border-slate-700 bg-slate-900 text-slate-400'
              }`}
            >
              <Eye
                className={`w-4 h-4 mb-0.5 ${
                  isOutputActive ? 'text-emerald-400 animate-bounce' : 'text-slate-500'
                }`}
              />
              <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Outfeed</span>
              <span className="text-[9px] text-slate-500">
                {isOutputActive ? 'XUẤT HÀNG' : 'IDLE'}
              </span>
            </div>
          </div>

          {/* Diverter Arms and Storage Bins Grid (6 Gates) */}
          <div className="px-14">
            <div className="grid grid-cols-6 gap-2.5">
              {bins.map((bin) => {
                const isPusherOut = bin.pusherExtended;
                const isSensorActive = bin.sensorActive;
                const colorTheme = GATE_COLORS[bin.id] || {
                  border: 'border-slate-700',
                  bg: 'bg-slate-900',
                  text: 'text-slate-200',
                  glow: '',
                };

                return (
                  <div key={bin.id} className="flex flex-col items-center">
                    {/* Downward diverter connector */}
                    <div className="flex flex-col items-center mb-1">
                      <div
                        className={`w-1 h-3 transition-colors ${
                          isPusherOut ? 'bg-[#00E5FF] glow-blue' : 'bg-slate-700'
                        }`}
                      />
                      <ArrowDown
                        className={`w-3.5 h-3.5 -my-0.5 ${
                          isPusherOut ? 'text-[#00E5FF] animate-bounce' : 'text-slate-600'
                        }`}
                      />
                    </div>

                    {/* Sorter Pusher Actuator Indicator */}
                    <div
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded mb-1.5 border transition-all ${
                        isPusherOut
                          ? 'bg-blue-600 text-white font-bold border-blue-400 glow-blue scale-105'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      {isPusherOut ? 'ĐẨY HÀNG' : 'THU VỀ'}
                    </div>

                    {/* Bin Box */}
                    <div
                      className={`w-full rounded-lg border p-2 transition-all text-center ${
                        isPusherOut
                          ? `${colorTheme.border} ${colorTheme.bg} ${colorTheme.glow}`
                          : bin.busy
                          ? 'border-amber-500 bg-amber-950/30'
                          : isSensorActive
                          ? 'border-cyan-500 bg-cyan-950/30'
                          : 'border-slate-800 bg-slate-900/90'
                      }`}
                    >
                      <div className="text-[10px] font-bold font-mono text-slate-300 truncate" title={bin.name}>
                        {bin.name}
                      </div>

                      <div className={`text-xs font-mono font-black mt-0.5 ${colorTheme.text}`}>
                        {bin.quantity} SP
                      </div>

                      {/* Presence Sensor Dot */}
                      <div className="flex items-center justify-center gap-1 mt-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSensorActive ? 'bg-[#00E5FF] animate-ping' : 'bg-slate-700'
                          }`}
                        />
                        <span className="text-[8px] text-slate-400 font-mono">
                          {isSensorActive ? 'CẢM BIẾN ON' : 'OFF'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
