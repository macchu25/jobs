import React, { useState } from 'react';
import { Play, Square, Plus, AlertOctagon, WifiOff, RotateCcw, FastForward, Sliders } from 'lucide-react';
import { useHmiStore } from '../../stores/hmiStore';
import { apiService } from '../../services/api';

export const SimControlPanel: React.FC = () => {
  const { machine, addToast } = useHmiStore();
  const [selectedProduct, setSelectedProduct] = useState('PRODUCT_A');
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [speed, setSpeed] = useState(1);

  if (machine.mode !== 'simulation') return null;

  const handleAddRandom = async () => {
    try {
      await apiService.simAddRandom();
      addToast('success', 'Generated random package on infeed');
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleAddProduct = async () => {
    try {
      await apiService.simAddProduct(selectedProduct);
      addToast('success', `Queued package for ${selectedProduct}`);
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleToggleAuto = async () => {
    try {
      if (isAutoGenerating) {
        await apiService.simStopAuto();
        setIsAutoGenerating(false);
        addToast('info', 'Stopped auto-generation');
      } else {
        await apiService.simStartAuto();
        setIsAutoGenerating(true);
        addToast('success', 'Auto-generation started (1 item / 5s)');
      }
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleJam = async () => {
    try {
      await apiService.simJam();
      addToast('error', 'SIMULATION: Item jam triggered along conveyor');
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleDisconnect = async () => {
    try {
      await apiService.simDisconnect();
      addToast('warning', 'SIMULATION: PLC heartbeat disconnected for 8 seconds');
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleReset = async () => {
    try {
      await apiService.simReset();
      setIsAutoGenerating(false);
      addToast('info', 'Simulation state reset to default');
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  return (
    <div className="bg-gradient-to-r from-industrial-card to-slate-900 border border-cyan-900/60 rounded-xl p-5 mb-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold text-cyan-300 uppercase tracking-wider font-mono">
            Virtual Plant Simulation Controls
          </h2>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700/50 text-cyan-400">
          MODE: SIMULATION ACTIVE
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Add Random Item */}
        <button
          onClick={handleAddRandom}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold font-mono transition-all"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>RANDOM ITEM</span>
        </button>

        {/* Add Specific Product */}
        <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="bg-transparent text-slate-200 text-xs font-mono font-bold px-2 py-2 outline-none cursor-pointer"
          >
            <option value="PRODUCT_A" className="bg-slate-900">PROD A</option>
            <option value="PRODUCT_B" className="bg-slate-900">PROD B</option>
            <option value="PRODUCT_C" className="bg-slate-900">PROD C</option>
            <option value="PRODUCT_D" className="bg-slate-900">PROD D</option>
            <option value="PRODUCT_E" className="bg-slate-900">PROD E</option>
            <option value="PRODUCT_F" className="bg-slate-900">PROD F</option>
          </select>
          <button
            onClick={handleAddProduct}
            className="flex-1 px-2.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono transition-colors"
          >
            ADD
          </button>
        </div>

        {/* Auto Generation Toggle */}
        <button
          onClick={handleToggleAuto}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-bold font-mono transition-all ${
            isAutoGenerating
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 animate-pulse glow-green'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
          }`}
        >
          {isAutoGenerating ? (
            <>
              <Square className="w-3.5 h-3.5" />
              <span>STOP AUTO</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>AUTO FEED</span>
            </>
          )}
        </button>

        {/* Simulate Jam Fault */}
        <button
          onClick={handleJam}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-amber-950/60 border border-slate-700 hover:border-amber-600 text-amber-300 text-xs font-bold font-mono transition-all"
        >
          <AlertOctagon className="w-4 h-4 text-amber-400" />
          <span>SIM JAM</span>
        </button>

        {/* Simulate Disconnect Fault */}
        <button
          onClick={handleDisconnect}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-red-950/60 border border-slate-700 hover:border-red-600 text-red-300 text-xs font-bold font-mono transition-all"
        >
          <WifiOff className="w-4 h-4 text-red-400" />
          <span>DISCONNECT</span>
        </button>

        {/* Reset Plant */}
        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold font-mono transition-all"
        >
          <RotateCcw className="w-4 h-4 text-cyan-400" />
          <span>RESET PLANT</span>
        </button>
      </div>
    </div>
  );
};
