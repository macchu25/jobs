import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Sliders,
  Server,
  Zap,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { useHmiStore } from '../../stores/hmiStore';

interface PlcConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlcConnectModal: React.FC<PlcConnectModalProps> = ({ isOpen, onClose }) => {
  const { machine, addToast, updatePLCStatus } = useHmiStore();

  const [loading, setLoading] = useState(false);
  const [testingGate, setTestingGate] = useState<number | null>(null);

  // Form states
  const [ip, setIp] = useState('192.168.0.1');
  const [port, setPort] = useState(502);
  const [slaveId, setSlaveId] = useState(1);
  const [registerAddress, setRegisterAddress] = useState(0);
  const [simulationMode, setSimulationMode] = useState(true);
  const [lastError, setLastError] = useState('');
  const [customRegister, setCustomRegister] = useState(0);
  const [customValue, setCustomValue] = useState(1);

  // Load config on open
  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await apiService.getPlcConfig();
      if (res) {
        setIp(res.ip || '192.168.0.1');
        setPort(res.port || 502);
        setSlaveId(res.slave_id || 1);
        setRegisterAddress(res.register_address || 0);
        setSimulationMode(Boolean(res.simulation_mode));
        setLastError(res.last_error || '');
        updatePLCStatus(res.connected, res.connected ? 'CONNECTED' : 'DISCONNECTED');
      }
    } catch (err: any) {
      console.warn('Could not fetch PLC config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      setLastError('');
      const res = await apiService.connectPlc({
        ip,
        port: Number(port),
        slave_id: Number(slaveId),
        register_address: Number(registerAddress),
        simulation_mode: simulationMode,
      });

      if (res?.connected || res?.success) {
        addToast('success', `Đã kết nối thành công tới PLC (${simulationMode ? 'SIMULATOR' : `${ip}:${port}`})!`);
        updatePLCStatus(true, 'CONNECTED');
      } else {
        const errMsg = res?.last_error || res?.data?.last_error || 'Không thể kết nối tới địa chỉ PLC này';
        setLastError(errMsg);
        addToast('error', `Lỗi kết nối PLC: ${errMsg}`);
        updatePLCStatus(false, 'ERROR');
      }
    } catch (err: any) {
      setLastError(err.message || 'Lỗi mạng kết nối PLC');
      addToast('error', `Kết nối thất bại: ${err.message}`);
      updatePLCStatus(false, 'ERROR');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await apiService.disconnectPlc();
      updatePLCStatus(false, 'DISCONNECTED');
      addToast('info', 'Đã ngắt kết nối PLC Modbus TCP');
    } catch (err: any) {
      addToast('error', `Lỗi khi ngắt kết nối: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestWrite = async (val: number, reg?: number) => {
    const targetReg = reg !== undefined ? reg : registerAddress;
    try {
      setTestingGate(val);
      const res = await apiService.writePlcRegister(targetReg, val);
      if (res.success) {
        addToast('success', `Đã bắn tín hiệu ${val} vào Holding Register ${targetReg}`);
      } else {
        addToast('error', `Lỗi ghi PLC: ${res.error || 'Thất bại'}`);
      }
    } catch (err: any) {
      addToast('error', `Lỗi ghi PLC: ${err.message}`);
    } finally {
      setTestingGate(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-[#E8EAEF] shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-6 py-5 bg-[#141718] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4F63D] text-[#141718] flex items-center justify-center font-black shadow-md">
              <Cpu className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                Cấu Hình & Kết Nối PLC Modbus TCP
              </h2>
              <p className="text-xs text-slate-400">
                Giao tiếp PLC công nghiệp (Siemens, Mitsubishi, Delta) & Bộ mô phỏng ảo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#F8F9FC] border border-[#E8EAEF]">
            <div className="flex items-center gap-3">
              <div
                className={`w-3.5 h-3.5 rounded-full ${
                  machine.plcConnected ? 'bg-emerald-500 animate-pulse ring-4 ring-emerald-100' : 'bg-rose-500 ring-4 ring-rose-100'
                }`}
              />
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Trạng Thái Hiện Tại
                </div>
                <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>{machine.plcConnected ? 'ĐANG KẾT NỐI (ONLINE)' : 'CHƯA KẾT NỐI (OFFLINE)'}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {simulationMode ? '🧪 GIẢ LẬP VIRTUAL' : '🏭 PLC THỰC TẾ'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {machine.plcConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Ngắt Kết Nối</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={loading}
                  className="px-4 py-2 rounded-full bg-[#141718] hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5 text-[#D4F63D]" />}
                  <span>Kết Nối Ngay</span>
                </button>
              )}
            </div>
          </div>

          {/* Last Error Banner if any */}
          {lastError && !machine.plcConnected && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Lỗi truyền thông PLC:</span> {lastError}
              </div>
            </div>
          )}

          {/* Mode Switcher */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Chế Độ Hoạt Động (Mode)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSimulationMode(true);
                  setPort(503);
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  simulationMode
                    ? 'border-[#141718] bg-slate-900 text-white shadow-sm ring-2 ring-[#D4F63D]'
                    : 'border-[#E8EAEF] bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs uppercase flex items-center gap-1.5">
                    <span>🧪 Trình Giả Lập PLC</span>
                  </span>
                  {simulationMode && <CheckCircle2 className="w-4 h-4 text-[#D4F63D]" />}
                </div>
                <p className={`text-[11px] leading-relaxed m-0 ${simulationMode ? 'text-slate-300' : 'text-slate-500'}`}>
                  Chạy Modbus Server ảo cục bộ (Port 503). Thích hợp test phần mềm khi không cắm dây mạng PLC.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimulationMode(false);
                  if (port === 503) setPort(502);
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  !simulationMode
                    ? 'border-[#141718] bg-slate-900 text-white shadow-sm ring-2 ring-[#D4F63D]'
                    : 'border-[#E8EAEF] bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs uppercase flex items-center gap-1.5">
                    <span>🏭 PLC Vật Lý Thật</span>
                  </span>
                  {!simulationMode && <CheckCircle2 className="w-4 h-4 text-[#D4F63D]" />}
                </div>
                <p className={`text-[11px] leading-relaxed m-0 ${!simulationMode ? 'text-slate-300' : 'text-slate-500'}`}>
                  Kết nối trực tiếp qua dây mạng LAN tới PLC (Siemens S7, Delta, Mitsubishi, FX5U) tại xưởng.
                </p>
              </button>
            </div>
          </div>

          {/* Form Parameters */}
          <div className="p-4 rounded-2xl bg-white border border-[#E8EAEF] space-y-4">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <span>Thông Số Mạng Modbus TCP</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Địa Chỉ IP PLC
                </label>
                <input
                  type="text"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder="192.168.0.1"
                  className="w-full bg-[#F8F9FC] border border-[#E8EAEF] rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D4F63D]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {simulationMode ? 'Mặc định simulator: 127.0.0.1' : 'Địa chỉ IP tĩnh của card mạng PLC'}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Cổng TCP Port
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  placeholder="502"
                  className="w-full bg-[#F8F9FC] border border-[#E8EAEF] rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D4F63D]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Chuẩn Modbus: 502 (Hoặc 503 cho simulator ảo)
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Slave ID / Unit ID
                </label>
                <input
                  type="number"
                  value={slaveId}
                  onChange={(e) => setSlaveId(Number(e.target.value))}
                  placeholder="1"
                  className="w-full bg-[#F8F9FC] border border-[#E8EAEF] rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D4F63D]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Định danh thiết bị trong mạng Modbus (thường là 1)
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Địa Chỉ Thanh Ghi (Holding Register)
                </label>
                <input
                  type="number"
                  value={registerAddress}
                  onChange={(e) => setRegisterAddress(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-[#F8F9FC] border border-[#E8EAEF] rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D4F63D]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Offset 0 tương ứng thanh ghi 40001 của PLC
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleConnect}
                disabled={loading}
                className="px-5 py-2.5 rounded-full bg-[#141718] hover:bg-black text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin text-[#D4F63D]" /> : <CheckCircle2 className="w-4 h-4 text-[#D4F63D]" />}
                <span>Lưu & Kết Nối Lại PLC</span>
              </button>
            </div>
          </div>

          {/* Test Pulses */}
          <div className="p-4 rounded-2xl bg-[#F8F9FC] border border-[#E8EAEF] space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Bắn Xung Tín Hiệu Kiểm Thử (Manual Pulse Test)</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Ghi trực tiếp vào Register {registerAddress}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTestWrite(1)}
                disabled={testingGate === 1}
                className="p-2.5 rounded-xl bg-white border border-[#E8EAEF] hover:border-slate-400 text-left transition-colors cursor-pointer shadow-2xs"
              >
                <div className="text-[11px] font-bold text-slate-900 flex items-center justify-between">
                  <span>Cửa 1 (Hải Châu)</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] font-mono">Sig 1</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Xung kích hoạt xi lanh 1</div>
              </button>

              <button
                type="button"
                onClick={() => handleTestWrite(2)}
                disabled={testingGate === 2}
                className="p-2.5 rounded-xl bg-white border border-[#E8EAEF] hover:border-slate-400 text-left transition-colors cursor-pointer shadow-2xs"
              >
                <div className="text-[11px] font-bold text-slate-900 flex items-center justify-between">
                  <span>Cửa 2 (Thanh Khê)</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] font-mono">Sig 2</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Xung kích hoạt xi lanh 2</div>
              </button>

              <button
                type="button"
                onClick={() => handleTestWrite(3)}
                disabled={testingGate === 3}
                className="p-2.5 rounded-xl bg-white border border-[#E8EAEF] hover:border-slate-400 text-left transition-colors cursor-pointer shadow-2xs"
              >
                <div className="text-[11px] font-bold text-slate-900 flex items-center justify-between">
                  <span>Cửa 3 (Liên Chiểu)</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] font-mono">Sig 3</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Xung kích hoạt xi lanh 3</div>
              </button>

              <button
                type="button"
                onClick={() => handleTestWrite(4)}
                disabled={testingGate === 4}
                className="p-2.5 rounded-xl bg-white border border-[#E8EAEF] hover:border-slate-400 text-left transition-colors cursor-pointer shadow-2xs"
              >
                <div className="text-[11px] font-bold text-slate-900 flex items-center justify-between">
                  <span>Cửa 4 (Ngũ Hành Sơn)</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] font-mono">Sig 4</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Xung kích hoạt xi lanh 4</div>
              </button>

              <button
                type="button"
                onClick={() => handleTestWrite(5)}
                disabled={testingGate === 5}
                className="p-2.5 rounded-xl bg-white border border-[#E8EAEF] hover:border-slate-400 text-left transition-colors cursor-pointer shadow-2xs"
              >
                <div className="text-[11px] font-bold text-slate-900 flex items-center justify-between">
                  <span>Cửa 5 (Cẩm Lệ)</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] font-mono">Sig 5</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Xung kích hoạt xi lanh 5</div>
              </button>

              <button
                type="button"
                onClick={() => handleTestWrite(99)}
                disabled={testingGate === 99}
                className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 hover:border-rose-300 text-left transition-colors cursor-pointer shadow-2xs"
              >
                <div className="text-[11px] font-bold text-rose-900 flex items-center justify-between">
                  <span>Cửa Loại (Reject)</span>
                  <span className="px-1.5 py-0.2 rounded bg-rose-200 text-rose-800 text-[10px] font-mono font-bold">Sig 99</span>
                </div>
                <div className="text-[10px] text-rose-600 mt-0.5">Gạt sản phẩm lỗi / không QR</div>
              </button>
            </div>

            {/* Custom Register Write */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-600">Ghi tùy chọn:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Reg:</span>
                <input
                  type="number"
                  value={customRegister}
                  onChange={(e) => setCustomRegister(Number(e.target.value))}
                  className="w-16 bg-white border border-[#E8EAEF] rounded-lg px-2 py-1 text-xs font-mono font-bold"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Val:</span>
                <input
                  type="number"
                  value={customValue}
                  onChange={(e) => setCustomValue(Number(e.target.value))}
                  className="w-16 bg-white border border-[#E8EAEF] rounded-lg px-2 py-1 text-xs font-mono font-bold"
                />
              </div>
              <button
                type="button"
                onClick={() => handleTestWrite(customValue, customRegister)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                <span>Ghi Test</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-[#E8EAEF] flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            * Lưu ý: Khi cắm PLC thật, máy tính cần đặt cùng dải IP mạng (vd: 192.168.0.x / 24).
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-white hover:bg-slate-100 border border-slate-300 font-bold text-slate-700 cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
