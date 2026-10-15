import React, { useState } from 'react';
import { useClassifierStore } from '../../stores/classifierStore';
import { Save, Send, Check } from 'lucide-react';

export const TabPlcSettings: React.FC = () => {
  const { config, updatePlcConfig, sendManualSignal } = useClassifierStore();

  const [ip, setIp] = useState<string>(config.plc.ip || '192.168.0.1');
  const [port, setPort] = useState<number>(config.plc.port || 503);
  const [slaveId, setSlaveId] = useState<number>(config.plc.slave_id || 1);
  const [regAddr, setRegAddr] = useState<number>(config.plc.register_address || 0);
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);

  const handleSave = () => {
    updatePlcConfig({
      ...config.plc,
      ip,
      port,
      slave_id: slaveId,
      register_address: regAddr,
    });
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Modbus Connection Form */}
      <div className="qt-groupbox bg-[#1A1A1E] border border-[#2D2D35] rounded-lg p-3 pt-5 relative">
        <span className="qt-groupbox-title-card">
          Cấu hình Kết nối PLC Modbus TCP
        </span>

        <div className="space-y-3 text-xs sm:text-sm">
          {/* IP */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-[#E0E0E0] font-semibold">Địa chỉ IP PLC:</label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              className="qt-input w-full sm:w-56 font-mono"
              placeholder="192.168.0.1"
            />
          </div>

          {/* Port */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-[#E0E0E0] font-semibold">Cổng (Port):</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(parseInt(e.target.value, 10) || 502)}
              className="qt-input w-full sm:w-56 font-mono"
            />
          </div>

          {/* Slave ID */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-[#E0E0E0] font-semibold">Modbus Slave ID:</label>
            <input
              type="number"
              value={slaveId}
              onChange={(e) => setSlaveId(parseInt(e.target.value, 10) || 1)}
              className="qt-input w-full sm:w-56 font-mono"
            />
          </div>

          {/* Register Address */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-[#E0E0E0] font-semibold">
              Holding Register Address:
            </label>
            <input
              type="number"
              value={regAddr}
              onChange={(e) => setRegAddr(parseInt(e.target.value, 10) || 0)}
              className="qt-input w-full sm:w-56 font-mono"
            />
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              className="qt-btn w-full py-2 flex items-center justify-center gap-2"
            >
              {showSavedToast ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{showSavedToast ? 'Đã Lưu Cấu Hình PLC!' : 'Lưu Cấu hình PLC'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Manual Trigger Group */}
      <div className="qt-groupbox bg-[#1A1A1E] border border-[#2D2D35] rounded-lg p-3 pt-5 relative">
        <span className="qt-groupbox-title-card">
          Kiểm thử Tín hiệu Thủ công (Manual Test to PLC)
        </span>

        <p className="text-xs text-[#AAAAAA] mb-3">
          Nhấn các nút bên dưới để phát trực tiếp tín hiệu phân loại sang thanh ghi PLC Modbus Holding Register #{regAddr}:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            onClick={() => sendManualSignal(1)}
            className="qt-btn text-xs py-2 bg-[#2196F3] hover:bg-[#1976D2]"
          >
            <Send className="w-3 h-3" />
            <span>Gửi Cửa 1 (Val: 1)</span>
          </button>

          <button
            onClick={() => sendManualSignal(2)}
            className="qt-btn text-xs py-2 bg-[#2196F3] hover:bg-[#1976D2]"
          >
            <Send className="w-3 h-3" />
            <span>Gửi Cửa 2 (Val: 2)</span>
          </button>

          <button
            onClick={() => sendManualSignal(3)}
            className="qt-btn text-xs py-2 bg-[#2196F3] hover:bg-[#1976D2]"
          >
            <Send className="w-3 h-3" />
            <span>Gửi Cửa 3 (Val: 3)</span>
          </button>

          <button
            onClick={() => sendManualSignal(4)}
            className="qt-btn text-xs py-2 bg-[#FF9500] hover:bg-[#E08500]"
          >
            <Send className="w-3 h-3" />
            <span>Gửi Cửa 4 (Val: 4)</span>
          </button>

          <button
            onClick={() => sendManualSignal(5)}
            className="qt-btn text-xs py-2 bg-[#AF52DE] hover:bg-[#9B42C8]"
          >
            <Send className="w-3 h-3" />
            <span>Gửi Cửa 5 (Val: 5)</span>
          </button>

          <button
            onClick={() => sendManualSignal(99)}
            className="qt-btn qt-btn-danger text-xs py-2 col-span-2 sm:col-span-1"
          >
            <Send className="w-3 h-3" />
            <span>Gửi Cửa Loại (Val: 99)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
