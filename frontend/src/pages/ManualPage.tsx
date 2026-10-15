import React, { useState } from 'react';
import { Sliders, Play, Square, AlertTriangle, Eye, Activity, ShieldCheck, Check, X, Cpu } from 'lucide-react';
import { useHmiStore } from '../stores/hmiStore';
import { useLanguageStore } from '../stores/languageStore';
import { apiService } from '../services/api';
import { PlcConnectModal } from '../components/common/PlcConnectModal';

export const ManualPage: React.FC = () => {
  const { machine, bins, sensors, actuators, addToast } = useHmiStore();
  const { t } = useLanguageStore();
  const isManual = machine.machineMode === 'MANUAL';
  const [isPlcModalOpen, setIsPlcModalOpen] = useState(false);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({
    open: false,
    title: '',
    description: '',
    action: async () => {},
  });

  const promptConfirm = (title: string, description: string, action: () => Promise<void>) => {
    setConfirmModal({
      open: true,
      title,
      description,
      action,
    });
  };

  const handleSetMode = async (mode: 'AUTO' | 'MANUAL') => {
    try {
      if (mode === 'AUTO') {
        await apiService.setMachineAuto();
        addToast('success', 'Machine set to AUTO mode');
      } else {
        await apiService.setMachineManual();
        addToast('warning', 'Machine switched to MANUAL mode - Automated sorting paused');
      }
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleStartConveyor = () => {
    promptConfirm(
      'Start Main Conveyor',
      'Are you sure you want to manually energize the sorting conveyor belt motor?',
      async () => {
        try {
          await apiService.startConveyor();
          addToast('success', 'Conveyor started');
        } catch (err: any) {
          addToast('error', err.message);
        }
      }
    );
  };

  const handleStopConveyor = () => {
    promptConfirm(
      'Stop Main Conveyor',
      'De-energize main sorting conveyor motor?',
      async () => {
        try {
          await apiService.stopConveyor();
          addToast('info', 'Conveyor stopped');
        } catch (err: any) {
          addToast('error', err.message);
        }
      }
    );
  };

  const handlePusherPush = (binId: string) => {
    promptConfirm(
      `Extend Pusher Cylinder ${binId}`,
      `Confirm manual movement: Extend pneumatic cylinder for bin ${binId}? Verify area is clear of personnel.`,
      async () => {
        try {
          await apiService.pushBin(binId);
          addToast('info', `Pusher ${binId} extended`);
        } catch (err: any) {
          addToast('error', err.message);
        }
      }
    );
  };

  const handlePusherRetract = (binId: string) => {
    promptConfirm(
      `Retract Pusher Cylinder ${binId}`,
      `Confirm manual movement: Retract cylinder for bin ${binId}?`,
      async () => {
        try {
          await apiService.retractBin(binId);
          addToast('info', `Pusher ${binId} retracted`);
        } catch (err: any) {
          addToast('error', err.message);
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Mode Selector & Warning Banner */}
      <div className="bg-white border border-[#E8EAEF] rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-500" />
              <span>{t.manual.title}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.manual.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsPlcModalOpen(true)}
              className="px-4 py-2 rounded-full text-xs font-bold bg-[#141718] hover:bg-black text-white flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              <Cpu className="w-4 h-4 text-[#D4F63D]" />
              <span>{t.manual.configPlc}</span>
            </button>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-full border border-slate-200">
              <button
                onClick={() => handleSetMode('AUTO')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  !isManual
                    ? 'bg-[#141718] text-white shadow-xs'
                    : 'text-slate-500 hover:text-black'
                }`}
              >
                {t.manual.autoMode}
              </button>
              <button
                onClick={() => handleSetMode('MANUAL')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isManual
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-black'
                }`}
              >
                {t.manual.manualMode}
              </button>
            </div>
          </div>
        </div>

        {!isManual && (
          <div className="mt-4 p-3 bg-amber-950/40 border border-amber-800/40 rounded-lg flex items-center gap-3 text-xs text-amber-300 font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              {t.manual.autoWarning}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conveyor Motor Manual Control */}
        <div className="bg-industrial-card border border-industrial-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Main Conveyor Motor
            </h2>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
              machine.conveyorRunning
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-600/60 glow-green'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {machine.conveyorRunning ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleStartConveyor}
              disabled={!isManual || machine.conveyorRunning}
              className={`py-3 px-4 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                !isManual || machine.conveyorRunning
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 glow-green active:scale-95'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>START BELT</span>
            </button>

            <button
              onClick={handleStopConveyor}
              disabled={!isManual || !machine.conveyorRunning}
              className={`py-3 px-4 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                !isManual || !machine.conveyorRunning
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-500 text-white border border-red-400 glow-red active:scale-95'
              }`}
            >
              <Square className="w-4 h-4" />
              <span>STOP BELT</span>
            </button>
          </div>
        </div>

        {/* Live Optical Sensors Table */}
        <div className="bg-industrial-card border border-industrial-border rounded-xl p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-cyan-400" />
            Field Sensor Presence Monitor
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {sensors.map((sens) => (
              <div
                key={sens.id}
                className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                  sens.active
                    ? 'bg-amber-950/40 border-amber-600 text-amber-300 glow-yellow'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="truncate mr-2">
                  <div className="text-xs font-bold font-mono text-slate-200 truncate">{sens.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{sens.id}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${sens.active ? 'bg-amber-400 animate-ping' : 'bg-slate-700'}`} />
                  <span className="text-[10px] font-bold font-mono">{sens.active ? 'ON' : 'OFF'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pusher Diverter Cylinders */}
      <div className="bg-industrial-card border border-industrial-border rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono mb-4">
          Bin Pusher Diverter Cylinders (Extend / Retract)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {bins.map((bin) => {
            const isExtended = bin.pusherExtended;

            return (
              <div key={bin.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-black font-mono text-slate-200">{bin.id}</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      isExtended
                        ? 'bg-blue-950 text-blue-300 border-blue-600 glow-blue'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {isExtended ? 'EXTENDED' : 'RETRACTED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mb-3">
                    {bin.productName}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => handlePusherPush(bin.id)}
                    disabled={!isManual || isExtended}
                    className={`py-2 px-2 rounded text-[11px] font-mono font-bold transition-all ${
                      !isManual || isExtended
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/50'
                        : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 glow-blue'
                    }`}
                  >
                    PUSH
                  </button>

                  <button
                    onClick={() => handlePusherRetract(bin.id)}
                    disabled={!isManual || !isExtended}
                    className={`py-2 px-2 rounded text-[11px] font-mono font-bold transition-all ${
                      !isManual || !isExtended
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/50'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-500'
                    }`}
                  >
                    RETRACT
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PLC Sorting Gate Signals Test from Git */}
      <div className="bg-industrial-card border border-industrial-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sliders className="w-4 h-4 text-[#00E5FF]" />
          <h2 className="text-sm font-bold text-slate-200 tracking-wider uppercase font-mono">
            Kiểm Thử Tín Hiệu PLC Phân Loại (Modbus Holding Register 0)
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-4 font-mono">
          Phát trực tiếp giá trị số đại diện cho từng Cửa sang PLC thật hoặc PLC Simulator.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => {
              import('../stores/classifierStore').then(({ useClassifierStore }) => {
                useClassifierStore.getState().sendManualSignal(1);
                addToast('success', 'Đã gửi tín hiệu Cửa 1 (Val: 1 - Hải Châu) tới PLC');
              });
            }}
            className="py-2.5 px-3 rounded-lg text-xs font-mono font-bold bg-[#2196F3] hover:bg-[#1976D2] text-white transition-all shadow"
          >
            Gửi Cửa 1 (Val: 1)
          </button>

          <button
            onClick={() => {
              import('../stores/classifierStore').then(({ useClassifierStore }) => {
                useClassifierStore.getState().sendManualSignal(2);
                addToast('success', 'Đã gửi tín hiệu Cửa 2 (Val: 2 - Thanh Khê) tới PLC');
              });
            }}
            className="py-2.5 px-3 rounded-lg text-xs font-mono font-bold bg-[#34C759] hover:bg-[#2EB04E] text-white transition-all shadow"
          >
            Gửi Cửa 2 (Val: 2)
          </button>

          <button
            onClick={() => {
              import('../stores/classifierStore').then(({ useClassifierStore }) => {
                useClassifierStore.getState().sendManualSignal(3);
                addToast('success', 'Đã gửi tín hiệu Cửa 3 (Val: 3 - Liên Chiểu) tới PLC');
              });
            }}
            className="py-2.5 px-3 rounded-lg text-xs font-mono font-bold bg-[#007AFF] hover:bg-[#0066D6] text-white transition-all shadow"
          >
            Gửi Cửa 3 (Val: 3)
          </button>

          <button
            onClick={() => {
              import('../stores/classifierStore').then(({ useClassifierStore }) => {
                useClassifierStore.getState().sendManualSignal(4);
                addToast('success', 'Đã gửi tín hiệu Cửa 4 (Val: 4 - Ngũ Hành Sơn) tới PLC');
              });
            }}
            className="py-2.5 px-3 rounded-lg text-xs font-mono font-bold bg-[#FF9500] hover:bg-[#E08500] text-white transition-all shadow"
          >
            Gửi Cửa 4 (Val: 4)
          </button>

          <button
            onClick={() => {
              import('../stores/classifierStore').then(({ useClassifierStore }) => {
                useClassifierStore.getState().sendManualSignal(5);
                addToast('success', 'Đã gửi tín hiệu Cửa 5 (Val: 5 - Cẩm Lệ) tới PLC');
              });
            }}
            className="py-2.5 px-3 rounded-lg text-xs font-mono font-bold bg-[#AF52DE] hover:bg-[#9B42C8] text-white transition-all shadow"
          >
            Gửi Cửa 5 (Val: 5)
          </button>

          <button
            onClick={() => {
              import('../stores/classifierStore').then(({ useClassifierStore }) => {
                useClassifierStore.getState().sendManualSignal(99);
                addToast('error', 'Đã gửi tín hiệu Cửa Loại (Val: 99 - Reject) tới PLC');
              });
            }}
            className="py-2.5 px-3 rounded-lg text-xs font-mono font-bold bg-[#F44336] hover:bg-[#D32F2F] text-white transition-all shadow"
          >
            Gửi Cửa Loại (Val: 99)
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-industrial-card border-2 border-amber-500/80 rounded-xl max-w-md w-full p-6 shadow-2xl glow-yellow">
            <div className="flex items-center gap-3 mb-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold font-mono uppercase">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              {confirmModal.description}
            </p>
            <div className="flex items-center justify-end gap-3 font-mono text-xs font-bold">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, open: false })}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                CANCEL
              </button>
              <button
                onClick={async () => {
                  const act = confirmModal.action;
                  setConfirmModal({ ...confirmModal, open: false });
                  await act();
                }}
                className="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white border border-amber-400 glow-yellow"
              >
                CONFIRM ACTION
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
