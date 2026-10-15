import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, RotateCcw, Sparkles, Layers, Hash, Check } from 'lucide-react';
import { Bin } from '../../types';
import { useHmiStore } from '../../stores/hmiStore';
import { apiService } from '../../services/api';

interface GateModalProps {
  isOpen: boolean;
  onClose: () => void;
  binToEdit?: Bin | null; // null means CREATE mode
}

const PRESET_COLORS = [
  { name: 'Đỏ (Red)', hex: '#FF3B30' },
  { name: 'Xanh lá (Green)', hex: '#34C759' },
  { name: 'Xanh dương (Blue)', hex: '#007AFF' },
  { name: 'Cam (Orange)', hex: '#FF9500' },
  { name: 'Tím (Purple)', hex: '#AF52DE' },
  { name: 'Xanh ngọc (Teal)', hex: '#00C7BE' },
  { name: 'Vàng Chanh (Lime)', hex: '#D4F63D' },
  { name: 'Hồng (Pink)', hex: '#FF2D55' },
  { name: 'Đỏ gạch (Reject)', hex: '#FF453A' },
  { name: 'Xám (Slate)', hex: '#64748B' },
];

export const GateModal: React.FC<GateModalProps> = ({ isOpen, onClose, binToEdit }) => {
  const { addBin, updateBin, deleteBin, resetBinQuantity, addToast, bins } = useHmiStore();
  const isEditMode = Boolean(binToEdit);

  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [quantity, setQuantity] = useState(0);
  const [plcSignal, setPlcSignal] = useState(1);
  const [colorHex, setColorHex] = useState('#34C759');
  const [qrKeyword, setQrKeyword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (binToEdit) {
      setId(binToEdit.id);
      setName(binToEdit.name);
      setDistrict(binToEdit.name.split(' - ')[-1] || binToEdit.name);
      setProductCode(binToEdit.productCode);
      setProductName(binToEdit.productName);
      setCapacity(binToEdit.capacity || 100);
      setQuantity(binToEdit.quantity || 0);
      setPlcSignal(binToEdit.plcSignal ?? (binToEdit.gateNumber ?? 1));
      setColorHex(binToEdit.colorHex || '#34C759');
      setQrKeyword(binToEdit.qrKeyword || '');
    } else {
      // Auto suggest next gate number
      const nextNum = bins.length + 1;
      setId(`GATE_${nextNum}`);
      setName(`Cửa ${nextNum} - Q. Mới`);
      setDistrict('Quận Mới');
      setProductCode(`DISTRICT_${nextNum}`);
      setProductName(`Quận Mới (Tem Tùy Chỉnh)`);
      setCapacity(100);
      setQuantity(0);
      setPlcSignal(nextNum);
      setColorHex(PRESET_COLORS[(nextNum - 1) % PRESET_COLORS.length].hex);
      setQrKeyword(`DISTRICT_${nextNum}`);
    }
    setShowDeleteConfirm(false);
  }, [binToEdit, isOpen, bins.length]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('warning', 'Vui lòng nhập tên cửa phân loại');
      return;
    }

    setIsSubmitting(true);
    const gateData: Bin = {
      id: id.trim() || `GATE_${plcSignal}`,
      gateNumber: plcSignal,
      name: name.trim(),
      productCode: productCode.trim() || `SKU_${plcSignal}`,
      productName: productName.trim() || name.trim(),
      colorHex,
      plcSignal: Number(plcSignal),
      qrKeyword: qrKeyword.trim() || name.trim(),
      quantity: Number(quantity) || 0,
      capacity: Number(capacity) || 100,
      status: Number(quantity) >= Number(capacity) ? 'FULL' : Number(quantity) > 0 ? 'AVAILABLE' : 'EMPTY',
      sensorActive: false,
      busy: false,
      pusherExtended: false,
    };

    try {
      if (isEditMode && binToEdit) {
        // Try calling backend API
        try {
          await apiService.updateBin(binToEdit.id, gateData);
        } catch {
          // Fallback to local store
        }
        updateBin(gateData);
        addToast('success', `Đã cập nhật cấu hình ${gateData.name}`);
      } else {
        try {
          await apiService.createBin(gateData);
        } catch {
          // Fallback to local store
        }
        addBin(gateData);
        addToast('success', `Đã thêm mới ${gateData.name} vào hệ thống`);
      }
      onClose();
    } catch (err: any) {
      addToast('error', err.message || 'Lỗi lưu thông tin cửa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!binToEdit) return;
    setIsSubmitting(true);
    try {
      try {
        await apiService.deleteBin(binToEdit.id);
      } catch {
        // Fallback
      }
      deleteBin(binToEdit.id);
      addToast('info', `Đã xóa cửa ${binToEdit.name}`);
      onClose();
    } catch (err: any) {
      addToast('error', err.message || 'Lỗi khi xóa cửa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetCounter = async () => {
    if (!binToEdit) return;
    try {
      try {
        await apiService.resetBin(binToEdit.id);
      } catch {
        // Fallback
      }
      resetBinQuantity(binToEdit.id);
      setQuantity(0);
      addToast('success', `Đã đặt lại số đếm kiện hàng của ${binToEdit.name} về 0`);
    } catch (err: any) {
      addToast('error', err.message || 'Lỗi khi reset');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#E8EAEF] max-w-xl w-full p-4 sm:p-7 shadow-2xl relative max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-md"
              style={{ backgroundColor: colorHex }}
            >
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#111827] tracking-tight">
                {isEditMode ? `Chỉnh Sửa Thông Tin Cửa` : `Thêm Cửa Phân Loại Mới`}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEditMode ? `Cập nhật thông số gán PLC và sức chứa` : `Cấu hình cửa phân loại mới cho dây chuyền`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Delete Confirmation View */}
        {showDeleteConfirm ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#111827]">
                Xác nhận xóa {binToEdit?.name}?
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Hành động này sẽ gỡ bỏ cửa khỏi danh sách phân loại. Băng chuyền sẽ không kích hoạt cửa này khi quét mã tương ứng.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Đang xóa...' : 'Đồng ý Xóa Cửa'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Row 1: ID & Tên Cửa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mã Cửa (ID) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  disabled={isEditMode}
                  placeholder="GATE_1"
                  required
                  className={`w-full bg-slate-50 border border-[#E8EAEF] rounded-2xl px-3.5 py-2 text-xs font-mono font-bold text-[#111827] outline-none focus:ring-2 focus:ring-[#D4F63D] ${
                    isEditMode ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tên Hiển Thị <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Cửa 1 - Q. Hải Châu"
                  required
                  className="w-full bg-slate-50 border border-[#E8EAEF] rounded-2xl px-3.5 py-2 text-xs font-semibold text-[#111827] outline-none focus:ring-2 focus:ring-[#D4F63D]"
                />
              </div>
            </div>

            {/* Row 2: Quận & Tên Sản Phẩm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tên Quận / Khu Vực
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Hải Châu"
                  className="w-full bg-slate-50 border border-[#E8EAEF] rounded-2xl px-3.5 py-2 text-xs font-semibold text-[#111827] outline-none focus:ring-2 focus:ring-[#D4F63D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mô Tả / Tem Nhận Diện
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Quận Hải Châu (Màu Đỏ)"
                  className="w-full bg-slate-50 border border-[#E8EAEF] rounded-2xl px-3.5 py-2 text-xs font-semibold text-[#111827] outline-none focus:ring-2 focus:ring-[#D4F63D]"
                />
              </div>
            </div>

            {/* Row 3: Tín Hiệu PLC & Từ Khóa QR */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tín Hiệu PLC (Reg 0) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={plcSignal}
                  onChange={(e) => setPlcSignal(Number(e.target.value))}
                  required
                  className="w-full bg-slate-50 border border-[#E8EAEF] rounded-2xl px-3.5 py-2 text-xs font-mono font-bold text-[#111827] outline-none focus:ring-2 focus:ring-[#D4F63D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Sức Chứa (Capacity)
                </label>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  required
                  className="w-full bg-slate-50 border border-[#E8EAEF] rounded-2xl px-3.5 py-2 text-xs font-mono font-bold text-[#111827] outline-none focus:ring-2 focus:ring-[#D4F63D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Số Kiện Hiện Có
                </label>
                <input
                  type="number"
                  min={0}
                  max={capacity}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-[#E8EAEF] rounded-2xl px-3.5 py-2 text-xs font-mono font-bold text-[#111827] outline-none focus:ring-2 focus:ring-[#D4F63D]"
                />
              </div>
            </div>

            {/* Row 4: Mã Màu Nhận Diện */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Màu Nhận Diện Cửa
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((col) => {
                  const isSelected = colorHex.toLowerCase() === col.hex.toLowerCase();
                  return (
                    <button
                      type="button"
                      key={col.hex}
                      onClick={() => setColorHex(col.hex)}
                      title={col.name}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform cursor-pointer shadow-xs ${
                        isSelected ? 'scale-115 ring-2 ring-slate-800 ring-offset-2' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: col.hex }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  );
                })}
                <div className="flex items-center gap-1.5 ml-2">
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <span className="text-[11px] font-mono text-slate-500 font-bold uppercase">{colorHex}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons Footer */}
            <div className="flex items-center justify-between pt-5 border-t border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                {isEditMode && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3.5 py-2 rounded-full text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa Cửa</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetCounter}
                      className="px-3.5 py-2 rounded-full text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Đặt lại số lượng kiện về 0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Về 0</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#141718] hover:bg-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 text-[#D4F63D]" />
                  <span>{isSubmitting ? 'Đang lưu...' : isEditMode ? 'Lưu Thay Đổi' : 'Tạo Cửa Mới'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
