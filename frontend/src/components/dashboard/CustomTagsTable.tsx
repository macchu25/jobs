import React, { useState } from 'react';
import { Eye, Play, Sparkles, Tag, Check, Layers, Plus, Edit3 } from 'lucide-react';
import { useClassifierStore } from '../../stores/classifierStore';
import { useHmiStore } from '../../stores/hmiStore';
import { useLanguageStore } from '../../stores/languageStore';
import { GateModal } from '../bins/GateModal';
import { Bin } from '../../types';

export const CustomTagsTable: React.FC = () => {
  const { counters, sendManualSignal } = useClassifierStore();
  const { bins, addToast } = useHmiStore();
  const { t } = useLanguageStore();
  const [activeTag, setActiveTag] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);

  const filterTags = [
    { id: 'all', label: t.customTags.allGates },
    { id: 'fast', label: t.customTags.fastMoving },
    { id: 'discounted', label: t.customTags.discounted },
    { id: 'low', label: t.customTags.lowDemand },
  ];

  const handleTrigger = (bin: Bin) => {
    const sig = bin.plcSignal ?? (bin.gateNumber ?? 1);
    sendManualSignal(sig);
    addToast('success', `Đã kích hoạt thử nghiệm ${bin.name} (Tín hiệu PLC: ${sig})`);
  };

  const handleOpenEdit = (bin: Bin) => {
    setSelectedBin(bin);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setSelectedBin(null);
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-[#E8EAEF] shadow-xs flex flex-col justify-between">
      {/* Top Header & Tag Pills */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-[#111827] tracking-tight">
              {t.customTags.title}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {t.customTags.subtitle} ({bins.length} gates)
            </p>
          </div>
          <span className="p-1.5 rounded-full bg-slate-50 text-slate-400">
            <Sparkles className="w-4 h-4 text-[#A3E635]" />
          </span>
        </div>

        {/* Tag Buttons Row (matching Image) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-2 no-scrollbar">
          {filterTags.map((tag) => {
            const isSelected = activeTag === tag.id;
            return (
              <button
                key={tag.id}
                onClick={() => setActiveTag(tag.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#141718] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tag.label}
              </button>
            );
          })}
          <button
            onClick={handleOpenCreate}
            className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border border-dashed border-slate-300 text-slate-700 hover:border-slate-800 hover:text-black transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3 text-[#141718]" />
            <span>{t.customTags.addNewGate}</span>
          </button>
        </div>
      </div>

      {/* Table Area (matching Image layout) */}
      <div className="overflow-x-auto my-2 -mx-2 sm:mx-0 px-2 sm:px-0">
        <table className="w-full min-w-[480px] text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="pb-3 font-semibold">Products Details</th>
              <th className="pb-3 text-center font-semibold">Total Qty</th>
              <th className="pb-3 text-center font-semibold">Stock In</th>
              <th className="pb-3 text-center font-semibold">Price</th>
              <th className="pb-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {bins.map((bin) => {
              const sig = bin.plcSignal ?? (bin.gateNumber ?? 1);
              return (
                <tr key={bin.id} className="hover:bg-slate-50/70 transition-colors group">
                  {/* Details with Product Color Icon */}
                  <td className="py-2.5 pr-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-xs"
                        style={{ backgroundColor: bin.colorHex || '#34C759' }}
                      >
                        {bin.name.includes(' - ') ? bin.name.split(' - ')[1]?.[0] || 'G' : bin.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-[#111827] leading-snug">
                          {bin.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {bin.productCode || bin.id} • {bin.productName}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Total Qty */}
                  <td className="py-2.5 text-center font-bold font-mono text-[#111827]">
                    {bin.quantity.toLocaleString()}
                  </td>

                  {/* Stock in (Capacity) */}
                  <td className="py-2.5 text-center font-mono text-slate-500">
                    {bin.capacity}
                  </td>

                  {/* Price / Signal Tag */}
                  <td className="py-2.5 text-center font-bold font-mono text-[#111827]">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                      Sig {sig}
                    </span>
                  </td>

                  {/* Action Icons: Trigger & Edit */}
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleTrigger(bin)}
                        title={`Thử nghiệm Cửa ${sig}`}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-[#D4F63D] hover:text-[#111827] text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(bin)}
                        title="Chỉnh sửa thông số cửa"
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Gate CRUD Modal */}
      <GateModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBin(null);
        }}
        binToEdit={selectedBin}
      />
    </div>
  );
};
