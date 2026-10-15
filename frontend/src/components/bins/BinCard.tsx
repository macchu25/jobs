import React, { useState } from 'react';
import { ArrowUpRight, Loader2, Play, CheckCircle2, Edit3, RotateCcw } from 'lucide-react';
import { Bin } from '../../types';
import { useHmiStore } from '../../stores/hmiStore';
import { apiService } from '../../services/api';

interface BinCardProps {
  bin: Bin;
  onEdit?: (bin: Bin) => void;
}

export const BinCard: React.FC<BinCardProps> = ({ bin, onEdit }) => {
  const { machine, addToast } = useHmiStore();
  const [isCalling, setIsCalling] = useState(false);

  const percent = Math.min(100, Math.round((bin.quantity / bin.capacity) * 100));

  const isCommandDisabled =
    bin.busy ||
    isCalling ||
    machine.emergencyStop ||
    (machine.mode === 'real' && (!machine.plcConnected || !machine.realWritesEnabled));

  const handleCallItem = async () => {
    if (isCommandDisabled) return;
    setIsCalling(true);
    try {
      await apiService.callItem(bin.id);
      addToast('success', `Đã kích hoạt cơ cấu gạt cho ${bin.name}`);
    } catch (err: any) {
      addToast('error', err.message || `Lỗi kích hoạt ${bin.id}`);
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between shadow-xs hover:shadow-md relative overflow-hidden group ${
        bin.busy
          ? 'border-[#D4F63D] ring-2 ring-[#D4F63D]/40'
          : 'border-[#E8EAEF] hover:border-slate-300'
      }`}
    >
      {/* Top Color Accent Line */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{ backgroundColor: bin.colorHex || '#34C759' }}
      />

      <div>
        {/* Header: ID, Status & Edit Action */}
        <div className="flex items-center justify-between gap-2 mb-3 pt-1">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: bin.colorHex || '#34C759' }}
            />
            <span className="text-xs font-extrabold font-mono text-[#111827] px-2 py-0.5 bg-slate-100 rounded-lg">
              {bin.id}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                bin.busy
                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                  : bin.quantity > 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {bin.busy ? 'GẠT PLC' : bin.quantity > 0 ? 'AVAILABLE' : 'EMPTY'}
            </span>

            {onEdit && (
              <button
                onClick={() => onEdit(bin)}
                title="Chỉnh sửa cấu hình cửa"
                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-[#141718] hover:text-[#D4F63D] text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#111827] truncate" title={bin.productName}>
            {bin.name}
          </h3>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
            {bin.productName}
          </p>
        </div>

        {/* Quantity Progress Bar */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between text-xs font-mono mb-1.5">
            <span className="text-slate-400 font-semibold">Sản phẩm:</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-extrabold text-[#111827]">{bin.quantity}</span>
              <span className="text-slate-400 text-xs">/ {bin.capacity}</span>
              <span className="text-xs text-slate-500 font-bold ml-1">({percent}%)</span>
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-[#A3E635]"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Button: Call Item / Trigger Gate */}
      <div>
        <button
          onClick={handleCallItem}
          disabled={isCommandDisabled}
          className={`w-full py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isCommandDisabled
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-[#141718] hover:bg-black text-white shadow-sm active:scale-95'
          }`}
        >
          {isCalling || bin.busy ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4F63D]" />
              <span>ĐANG GẠT...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current text-[#D4F63D]" />
              <span>KÍCH HOẠT CỬA</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
