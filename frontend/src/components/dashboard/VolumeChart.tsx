import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useClassifierStore } from '../../stores/classifierStore';
import { useLanguageStore } from '../../stores/languageStore';

interface VolumeChartProps {
  onSelectDistrict?: (districtKey: string) => void;
}

export const VolumeChart: React.FC<VolumeChartProps> = ({ onSelectDistrict }) => {
  const { counters } = useClassifierStore();
  const { t } = useLanguageStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'monthly' | 'daily' | 'hourly'>('monthly');

  const categories = [
    { id: 'all', label: t.volumeChart.all },
    { id: 'g1', label: 'Hải Châu' },
    { id: 'g2', label: 'Thanh Khê' },
    { id: 'g3', label: 'Liên Chiểu' },
    { id: 'g4', label: 'Ngũ Hành Sơn' },
    { id: 'g5', label: 'Cẩm Lệ' },
    { id: 'reject', label: t.volumeChart.reject },
  ];

  // Dynamic point heights based on current live counters
  const g1 = Math.min(80, counters.GATE_1 * 4 + 20);
  const g2 = Math.min(80, counters.GATE_2 * 4 + 30);
  const g3 = Math.min(80, counters.GATE_3 * 4 + 45);
  const g4 = Math.min(80, counters.GATE_4 * 4 + 25);
  const g5 = Math.min(80, counters.GATE_5 * 4 + 35);
  const rej = Math.min(80, counters.REJECT * 4 + 15);

  return (
    <div className="bg-white rounded-3xl p-5 border border-[#E8EAEF] shadow-xs flex flex-col justify-between">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-[#111827] tracking-tight">
            {t.volumeChart.title}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.volumeChart.subtitle}
          </p>
        </div>

        {/* Legend & Dropdown */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4F63D] ring-2 ring-[#D4F63D]/30" />
            <span>{t.volumeChart.stockVolume}</span>
          </div>

          <div className="flex items-center gap-1.5 font-semibold text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span>{t.volumeChart.consume}</span>
          </div>

          <button
            onClick={() => setTimeFilter(prev => prev === 'monthly' ? 'daily' : 'monthly')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            <span>{timeFilter === 'monthly' ? t.volumeChart.monthly : t.volumeChart.daily}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* SVG Curved Spline Chart Area with Floating Tooltip Pill */}
      <div className="relative w-full h-56 my-2 select-none">
        {/* Y-Axis scale labels */}
        <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[11px] font-mono text-slate-400 pr-2 pointer-events-none">
          <span>$50K</span>
          <span>$40K</span>
          <span>$30K</span>
          <span>$20K</span>
          <span>$10K</span>
        </div>

        {/* SVG Curve */}
        <div className="ml-10 h-full relative">
          <svg
            className="w-full h-full overflow-visible"
            viewBox="0 0 500 160"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Lime Gradient Area */}
              <linearGradient id="limeVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4F63D" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#D4F63D" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Background Grid Lines */}
            <line x1="0" y1="10" x2="500" y2="10" stroke="#F1F3F6" strokeDasharray="3 3" />
            <line x1="0" y1="45" x2="500" y2="45" stroke="#F1F3F6" strokeDasharray="3 3" />
            <line x1="0" y1="80" x2="500" y2="80" stroke="#F1F3F6" strokeDasharray="3 3" />
            <line x1="0" y1="115" x2="500" y2="115" stroke="#F1F3F6" strokeDasharray="3 3" />
            <line x1="0" y1="150" x2="500" y2="150" stroke="#E5E7EB" />

            {/* Secondary Gray Line (Consume) */}
            <path
              d="M0,130 C70,120 120,105 180,110 C240,115 310,95 380,100 C430,105 470,85 500,90"
              fill="none"
              stroke="#D1D5DB"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Primary Lime Curve with Gradient Area (Stock Volume) */}
            <path
              d={`M0,110 C60,${130 - g1} 130,${110 - g2} 200,${90 - g3} C280,${120 - g4} 360,${80 - g5} 430,${95 - rej} 500,${80 - g1}`}
              fill="none"
              stroke="#A3E635"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d={`M0,110 C60,${130 - g1} 130,${110 - g2} 200,${90 - g3} C280,${120 - g4} 360,${80 - g5} 430,${95 - rej} 500,${80 - g1} L500,150 L0,150 Z`}
              fill="url(#limeVolumeGradient)"
            />

            {/* Pulsing Highlight Dot on Peak */}
            <circle cx="280" cy="55" r="5" fill="#141718" stroke="#D4F63D" strokeWidth="3" />
            <line x1="280" y1="58" x2="280" y2="150" stroke="#141718" strokeDasharray="2 2" strokeWidth="1.5" />
          </svg>

          {/* Floating Tooltip Pill (matching Image: Stock In $31,000) */}
          <div className="absolute left-[54%] top-[14%] -translate-x-1/2 bg-[#141718] text-white px-3.5 py-1.5 rounded-xl shadow-xl flex flex-col items-center pointer-events-none z-10 border border-slate-800">
            <div className="text-[10px] font-medium text-slate-400">Stock in</div>
            <div className="text-xs font-bold text-[#D4F63D] font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4F63D] animate-ping" />
              <span>$31,000 / {counters.TOTAL} SP</span>
            </div>
            {/* Small arrow down */}
            <div className="w-2 h-2 bg-[#141718] rotate-45 absolute -bottom-1 border-r border-b border-slate-800" />
          </div>
        </div>
      </div>

      {/* Category Filter Pills on Bottom (matching Image) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-4 border-t border-slate-100 no-scrollbar">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                if (onSelectDistrict) onSelectDistrict(cat.id);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#141718] text-white shadow-sm'
                  : 'text-slate-500 hover:text-[#111827] hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
