import React, { useState } from 'react';
import { useClassifierStore } from '../../stores/classifierStore';
import { ClassificationRule } from '../../types/classifier';
import { Plus, Trash2, Save, Check, Layers, AlertCircle, ArrowRight } from 'lucide-react';

export const TabRulesConfig: React.FC = () => {
  const { config, updateRules, addLog } = useClassifierStore();

  const [rules, setRules] = useState<ClassificationRule[]>(config.rules);
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);

  const handleRuleChange = (
    index: number,
    field: keyof ClassificationRule,
    value: string | number
  ) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: value };
    setRules(updated);
  };

  const handleAddRule = () => {
    const newRule: ClassificationRule = {
      id: `rule_${Date.now()}`,
      name: `Quy tắc Cửa ${rules.length + 1}`,
      qr_contains: '',
      color: '',
      gate_id: rules.length + 1,
      plc_signal_value: rules.length + 1,
    };
    setRules([...rules, newRule]);
  };

  const handleDeleteRule = (index: number) => {
    const updated = rules.filter((_, i) => i !== index);
    setRules(updated);
  };

  const handleSave = () => {
    updateRules(rules);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
    addLog('INFO', `Đã cập nhật Bảng Quy tắc Phân loại thành công! (${rules.length} quy tắc).`);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-[#2D2D35]">
        <div>
          <h4 className="text-sm sm:text-base font-extrabold text-[#111827] dark:text-[#00E5FF] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00E5FF]" />
            <span>Bảng Quy Tắc Phân Loại (Mapping Rules)</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Khớp mã QR hoặc màu sắc để tự động đẩy hàng vào Cửa phân loại PLC tương ứng.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddRule}
          className="self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-black bg-[#00E5FF] hover:bg-[#00cbe2] text-slate-950 transition-all flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Thêm Quy Tắc</span>
        </button>
      </div>

      {/* Rules Responsive Table Container with generous min-width */}
      <div className="overflow-x-auto w-full border border-slate-200 dark:border-[#2D2D35] rounded-2xl bg-white dark:bg-[#141722] shadow-xs">
        <table className="w-full min-w-[780px] border-collapse text-left">
          <thead>
            <tr className="bg-slate-100 dark:bg-[#1C202C] text-slate-700 dark:text-[#00E5FF] border-b border-slate-200 dark:border-[#2D2D35] text-xs font-black uppercase tracking-wider">
              <th className="py-3 px-3.5 w-[220px]">Tên Quy Tắc</th>
              <th className="py-3 px-3.5 w-[190px]">Từ Khóa QR</th>
              <th className="py-3 px-3.5 w-[170px]">Màu Sắc Lọc</th>
              <th className="py-3 px-3.5 w-[100px] text-center">Mã Cửa</th>
              <th className="py-3 px-3.5 w-[110px] text-center">Tín Hiệu PLC</th>
              <th className="py-3 px-3.5 w-[70px] text-center">Xóa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#232838]">
            {rules.map((rule, idx) => (
              <tr
                key={rule.id || idx}
                className="hover:bg-slate-50/80 dark:hover:bg-[#1A1D28] transition-colors"
              >
                {/* Rule Name */}
                <td className="py-2.5 px-3">
                  <input
                    type="text"
                    value={rule.name}
                    onChange={(e) => handleRuleChange(idx, 'name', e.target.value)}
                    placeholder="VD: Quận Hải Châu - Cửa 1"
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1D26] border border-slate-200 dark:border-[#2D3344] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00E5FF] transition-all"
                  />
                </td>

                {/* QR Contains */}
                <td className="py-2.5 px-3">
                  <input
                    type="text"
                    value={rule.qr_contains}
                    onChange={(e) => handleRuleChange(idx, 'qr_contains', e.target.value)}
                    placeholder="VD: HAI_CHAU"
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1D26] border border-slate-200 dark:border-[#2D3344] text-[#00E5FF] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00E5FF] transition-all"
                  />
                </td>

                {/* Color */}
                <td className="py-2.5 px-3">
                  <select
                    value={rule.color || ''}
                    onChange={(e) => handleRuleChange(idx, 'color', e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1D26] border border-slate-200 dark:border-[#2D3344] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00E5FF] cursor-pointer transition-all"
                  >
                    <option value="">(Không lọc màu)</option>
                    <option value="RED">🔴 RED (Màu Đỏ)</option>
                    <option value="GREEN">🟢 GREEN (Màu Xanh lá)</option>
                    <option value="BLUE">🔵 BLUE (Màu Xanh dương)</option>
                    <option value="YELLOW">🟡 YELLOW (Màu Vàng)</option>
                  </select>
                </td>

                {/* Gate ID */}
                <td className="py-2.5 px-3 text-center">
                  <input
                    type="number"
                    value={rule.gate_id}
                    onChange={(e) =>
                      handleRuleChange(idx, 'gate_id', parseInt(e.target.value, 10) || 1)
                    }
                    min="1"
                    max="99"
                    className="w-16 mx-auto text-center font-mono font-bold text-xs py-2 px-1 rounded-xl bg-slate-50 dark:bg-[#1A1D26] border border-slate-200 dark:border-[#2D3344] text-amber-500 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-[#00E5FF]"
                  />
                </td>

                {/* PLC Signal Value */}
                <td className="py-2.5 px-3 text-center">
                  <input
                    type="number"
                    value={rule.plc_signal_value}
                    onChange={(e) =>
                      handleRuleChange(
                        idx,
                        'plc_signal_value',
                        parseInt(e.target.value, 10) || 1
                      )
                    }
                    min="1"
                    max="99"
                    className="w-16 mx-auto text-center font-mono font-bold text-xs py-2 px-1 rounded-xl bg-slate-50 dark:bg-[#1A1D26] border border-slate-200 dark:border-[#2D3344] text-emerald-500 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-[#00E5FF]"
                  />
                </td>

                {/* Delete */}
                <td className="py-2.5 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(idx)}
                    className="p-2 rounded-xl text-rose-500 hover:text-white hover:bg-rose-500/20 transition-all cursor-pointer"
                    title="Xóa quy tắc này"
                  >
                    <Trash2 className="w-4 h-4 mx-auto" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Helper notice */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 px-1">
        <AlertCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>
          Gợi ý: Nếu để trống <strong>Từ khóa QR</strong>, hệ thống sẽ phân loại chỉ dựa trên <strong>Màu Sắc Lọc</strong>.
        </span>
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        className={`w-full py-3 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
          showSavedToast
            ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400/50'
            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
        }`}
      >
        {showSavedToast ? <Check className="w-4 h-4 stroke-[3]" /> : <Save className="w-4 h-4" />}
        <span>{showSavedToast ? 'Đã Lưu Thành Công Cấu Hình Quy Tắc!' : 'Lưu Quy Tắc Phân Loại'}</span>
      </button>
    </div>
  );
};
