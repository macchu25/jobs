import React, { useState } from 'react';
import { LiveVideoPanel } from '../components/classifier/LiveVideoPanel';
import { TabColorCalibration } from '../components/classifier/TabColorCalibration';
import { TabRulesConfig } from '../components/classifier/TabRulesConfig';
import { TabCountersHistory } from '../components/classifier/TabCountersHistory';
import { ConsoleLogPanel } from '../components/classifier/ConsoleLogPanel';
import { DistrictQrModal } from '../components/classifier/DistrictQrModal';
import { Sliders, ListFilter, BarChart3, Camera, Sparkles, Terminal } from 'lucide-react';

export const VisionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'color' | 'rules' | 'history'>('color');

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight flex items-center gap-2">
            <Camera className="w-6 h-6 text-[#141718]" />
            <span>Vision AI & Băng Chuyền Phân Loại Song Song</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Hệ thống nhận diện mã QR & màu sắc thời gian thực kết nối Digital Twin Băng Tải 5 Cửa PLC và Cửa Loại Reject.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#D4F63D]/25 text-[#111827] border border-[#D4F63D]">
            <Sparkles className="w-3.5 h-3.5 text-[#111827]" />
            <span>OpenCV 30 FPS • Digital Twin 60 FPS</span>
          </span>
        </div>
      </div>

      {/* 2. DUAL-VIEW WORKSPACE (Full Width for maximum space & responsiveness) */}
      <section className="w-full">
        <LiveVideoPanel />
      </section>

      {/* 3. LOWER SECTION (Vision Calibration Tabs + Console Log) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Vision Calibration Tabs */}
        <div className="lg:col-span-7 flex flex-col bg-white border border-[#E8EAEF] rounded-3xl overflow-hidden shadow-xs">
          {/* Tab Header matching Vault Pill Style */}
          <div className="flex items-center overflow-x-auto bg-[#F9FAFB] p-2.5 border-b border-[#E8EAEF] gap-1.5 no-scrollbar">
            <button
              onClick={() => setActiveTab('color')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-2xl whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'color'
                  ? 'bg-[#141718] text-white shadow-xs font-black'
                  : 'text-slate-500 hover:text-[#111827] hover:bg-slate-200/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Tinh Chỉnh Ngưỡng HSV</span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-2xl whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-[#141718] text-white shadow-xs font-black'
                  : 'text-slate-500 hover:text-[#111827] hover:bg-slate-200/60'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Quy Tắc Điều Hướng Cửa</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-2xl whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#141718] text-white shadow-xs font-black'
                  : 'text-slate-500 hover:text-[#111827] hover:bg-slate-200/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Bộ Đếm & Lịch Sử Quét</span>
            </button>
          </div>

          {/* Tab Body */}
          <div className="p-4 sm:p-5 bg-white">
            {activeTab === 'color' && <TabColorCalibration />}
            {activeTab === 'rules' && <TabRulesConfig />}
            {activeTab === 'history' && <TabCountersHistory />}
          </div>
        </div>

        {/* Right 5 Columns: System Console Log */}
        <div className="lg:col-span-5 flex flex-col bg-white rounded-3xl p-5 border border-[#E8EAEF] shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-800">Nhật Ký Sự Kiện Camera & PLC</h3>
          </div>
          <ConsoleLogPanel />
        </div>
      </section>

      {/* District QR Modal */}
      <DistrictQrModal />
    </div>
  );
};

export default VisionPage;
