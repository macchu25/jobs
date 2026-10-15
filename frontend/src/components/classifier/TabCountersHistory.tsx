import React from 'react';
import { useClassifierStore } from '../../stores/classifierStore';
import { RotateCcw, QrCode } from 'lucide-react';

export const TabCountersHistory: React.FC = () => {
  const { counters, history, resetCounters, setIsDistrictModalOpen } = useClassifierStore();

  return (
    <div className="flex flex-col gap-4">
      {/* Counters GroupBox */}
      <div className="qt-groupbox bg-[#1A1A1E] border border-[#2D2D35] rounded-lg p-3 pt-5 relative">
        <span className="qt-groupbox-title-card">Bộ Đếm Sản Phẩm (Counters)</span>

        <div className="space-y-2.5 text-xs sm:text-sm">
          {/* Total */}
          <div className="flex items-center justify-between border-b border-[#2D2D35] pb-1.5">
            <span className="font-bold text-[#E0E0E0]">TỔNG SẢN PHẨM:</span>
            <span className="text-[#00E5FF] font-bold text-xl sm:text-2xl font-mono">
              {counters.TOTAL}
            </span>
          </div>

          {/* Gate 1 */}
          <div className="flex items-center justify-between border-b border-[#2D2D35] pb-1">
            <span className="text-[#E0E0E0]">Cửa 1 (Q. Hải Châu - Đỏ):</span>
            <span className="text-[#FF3B30] font-bold text-base sm:text-lg font-mono">
              {counters.GATE_1}
            </span>
          </div>

          {/* Gate 2 */}
          <div className="flex items-center justify-between border-b border-[#2D2D35] pb-1">
            <span className="text-[#E0E0E0]">Cửa 2 (Q. Thanh Khê - Xanh lá):</span>
            <span className="text-[#34C759] font-bold text-base sm:text-lg font-mono">
              {counters.GATE_2}
            </span>
          </div>

          {/* Gate 3 */}
          <div className="flex items-center justify-between border-b border-[#2D2D35] pb-1">
            <span className="text-[#E0E0E0]">Cửa 3 (Q. Liên Chiểu - Xanh dương):</span>
            <span className="text-[#007AFF] font-bold text-base sm:text-lg font-mono">
              {counters.GATE_3}
            </span>
          </div>

          {/* Gate 4 */}
          <div className="flex items-center justify-between border-b border-[#2D2D35] pb-1">
            <span className="text-[#E0E0E0]">Cửa 4 (Q. Ngũ Hành Sơn):</span>
            <span className="text-[#FF9500] font-bold text-base sm:text-lg font-mono">
              {counters.GATE_4}
            </span>
          </div>

          {/* Gate 5 */}
          <div className="flex items-center justify-between border-b border-[#2D2D35] pb-1">
            <span className="text-[#E0E0E0]">Cửa 5 (Q. Cẩm Lệ):</span>
            <span className="text-[#AF52DE] font-bold text-base sm:text-lg font-mono">
              {counters.GATE_5}
            </span>
          </div>

          {/* Reject */}
          <div className="flex items-center justify-between pb-1">
            <span className="text-[#E0E0E0]">Cửa Loại (Reject/Lỗi):</span>
            <span className="text-[#8E8E93] font-bold text-base sm:text-lg font-mono">
              {counters.REJECT}
            </span>
          </div>

          {/* Buttons Row */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={resetCounters}
              className="qt-btn flex-1 text-xs sm:text-sm py-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Bộ Đếm</span>
            </button>

            <button
              onClick={() => setIsDistrictModalOpen(true)}
              className="qt-btn qt-btn-purple flex-1 text-xs sm:text-sm py-2"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Tạo & Mở Thư Mục Tem QR (5 Quận)</span>
            </button>
          </div>
        </div>
      </div>

      {/* History GroupBox */}
      <div className="qt-groupbox bg-[#1A1A1E] border border-[#2D2D35] rounded-lg p-3 pt-5 relative flex-1">
        <span className="qt-groupbox-title-card">Lịch sử Phân loại Gần đây</span>

        <div className="overflow-x-auto max-h-[220px] overflow-y-auto border border-[#2D2D35] rounded">
          <table className="qt-table min-w-[540px]">
            <thead>
              <tr>
                <th className="w-24">Thời gian</th>
                <th>Mã QR</th>
                <th className="w-28">Màu sắc</th>
                <th className="w-24">Cửa PLC</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-[#888888] py-4 italic">
                    Chưa có lịch sử quét sản phẩm
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id}>
                    <td className="font-mono text-[#AAAAAA]">{item.timestamp}</td>
                    <td
                      className="text-white font-medium truncate max-w-[180px]"
                      title={item.qr_data}
                    >
                      {item.qr_data}
                    </td>
                    <td>
                      <span
                        className="px-1.5 py-0.5 rounded text-[11px] font-bold"
                        style={{
                          backgroundColor:
                            item.color === 'RED'
                              ? 'rgba(255, 59, 48, 0.2)'
                              : item.color === 'GREEN'
                              ? 'rgba(52, 199, 89, 0.2)'
                              : item.color === 'BLUE'
                              ? 'rgba(0, 122, 255, 0.2)'
                              : 'rgba(142, 142, 147, 0.2)',
                          color:
                            item.color === 'RED'
                              ? '#FF3B30'
                              : item.color === 'GREEN'
                              ? '#34C759'
                              : item.color === 'BLUE'
                              ? '#007AFF'
                              : '#8E8E93',
                        }}
                      >
                        {item.color}
                      </span>
                    </td>
                    <td className="font-bold text-[#00E5FF]">Cửa {item.gate_id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
