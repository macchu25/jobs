import React, { useState } from 'react';
import { HeaderBar } from './HeaderBar';
import { LiveVideoPanel } from './LiveVideoPanel';
import { TabCountersHistory } from './TabCountersHistory';
import { TabColorCalibration } from './TabColorCalibration';
import { TabPlcSettings } from './TabPlcSettings';
import { TabRulesConfig } from './TabRulesConfig';
import { TabQrGenerator } from './TabQrGenerator';
import { ConsoleLogPanel } from './ConsoleLogPanel';
import { DistrictQrModal } from './DistrictQrModal';
import { BarChart3, Sliders, Cpu, ListFilter, QrCode } from 'lucide-react';

export const MainClassifierWindow: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'counter' | 'color' | 'plc' | 'rules' | 'qr'
  >('counter');

  return (
    <div className="min-h-screen bg-[#121214] text-[#E0E0E0] p-3 sm:p-4 font-sans flex flex-col gap-3 selection:bg-[#2196F3] selection:text-white">
      {/* 1. Header Bar */}
      <HeaderBar />

      {/* 2. Main Splitter Area (Left: Video & Detection | Right: Tabs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 items-start">
        {/* Left Panel (~60% / 7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <LiveVideoPanel />
        </div>

        {/* Right Panel (~40% / 5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col gap-0 bg-[#1A1A1E] border border-[#2D2D35] rounded-lg overflow-hidden shadow-lg">
          {/* Tab Bar matching QTabBar style */}
          <div className="flex items-center overflow-x-auto bg-[#25252B] border-b border-[#2D2D35] scrollbar-none">
            {/* Tab 1 */}
            <button
              onClick={() => setActiveTab('counter')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'counter'
                  ? 'bg-[#1A1A1E] text-[#00E5FF] border-[#00E5FF]'
                  : 'bg-[#25252B] text-[#AAAAAA] border-transparent hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Thống kê & Lịch sử</span>
            </button>

            {/* Tab 2 */}
            <button
              onClick={() => setActiveTab('color')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'color'
                  ? 'bg-[#1A1A1E] text-[#00E5FF] border-[#00E5FF]'
                  : 'bg-[#25252B] text-[#AAAAAA] border-transparent hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Tinh chỉnh Màu HSV</span>
            </button>

            {/* Tab 3 */}
            <button
              onClick={() => setActiveTab('plc')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'plc'
                  ? 'bg-[#1A1A1E] text-[#00E5FF] border-[#00E5FF]'
                  : 'bg-[#25252B] text-[#AAAAAA] border-transparent hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Cấu hình PLC</span>
            </button>

            {/* Tab 4 */}
            <button
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'rules'
                  ? 'bg-[#1A1A1E] text-[#00E5FF] border-[#00E5FF]'
                  : 'bg-[#25252B] text-[#AAAAAA] border-transparent hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Quy tắc Phân loại</span>
            </button>

            {/* Tab 5 (Web & Label Generator) */}
            <button
              onClick={() => setActiveTab('qr')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'qr'
                  ? 'bg-[#1A1A1E] text-[#00E5FF] border-[#00E5FF]'
                  : 'bg-[#25252B] text-[#AAAAAA] border-transparent hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Tạo Tem QR Đa Năng</span>
            </button>
          </div>

          {/* Tab Pane matching QTabWidget::pane */}
          <div className="p-3 sm:p-4 bg-[#1A1A1E]">
            {activeTab === 'counter' && <TabCountersHistory />}
            {activeTab === 'color' && <TabColorCalibration />}
            {activeTab === 'plc' && <TabPlcSettings />}
            {activeTab === 'rules' && <TabRulesConfig />}
            {activeTab === 'qr' && <TabQrGenerator />}
          </div>
        </div>
      </div>

      {/* 3. Bottom Console Log */}
      <ConsoleLogPanel />

      {/* 4. District Stamps Modal */}
      <DistrictQrModal />
    </div>
  );
};
