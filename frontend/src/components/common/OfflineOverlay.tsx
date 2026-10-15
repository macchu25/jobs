import React from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useHmiStore } from '../../stores/hmiStore';

export const OfflineOverlay: React.FC = () => {
  const { wsConnected, lastUpdate } = useHmiStore();

  if (wsConnected) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
      <div className="max-w-md w-full bg-industrial-card border-2 border-red-600/80 rounded-xl p-8 shadow-2xl text-center glow-red">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-red-950/60 rounded-full border border-red-600/50 animate-pulse">
            <WifiOff className="w-12 h-12 text-red-500" />
          </div>
        </div>

        <h1 className="text-2xl font-black tracking-wider text-red-500 uppercase mb-2">
          SERVER OFFLINE
        </h1>

        <p className="text-slate-300 text-sm font-medium mb-4">
          Connection to control server lost.
          <br />
          <span className="text-red-400 font-semibold">Control commands are disabled.</span>
        </p>

        <div className="bg-slate-900/80 border border-slate-700/60 rounded-lg p-3 mb-6 text-xs text-slate-400 font-mono">
          <p>Last update received:</p>
          <p className="text-sm font-bold text-slate-200 mt-1">
            {lastUpdate || 'Waiting for heartbeat...'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-amber-400/90 bg-amber-950/40 border border-amber-800/40 p-2.5 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Failsafe active: commands locked until server reconnects.</span>
        </div>

        <button
          onClick={() => {
            useHmiStore.getState().setWsConnected(true);
          }}
          className="text-xs text-slate-400 hover:text-white underline font-mono"
        >
          Tiếp tục xem giao diện chế độ Offline Simulation &rarr;
        </button>
      </div>
    </div>
  );
};
