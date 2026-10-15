import React from 'react';
import { useClassifierStore } from '../../stores/classifierStore';
import { Video, Camera, Cpu, Zap, Radio } from 'lucide-react';

export const HeaderBar: React.FC = () => {
  const {
    cameraActive,
    setCameraActive,
    plcStatus,
    setPlcStatus,
    fastMode,
    setFastMode,
    simMode,
    setSimMode,
    feedMode,
    setFeedMode,
    addLog,
  } = useClassifierStore();

  const handleToggleCamera = () => {
    setCameraActive(!cameraActive);
  };

  const handleTogglePlc = () => {
    if (plcStatus === 'OFFLINE' || plcStatus === 'ERROR') {
      const nextStatus = simMode ? 'SIMULATOR' : 'ONLINE';
      setPlcStatus(nextStatus);
      addLog(
        'INFO',
        `Kết nối PLC thành công! ${simMode ? '(SIMULATOR GIẢ LẬP)' : '(MODBUS TCP THẬT)'}`
      );
    } else {
      setPlcStatus('OFFLINE');
      addLog('WARN', 'Đã ngắt kết nối PLC.');
    }
  };

  return (
    <div className="bg-[#1A1A1E] border border-[#2D2D35] rounded-lg px-4 py-3 shadow-md flex flex-wrap items-center justify-between gap-3">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-[#00E5FF] animate-pulse" />
        <h1 className="text-[#00E5FF] font-bold text-base sm:text-lg tracking-wide uppercase font-sans m-0">
          HỆ THỐNG PHÂN LOẠI SẢN PHẨM QR & MÀU SẮC
        </h1>
      </div>

      {/* Right Controls & Indicators */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
        {/* Source selector */}
        <div className="flex items-center gap-1.5 bg-[#25252B] border border-[#3D3D48] rounded px-2 py-1">
          <Radio className="w-3.5 h-3.5 text-[#00E5FF]" />
          <span className="text-[#AAAAAA] text-xs font-semibold">Nguồn:</span>
          <select
            value={feedMode}
            onChange={(e) => setFeedMode(e.target.value as any)}
            className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
          >
            <option value="python" className="bg-[#25252B]">
              Luồng Python OpenCV (Live 30 FPS)
            </option>
            <option value="simulation" className="bg-[#25252B]">
              Băng chuyền Mô phỏng (Demo 24/7)
            </option>
            <option value="webcam" className="bg-[#25252B]">
              Webcam Trình Duyệt Web (Browser)
            </option>
            <option value="upload" className="bg-[#25252B]">
              Tải Ảnh / Video Test
            </option>
          </select>
        </div>

        {/* Camera Indicator */}
        <div
          className={`font-bold flex items-center gap-1.5 transition-colors ${
            cameraActive ? 'text-[#34C759]' : 'text-[#FF5252]'
          }`}
        >
          <span className="text-base leading-none">●</span>
          <span>Camera: {cameraActive ? 'ON' : 'OFF'}</span>
        </div>

        {/* PLC Indicator */}
        <div
          className={`font-bold flex items-center gap-1.5 transition-colors ${
            plcStatus === 'SIMULATOR'
              ? 'text-[#34C759]'
              : plcStatus === 'ONLINE'
              ? 'text-[#00E5FF]'
              : 'text-[#FF5252]'
          }`}
        >
          <span className="text-base leading-none">●</span>
          <span>
            PLC:{' '}
            {plcStatus === 'SIMULATOR'
              ? 'Online (SIMULATOR)'
              : plcStatus === 'ONLINE'
              ? 'Online (REAL)'
              : 'Offline'}
          </span>
        </div>

        {/* Fast Mode Checkbox */}
        <label className="flex items-center gap-1.5 cursor-pointer text-[#FFCC00] font-bold select-none hover:opacity-90">
          <input
            type="checkbox"
            checked={fastMode}
            onChange={(e) => setFastMode(e.target.checked)}
            className="rounded accent-[#FFCC00] cursor-pointer w-4 h-4"
          />
          <Zap className="w-3.5 h-3.5 inline text-[#FFCC00]" />
          <span>Băng Chuyền Siêu Tốc (1-Frame)</span>
        </label>

        {/* Sim Mode Checkbox */}
        <label className="flex items-center gap-1.5 cursor-pointer text-[#E0E0E0] select-none hover:opacity-90">
          <input
            type="checkbox"
            checked={simMode}
            onChange={(e) => setSimMode(e.target.checked)}
            className="rounded accent-[#2196F3] cursor-pointer w-4 h-4"
          />
          <Cpu className="w-3.5 h-3.5 inline text-[#2196F3]" />
          <span>PLC Simulator Mode</span>
        </label>

        {/* Toggle Camera Button */}
        <button
          onClick={handleToggleCamera}
          className={`qt-btn ${cameraActive ? 'qt-btn-danger' : 'qt-btn-success'}`}
        >
          {cameraActive ? <Video className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          {cameraActive ? 'Dừng Camera' : 'Bật Camera'}
        </button>

        {/* Toggle PLC Button */}
        <button
          onClick={handleTogglePlc}
          className={`qt-btn ${
            plcStatus === 'OFFLINE' || plcStatus === 'ERROR'
              ? 'bg-[#2196F3] hover:bg-[#1976D2]'
              : 'qt-btn-danger'
          }`}
        >
          {plcStatus === 'OFFLINE' || plcStatus === 'ERROR'
            ? 'Kết nối PLC'
            : 'Ngắt kết nối PLC'}
        </button>
      </div>
    </div>
  );
};
