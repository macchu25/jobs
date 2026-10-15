import React from 'react';
import { TabQrGenerator } from '../components/classifier/TabQrGenerator';
import { DistrictQrModal } from '../components/classifier/DistrictQrModal';
import { useClassifierStore } from '../stores/classifierStore';
import { QrCode, Layers } from 'lucide-react';

export const QrPage: React.FC = () => {
  const { setIsDistrictModalOpen } = useClassifierStore();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E8EAEF] rounded-3xl p-6 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight">
            Tạo & In Tem Mã QR Đa Năng
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Định dạng Dual-Purpose: Quét bằng điện thoại mở Google Maps số nhà, quét qua webcam/băng chuyền kích hoạt Cửa PLC.
          </p>
        </div>

        <button
          onClick={() => setIsDistrictModalOpen(true)}
          className="inline-flex items-center gap-2 bg-[#141718] hover:bg-black text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer"
        >
          <QrCode className="w-4 h-4 text-[#D4F63D]" />
          <span>Bộ 5 Tem Chuẩn Đà Nẵng</span>
        </button>
      </div>

      <div className="max-w-4xl">
        <TabQrGenerator />
      </div>

      <DistrictQrModal />
    </div>
  );
};

export default QrPage;
