import React, { useState } from 'react';
import { Layers, Search, Filter, Sparkles, QrCode, Plus, RotateCcw } from 'lucide-react';
import { useHmiStore } from '../stores/hmiStore';
import { useClassifierStore } from '../stores/classifierStore';
import { BinCard } from '../components/bins/BinCard';
import { GateModal } from '../components/bins/GateModal';
import { DistrictQrModal } from '../components/classifier/DistrictQrModal';
import { apiService } from '../services/api';
import { Bin } from '../types';

export const BinsPage: React.FC = () => {
  const { bins, restoreDefaultBins, addToast } = useHmiStore();
  const { setIsDistrictModalOpen } = useClassifierStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isGateModalOpen, setIsGateModalOpen] = useState(false);
  const [editingBin, setEditingBin] = useState<Bin | null>(null);

  const filteredBins = bins.filter((bin) => {
    const matchesSearch =
      bin.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bin.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bin.productCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      bin.status === statusFilter ||
      (statusFilter === 'EMPTY' && bin.quantity === 0) ||
      (statusFilter === 'AVAILABLE' && bin.quantity > 0);

    return matchesSearch && matchesStatus;
  });

  const handleOpenCreateModal = () => {
    setEditingBin(null);
    setIsGateModalOpen(true);
  };

  const handleOpenEditModal = (bin: Bin) => {
    setEditingBin(bin);
    setIsGateModalOpen(true);
  };

  const handleRestoreDefaults = async () => {
    if (window.confirm('Khôi phục danh sách 5 Cửa Đà Nẵng + Cửa Reject mặc định ban đầu?')) {
      try {
        await apiService.restoreDefaultBins();
      } catch {
        // Fallback
      }
      restoreDefaultBins();
      addToast('success', 'Đã khôi phục 5 Cửa Đà Nẵng mặc định');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#E8EAEF] shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight">
              Quản Lý Cửa Phân Loại (Chutes & Bins)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D4F63D]/30 border border-[#D4F63D] text-[#111827]">
              {bins.length} Cửa Hoạt Động
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu hình CRUD, gán mã quận, định mức sức chứa, và kiểm tra van gạt PLC thời gian thực.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm cửa, quận..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-[#E8EAEF] rounded-full pl-9 pr-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#D4F63D]"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-[#E8EAEF] rounded-full px-3 py-2 text-xs font-semibold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent outline-none cursor-pointer"
            >
              <option value="ALL">TẤT CẢ TRẠNG THÁI</option>
              <option value="AVAILABLE">AVAILABLE (CÓ HÀNG)</option>
              <option value="EMPTY">EMPTY (RỖNG)</option>
              <option value="FULL">FULL (ĐẦY TẢI)</option>
            </select>
          </div>

          {/* Restore Defaults */}
          <button
            onClick={handleRestoreDefaults}
            title="Khôi phục 5 Cửa Đà Nẵng mặc định"
            className="py-2 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mặc Định</span>
          </button>

          {/* Print QR modal button */}
          <button
            onClick={() => setIsDistrictModalOpen(true)}
            className="py-2 px-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-slate-800" />
            <span>In Tem QR</span>
          </button>

          {/* Add New Gate CTA Button */}
          <button
            onClick={handleOpenCreateModal}
            className="py-2 px-4 rounded-full bg-[#141718] hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer group"
          >
            <div className="w-4 h-4 rounded-full bg-[#D4F63D] text-[#141718] flex items-center justify-center text-[10px] font-black group-hover:rotate-90 transition-transform">
              <Plus className="w-3 h-3 stroke-[3]" />
            </div>
            <span>+ Thêm Cửa Mới</span>
          </button>
        </div>
      </div>

      {/* Grid of Bins */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        {filteredBins.map((bin) => (
          <BinCard key={bin.id} bin={bin} onEdit={handleOpenEditModal} />
        ))}
      </div>

      {filteredBins.length === 0 && (
        <div className="bg-white rounded-3xl p-12 border border-[#E8EAEF] text-center space-y-3">
          <Layers className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Không tìm thấy cửa phân loại nào</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Thử thay đổi từ khóa tìm kiếm hoặc nhấn nút "+ Thêm Cửa Mới" để tạo cửa phân loại mới.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#141718] text-white text-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#D4F63D]" />
            <span>Thêm Cửa Ngay</span>
          </button>
        </div>
      )}

      {/* Gate CRUD Modal */}
      <GateModal
        isOpen={isGateModalOpen}
        onClose={() => {
          setIsGateModalOpen(false);
          setEditingBin(null);
        }}
        binToEdit={editingBin}
      />

      {/* QR Modal */}
      <DistrictQrModal />
    </div>
  );
};

export default BinsPage;

